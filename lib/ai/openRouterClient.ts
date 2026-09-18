// lib/ai/openRouterClient.ts
// Shared OpenRouter client with free-only model fallback chain.

import {
  assertFreeModel,
  isFreeModel,
  resolveModelChain,
  type AiTask,
} from "./modelConfig"
import { logger } from "@/lib/logger"

/**
 * Strips out <think>...</think> tags and their contents from the AI response.
 * Many models (like Gemini Pro/Flash or DeepSeek R1) output internal reasoning
 * inside these tags, which we don't want to show to the user.
 */
export function stripThinkTags(text: string): string {
  // Regex to match <think>...</think> or <thought>...</thought> blocks including newlines
  return text.replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, "").trim()
}

export class OpenRouterExhaustedError extends Error {
  readonly code = "OPENROUTER_EXHAUSTED"

  constructor(message = "All OpenRouter free models exhausted") {
    super(message)
    this.name = "OpenRouterExhaustedError"
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 429 || status === 502 || status === 503 || status === 504
}

export interface OpenRouterCallOptions {
  system: string
  user: string
  task: AiTask
  maxTokens: number
  temperature: number
}

export interface OpenRouterCallResult {
  text: string
  provider: "openrouter"
  model: string
}

async function callSingleModel(
  apiKey: string,
  modelId: string,
  opts: OpenRouterCallOptions
): Promise<{ text: string; model: string }> {
  assertFreeModel(modelId)

  const body = {
    model: modelId,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    top_p: 0.85,
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (isRetryableStatus(res.status)) {
    const errText = await res.text()
    throw Object.assign(new Error(`OpenRouter ${modelId} rate-limited/unavailable (${res.status})`), {
      code: 429,
      modelId,
      status: res.status,
      detail: errText,
    })
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter error ${res.status} for ${modelId}: ${errText}`)
  }

  const data = await res.json()
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "Sorry, I couldn't generate a response."

  const usedModel: string = data?.model ?? modelId
  if (!isFreeModel(usedModel)) {
    logger.warn("openRouterClient", `response model does not look free`, { requested: modelId, received: usedModel })
  }

  return { text: stripThinkTags(text), model: usedModel }
}

export async function callOpenRouterWithFallback(
  opts: OpenRouterCallOptions
): Promise<OpenRouterCallResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.")

  const chain = resolveModelChain(opts.task)
  logger.info("openRouterClient", `starting fallback chain`, { task: opts.task, chain: chain.join(" → ") })

  const errors: string[] = []

  for (const modelId of chain) {
    try {
      const result = await callSingleModel(apiKey, modelId, opts)
      logger.info("openRouterClient", "model succeeded", { model: result.model })
      return { text: result.text, provider: "openrouter", model: result.model }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const code = (err as { code?: number })?.code
      errors.push(`${modelId}: ${message}`)

      if (code === 429 || isRetryableStatus((err as { status?: number })?.status ?? 0)) {
        logger.warn("openRouterClient", `retrying after failure`, { modelId, message })
        continue
      }

      throw err
    }
  }

  throw new OpenRouterExhaustedError(
    `All OpenRouter free models failed for task ${opts.task}: ${errors.join("; ")}`
  )
}
