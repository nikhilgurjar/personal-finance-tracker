// app/api/chat/route.ts
// Next.js API route — orchestrates: contextRouter → firestoreSlice → promptBuilder → AI model
// Primary: Google Gemini (gemini-2.0-flash-lite)
// Fallback: Groq (llama-3.1-8b-instant) — triggered automatically on Gemini 429 rate-limit

import { NextRequest, NextResponse } from "next/server"
import { classifyIntent } from "@/lib/ai/contextRouter"
import { fetchDataSlice } from "@/lib/ai/firestoreSlice"
import { buildPrompt } from "@/lib/ai/promptBuilder"

// ─── Provider call helpers ────────────────────────────────────────────────────

async function callGemini(system: string, user: string): Promise<{ text: string; provider: "gemini" }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

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
    // Signal rate-limit to the caller so it can fall back to Groq
    throw Object.assign(new Error("GEMINI_RATE_LIMITED"), { code: 429 })
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I could not generate a response."

  return { text, provider: "gemini" }
}

async function callGroq(system: string, user: string): Promise<{ text: string; provider: "groq" }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY not set")

  const body = {
    model: "llama-3.1-8b-instant",
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
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string =
    data?.choices?.[0]?.message?.content ?? "Sorry, I could not generate a response."

  return { text, provider: "groq" }
}

// ─── Main route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      question,
      uid,
      isDemo,
      localData,
    }: {
      question: string
      uid?: string | null
      isDemo?: boolean
      localData?: Record<string, any[]>
    } = body

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 })
    }

    // 1. Classify intent — zero cost
    const routerResult = classifyIntent(question)

    // 2. Fetch only the relevant data slice
    const dataSlice = await fetchDataSlice(routerResult, {
      uid,
      isDemo: isDemo ?? true,
      localData: localData ?? {},
    })

    // 3. Build the tight prompt
    const { system, user, estimatedTokens } = buildPrompt({
      intent: routerResult.intent,
      dataSlice,
      question,
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

    return NextResponse.json({
      answer: result.text,
      provider: result.provider,
      intent: routerResult.intent,
      estimatedTokens,
    })
  } catch (err: any) {
    console.error("[chat/route] Error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}
