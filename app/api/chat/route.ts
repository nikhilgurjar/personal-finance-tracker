// app/api/chat/route.ts
// Next.js API route — orchestrates: contextRouter → firestoreSlice → promptBuilder → AI model
// v2: per-user rate limiting, response caching, conversation history, better error messages.
//
// Primary:  Google Gemini (gemini-2.0-flash-lite)
// Fallback: Groq (llama-3.1-8b-instant) — triggered automatically on Gemini 429 rate-limit

import { NextRequest, NextResponse } from "next/server"
import { classifyIntent } from "@/lib/ai/contextRouter"
import { fetchDataSlice } from "@/lib/ai/firestoreSlice"
import { buildPrompt, type HistoryMessage } from "@/lib/ai/promptBuilder"

// ─── In-memory cache ──────────────────────────────────────────────────────────
// For production, swap this Map for Redis / Upstash.

const responseCache = new Map<string, { answer: string; provider: string; ts: number }>()
const CACHE_TTL_MS = 60_000 // 1 minute

function getCacheKey(uid: string, question: string): string {
  return `${uid}::${question.toLowerCase().trim()}`
}

function getCached(key: string) {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key)
    return null
  }
  return entry
}

function setCache(key: string, answer: string, provider: string) {
  responseCache.set(key, { answer, provider, ts: Date.now() })
  // Prevent unbounded growth — evict if cache exceeds 500 entries
  if (responseCache.size > 500) {
    const oldest = Array.from(responseCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0]
    if (oldest) responseCache.delete(oldest[0])
  }
}

// ─── Per-user rate limiter ────────────────────────────────────────────────────

const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_REQUESTS = 20 // per window
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

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

// ─── Provider call helpers ────────────────────────────────────────────────────

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
      temperature: 0.4,
      maxOutputTokens: 512,
      topP: 0.9,
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
    // Signal rate-limit so the caller can fall back to Groq
    throw Object.assign(new Error("GEMINI_RATE_LIMITED"), { code: 429 })
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Sorry, I couldn't generate a response."

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
      { role: "user",   content: user },
    ],
    temperature: 0.4,
    max_tokens: 512,
    top_p: 0.9,
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
    "Sorry, I couldn't generate a response."

  return { text, provider: "groq" }
}

// ─── Request body type ────────────────────────────────────────────────────────

interface ChatRequestBody {
  question: string
  uid?: string | null
  isDemo?: boolean
  localData?: Record<string, any[]>
  history?: HistoryMessage[]  // last N turns for follow-up support
}

// ─── Main route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody
    const {
      question,
      uid,
      isDemo,
      localData,
      history = [],
    } = body

    // ── Input validation ──────────────────────────────────────────────────────
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 })
    }
    if (question.trim().length > 500) {
      return NextResponse.json({ error: "Question is too long (max 500 characters)." }, { status: 400 })
    }

    const rateLimitKey = uid ?? req.headers.get("x-forwarded-for") ?? "anonymous"

    // ── Rate limit check ──────────────────────────────────────────────────────
    const rateCheck = checkRateLimit(rateLimitKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateCheck.retryAfterSec}s before asking again.` },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSec) },
        }
      )
    }

    // ── Cache lookup (skip for demo users to always show fresh data) ──────────
    const cacheKey = getCacheKey(rateLimitKey, question)
    if (!isDemo) {
      const cached = getCached(cacheKey)
      if (cached) {
        return NextResponse.json({
          answer: cached.answer,
          provider: cached.provider,
          intent: "CACHED",
          estimatedTokens: 0,
          cached: true,
        })
      }
    }

    // 1. Classify intent — zero cost
    const routerResult = classifyIntent(question)

    // 2. Fetch only the relevant data slice (collections run concurrently in v2)
    const dataSlice = await fetchDataSlice(routerResult, {
      uid,
      isDemo: isDemo ?? true,
      localData: localData ?? {},
    })

    // 3. Build the tight prompt (includes today's date + history + time filter)
    const { system, user, estimatedTokens } = buildPrompt({
      intent: routerResult.intent,
      dataSlice,
      question,
      timeFilterLabel: routerResult.timeFilter?.label,
      history: history.slice(-6), // cap at last 3 turns
    })

    // 4. Call Gemini, fall back to Groq on rate-limit
    let result: { text: string; provider: "gemini" | "groq" }

    try {
      result = await callGemini(system, user)
    } catch (err: any) {
      if (err?.code === 429 || err?.message === "GEMINI_RATE_LIMITED") {
        console.warn("[chat/route] Gemini rate-limited — falling back to Groq")
        result = await callGroq(system, user)
      } else {
        throw err
      }
    }

    // 5. Cache successful response
    if (!isDemo) {
      setCache(cacheKey, result.text, result.provider)
    }

    return NextResponse.json({
      answer: result.text,
      provider: result.provider,
      intent: routerResult.intent,
      estimatedTokens,
      cached: false,
    })
  } catch (err: any) {
    console.error("[chat/route] Unhandled error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}