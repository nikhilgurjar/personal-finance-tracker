// app/api/ai-plan/route.ts
// Dedicated API for the AI savings & wealth plan page.
// Fetches full financial context and supports multi-turn clarifying conversations.

import { NextRequest, NextResponse } from "next/server"
import { fetchDataSlice } from "@/lib/ai/firestoreSlice"
import { buildPlanPrompt } from "@/lib/ai/planPromptBuilder"
import type { HistoryMessage } from "@/lib/ai/promptBuilder"

const PLAN_COLLECTIONS = ["goals", "savings", "income", "expenses", "sips", "accounts", "debts"]
const PLAN_LIMIT = 200

const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_REQUESTS = 15
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(uid: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  let entry = rateLimiter.get(uid)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
  }

  entry.count++
  rateLimiter.set(uid, entry)

  if (entry.count > RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  return { allowed: true }
}

async function callGemini(
  system: string,
  user: string
): Promise<{ text: string; provider: "gemini" }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.")

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      // Lower temperature = more deterministic, fewer hallucinated numbers
      temperature: 0.2,
      // Increased from 2048 — detailed plans need ~2500–3000 tokens
      maxOutputTokens: 3072,
      topP: 0.85,
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )

  if (res.status === 429) {
    throw Object.assign(new Error("GEMINI_RATE_LIMITED"), { code: 429 })
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Sorry, I couldn't generate a plan right now."

  // Detect if Gemini stopped early due to token limits
  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason === "MAX_TOKENS") {
    console.warn("[ai-plan/route] Gemini hit MAX_TOKENS — consider raising maxOutputTokens")
  }

  return { text, provider: "gemini" }
}

async function callGroq(
  system: string,
  user: string
): Promise<{ text: string; provider: "groq" }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.")

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    // Lower temperature for structured, data-faithful output
    temperature: 0.2,
    max_tokens: 3072,
    top_p: 0.85,
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Groq error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "Sorry, I couldn't generate a plan right now."

  return { text, provider: "groq" }
}

interface PlanRequestBody {
  question: string
  uid?: string | null
  isDemo?: boolean
  localData?: Record<string, any[]>
  history?: HistoryMessage[]
  savedPlan?: string
}

/** Detect whether the response looks like a structured plan vs a short answer/clarification */
function detectIsPlan(text: string): boolean {
  const planSignals = [
    "## ",                     // markdown headers
    "Monthly Budget Blueprint",
    "Goal-by-Goal Roadmap",
    "Monthly Checklist",
    "Wealth Building Steps",
    "Financial Snapshot",
    "Key Analytics",
    "This Week",
    "Fast-Track",
    "Data Completeness",
    "12-Month",
  ]
  const matchCount = planSignals.filter((s) => text.includes(s)).length
  // Require at least 3 plan signals to be confident it's a full plan
  return matchCount >= 3
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanRequestBody
    const { question, uid, isDemo, localData, history = [], savedPlan } = body

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }
    if (question.trim().length > 2000) {
      return NextResponse.json(
        { error: "Message is too long (max 2000 characters)." },
        { status: 400 }
      )
    }

    const rateLimitKey = uid ?? req.headers.get("x-forwarded-for") ?? "anonymous"
    const rateCheck = checkRateLimit(rateLimitKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateCheck.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
      )
    }

    const dataSlice = await fetchDataSlice(
      { intent: "GENERAL", collections: PLAN_COLLECTIONS, limit: PLAN_LIMIT },
      { uid, isDemo: isDemo ?? true, localData: localData ?? {} }
    )

    const { system, user, estimatedTokens } = buildPlanPrompt({
      dataSlice,
      question,
      history: history.slice(-10),
      savedPlan,
    })

    let result: { text: string; provider: "gemini" | "groq" }

    try {
      result = await callGemini(system, user)
    } catch (err: any) {
      if (err?.code === 429 || err?.message === "GEMINI_RATE_LIMITED") {
        console.warn("[ai-plan/route] Gemini rate-limited — falling back to Groq")
        result = await callGroq(system, user)
      } else {
        throw err
      }
    }

    return NextResponse.json({
      answer: result.text,
      provider: result.provider,
      estimatedTokens,
      isPlan: detectIsPlan(result.text),
    })
  } catch (err: any) {
    console.error("[ai-plan/route] Unhandled error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}