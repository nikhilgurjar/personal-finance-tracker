export interface StructuredFinanceResponse {
  answer: string
  highlights: string[]
  confidence: "low" | "medium" | "high"
}

const JSON_BLOCK_RE = /```(?:json)?\s*([\s\S]*?)\s*```/i

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").slice(0, 5)
}

function toConfidence(value: unknown): StructuredFinanceResponse["confidence"] {
  return value === "low" || value === "medium" || value === "high" ? value : "medium"
}

export function parseStructuredFinanceResponse(rawText: string): StructuredFinanceResponse {
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim()

  const match = cleaned.match(JSON_BLOCK_RE)
  const payload = match ? match[1] : cleaned

  try {
    const parsed = JSON.parse(payload)
    if (parsed && typeof parsed === "object") {
      const answer = typeof parsed.answer === "string" && parsed.answer.trim()
        ? parsed.answer.trim()
        : typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : cleaned

      return {
        answer,
        highlights: toStringArray(parsed.highlights),
        confidence: toConfidence(parsed.confidence),
      }
    }
  } catch {
    // ignore invalid JSON; fall back to plain text
  }

  return {
    answer: cleaned,
    highlights: [],
    confidence: "medium",
  }
}
