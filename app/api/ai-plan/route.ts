// app/api/ai-plan/route.ts  (v4 — free-only OpenRouter)
// Dedicated API for the AI savings & wealth plan page.
// Primary: OpenRouter free models (ranked fallback chain)
// Fallback: Gemini gemini-2.0-flash-lite (Google free tier)

import { NextRequest, NextResponse } from "next/server"
import { fetchDataSlice } from "@/lib/ai/firestoreSlice"
import {
  callOpenRouterWithFallback,
  OpenRouterExhaustedError,
  stripThinkTags,
} from "@/lib/ai/openRouterClient"
import { buildPlanPrompt } from "@/lib/ai/planPromptBuilder"
import type { HistoryMessage } from "@/lib/ai/promptBuilder"
import {
  canUseProvider,
  getProviderCooldown,
  getProviderRetryMessage,
  markProviderFailure,
  markProviderSuccess,
} from "@/lib/ai/providerPolicy"
import { logger } from "@/lib/logger"

const PLAN_COLLECTIONS = ["goals", "savings", "income", "expenses", "sips", "accounts", "debts"]
const PLAN_LIMIT = 200

const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_REQUESTS = 15
const RATE_LIMIT_WINDOW_MS = 60_000
const OPENROUTER_RETRY_MS = 30_000
const GEMINI_RETRY_MS = 60_000

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
  user: string,
  isPlanMode: boolean
): Promise<{ text: string; provider: "gemini"; model?: undefined }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.")

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: isPlanMode ? 2048 : 512,
      topP: 0.8,
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

  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason === "MAX_TOKENS") {
    console.warn("[ai-plan/route] Gemini hit MAX_TOKENS — consider raising maxOutputTokens")
  }

  return { text: stripThinkTags(text), provider: "gemini" }
}

interface PlanRequestBody {
  question: string
  uid?: string | null
  isDemo?: boolean
  localData?: Record<string, any[]>
  history?: HistoryMessage[]
  savedPlan?: string
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

    if (!canUseProvider("openrouter")) {
      const retryAfterSec = Math.max(1, Math.ceil(getProviderCooldown("openrouter") / 1000))
      return NextResponse.json(
        { error: getProviderRetryMessage("openrouter", retryAfterSec) },
        { status: 503, headers: { "Retry-After": String(retryAfterSec) } }
      )
    }

    const dataSlice = await fetchDataSlice(
      { intent: "GENERAL", collections: PLAN_COLLECTIONS, limit: PLAN_LIMIT },
      { uid, isDemo: isDemo ?? true, localData: localData ?? {} }
    )

    logger.slice("ai-plan/route", dataSlice, {
      uid: uid ?? "demo",
      isDemo: isDemo ?? true,
    })

    const { system, user, estimatedTokens, mode } = buildPlanPrompt({
      dataSlice,
      question,
      history: history.slice(-10),
      savedPlan,
    })

    const isPlanMode = mode === "PLAN"
    const task = isPlanMode ? "PLAN" : "CONVERSATIONAL"
    const maxTokens = isPlanMode ? 3072 : 800

    let result: { text: string; provider: "openrouter" | "gemini"; model?: string }

    try {
      result = await callOpenRouterWithFallback({
        system,
        user,
        task,
        maxTokens,
        temperature: 0.2,
      })
      markProviderSuccess("openrouter")
    } catch (err: unknown) {
      const isExhausted = err instanceof OpenRouterExhaustedError
      const code = (err as { code?: number })?.code
      if (isExhausted || code === 429) {
        markProviderFailure("openrouter", OPENROUTER_RETRY_MS)
        logger.warn("ai-plan/route", "OpenRouter free chain exhausted — falling back to Gemini")

        if (!canUseProvider("gemini")) {
          const retryAfterSec = Math.max(1, Math.ceil(getProviderCooldown("gemini") / 1000))
          return NextResponse.json(
            { error: getProviderRetryMessage("gemini", retryAfterSec) },
            { status: 503, headers: { "Retry-After": String(retryAfterSec) } }
          )
        }

        try {
          result = await callGemini(system, user, isPlanMode)
          markProviderSuccess("gemini")
        } catch (geminiErr: unknown) {
          const geminiCode = (geminiErr as { code?: number })?.code
          if (geminiCode === 429 || /GEMINI_RATE_LIMITED|429/.test(String(geminiErr))) {
            markProviderFailure("gemini", GEMINI_RETRY_MS)
            const retryAfterSec = Math.max(1, Math.ceil(getProviderCooldown("gemini") / 1000))
            return NextResponse.json(
              { error: getProviderRetryMessage("gemini", retryAfterSec) },
              { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
            )
          }
          throw geminiErr
        }
      } else {
        throw err
      }
    }

    return NextResponse.json({
      answer: result.text,
      provider: result.provider,
      model: result.model,
      estimatedTokens,
      isPlan: isPlanMode,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error"
    logger.error("ai-plan/route", message, { err: String(err) })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
