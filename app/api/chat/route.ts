// app/api/chat/route.ts
// Next.js API route — orchestrates: contextRouter → firestoreSlice → promptBuilder → AI model
// v3: per-user rate limiting, response caching, conversation history.
//
// Primary:  OpenRouter free models (ranked fallback chain)
// Fallback: Gemini gemini-2.0-flash-lite (Google free tier)

import { NextRequest, NextResponse } from "next/server"
import { classifyIntent } from "@/lib/ai/contextRouter"
import { fetchDataSlice } from "@/lib/ai/firestoreSlice"
import {
  callOpenRouterWithFallback,
  OpenRouterExhaustedError,
  stripThinkTags,
} from "@/lib/ai/openRouterClient"
import { buildPrompt, type HistoryMessage } from "@/lib/ai/promptBuilder"
import {
  canUseProvider,
  getProviderCooldown,
  getProviderRetryMessage,
  markProviderFailure,
  markProviderSuccess,
} from "@/lib/ai/providerPolicy"
import { logger } from "@/lib/logger"

// ─── In-memory cache ──────────────────────────────────────────────────────────
// For production, swap this Map for Redis / Upstash.

const responseCache = new Map<
  string,
  { answer: string; provider: string; model?: string; ts: number }
>()
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

function setCache(key: string, answer: string, provider: string, model?: string) {
  responseCache.set(key, { answer, provider, model, ts: Date.now() })
  if (responseCache.size > 500) {
    const oldest = Array.from(responseCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0]
    if (oldest) responseCache.delete(oldest[0])
  }
}

// ─── Per-user rate limiter ────────────────────────────────────────────────────

const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_REQUESTS = 20
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

// ─── Provider call helpers ────────────────────────────────────────────────────

async function callGemini(
  system: string,
  user: string
): Promise<{ text: string; provider: "gemini"; model?: undefined }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.")

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
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
    "Sorry, I couldn't generate a response."
  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason === "MAX_TOKENS") {
    console.warn("[chat/route] Gemini hit MAX_TOKENS — consider raising maxOutputTokens")
  }

  return { text: stripThinkTags(text), provider: "gemini" }
}

// ─── Request body type ────────────────────────────────────────────────────────

interface ChatRequestBody {
  question: string
  uid?: string | null
  isDemo?: boolean
  localData?: Record<string, any[]>
  history?: HistoryMessage[]
}

// ─── Main route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody
    const { question, uid, isDemo, localData, history = [] } = body

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 })
    }
    if (question.trim().length > 500) {
      return NextResponse.json({ error: "Question is too long (max 500 characters)." }, { status: 400 })
    }

    const rateLimitKey = uid ?? req.headers.get("x-forwarded-for") ?? "anonymous"

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

    const cacheKey = getCacheKey(rateLimitKey, question)
    if (!isDemo) {
      const cached = getCached(cacheKey)
      if (cached) {
        return NextResponse.json({
          answer: cached.answer,
          provider: cached.provider,
          model: cached.model,
          intent: "CACHED",
          estimatedTokens: 0,
          cached: true,
        })
      }
    }

    if (!canUseProvider("openrouter")) {
      const retryAfterSec = Math.max(1, Math.ceil(getProviderCooldown("openrouter") / 1000))
      return NextResponse.json(
        { error: getProviderRetryMessage("openrouter", retryAfterSec) },
        { status: 503, headers: { "Retry-After": String(retryAfterSec) } }
      )
    }

    const routerResult = classifyIntent(question)

    const dataSlice = await fetchDataSlice(routerResult, {
      uid,
      isDemo: isDemo ?? true,
      localData: localData ?? {},
    })

    const { system, user, estimatedTokens } = buildPrompt({
      intent: routerResult.intent,
      dataSlice,
      question,
      timeFilterLabel: routerResult.timeFilter?.label,
      history: history.slice(-6),
    })

    let result: { text: string; provider: "openrouter" | "gemini"; model?: string }

    try {
      result = await callOpenRouterWithFallback({
        system,
        user,
        task: "CHAT",
        maxTokens: 4096,
        temperature: 0.2,
      })
      markProviderSuccess("openrouter")
    } catch (err: unknown) {
      const isExhausted = err instanceof OpenRouterExhaustedError
      const code = (err as { code?: number })?.code
      if (isExhausted || code === 429) {
        markProviderFailure("openrouter", OPENROUTER_RETRY_MS)
        logger.warn("chat/route", "OpenRouter free chain exhausted — falling back to Gemini")

        if (!canUseProvider("gemini")) {
          const retryAfterSec = Math.max(1, Math.ceil(getProviderCooldown("gemini") / 1000))
          return NextResponse.json(
            { error: getProviderRetryMessage("gemini", retryAfterSec) },
            { status: 503, headers: { "Retry-After": String(retryAfterSec) } }
          )
        }

        try {
          result = await callGemini(system, user)
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

    if (!isDemo) {
      setCache(cacheKey, result.text, result.provider, result.model)
    }

    return NextResponse.json({
      answer: result.text,
      provider: result.provider,
      model: result.model,
      intent: routerResult.intent,
      estimatedTokens,
      cached: false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error"
    logger.error("chat/route", message, { err: String(err) })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
