import type { AIProvider } from "@/lib/ai/aiClient"

export interface AITraceMetadata {
  provider: AIProvider
  model: string
  status: "success" | "error"
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
  incomplete?: boolean
  fallbackFrom?: string
  errorStatus?: number
}

export async function recordAITrace(
  idToken: string,
  trace: AITraceMetadata
): Promise<void> {
  const response = await fetch("/api/ai-traces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trace),
  })
  if (response.ok) return

  let errorMessage = `LangSmith trace failed (${response.status}).`
  try {
    const body: unknown = await response.json()
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      errorMessage = body.error
    }
  } catch {
    throw new Error(errorMessage)
  }
  throw new Error(errorMessage)
}
