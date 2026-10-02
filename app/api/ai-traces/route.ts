import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { isAIProvider, type AIProvider } from "@/lib/ai/aiClient"
import {
  authenticateFirebaseRequest,
  FirebaseAuthenticationError,
} from "@/lib/firebaseAdminAuth"

interface TraceMetadata {
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

function parseTraceMetadata(value: unknown): TraceMetadata | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("provider" in value) ||
    typeof value.provider !== "string" ||
    !isAIProvider(value.provider) ||
    !("model" in value) ||
    typeof value.model !== "string" ||
    !("status" in value) ||
    (value.status !== "success" && value.status !== "error") ||
    !("durationMs" in value) ||
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0 ||
    value.durationMs > 1_800_000
  ) {
    return null
  }

  const inputTokens = "inputTokens" in value ? value.inputTokens : undefined
  const outputTokens = "outputTokens" in value ? value.outputTokens : undefined
  const isValidTokenCount = (count: unknown) =>
    count === undefined ||
    (typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0 &&
      count <= 10_000_000)
  if (!isValidTokenCount(inputTokens) || !isValidTokenCount(outputTokens)) return null

  return {
    provider: value.provider,
    model: value.model.slice(0, 160),
    status: value.status,
    durationMs: value.durationMs,
    inputTokens: typeof inputTokens === "number" ? inputTokens : undefined,
    outputTokens: typeof outputTokens === "number" ? outputTokens : undefined,
    finishReason:
      "finishReason" in value && typeof value.finishReason === "string"
        ? value.finishReason.slice(0, 80)
        : undefined,
    incomplete: "incomplete" in value && value.incomplete === true,
    fallbackFrom:
      "fallbackFrom" in value && typeof value.fallbackFrom === "string"
        ? value.fallbackFrom.slice(0, 160)
        : undefined,
    errorStatus:
      "errorStatus" in value &&
      typeof value.errorStatus === "number" &&
      Number.isInteger(value.errorStatus)
        ? value.errorStatus
        : undefined,
  }
}

function errorResponse(error: unknown) {
  if (error instanceof FirebaseAuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  console.error("[api/ai-traces] Unable to write metadata-only LangSmith trace.")
  return NextResponse.json({ error: "Unable to write the LangSmith trace." }, { status: 502 })
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.LANGSMITH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set LANGSMITH_API_KEY on the server to enable LangSmith traces." },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const trace = parseTraceMetadata(body)
  if (!trace) {
    return NextResponse.json({ error: "Trace metadata is invalid." }, { status: 400 })
  }

  try {
    await authenticateFirebaseRequest(request)
    const endpoint = (process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com")
      .replace(/\/+$/, "")
    const now = Date.now()
    const run = {
      id: randomUUID(),
      name: "Finio AI Coach",
      run_type: "llm",
      inputs: {
        provider: trace.provider,
        model: trace.model,
        request_type: "ai-coach",
      },
      outputs: {
        status: trace.status,
        duration_ms: trace.durationMs,
        input_tokens: trace.inputTokens,
        output_tokens: trace.outputTokens,
        finish_reason: trace.finishReason,
        incomplete: trace.incomplete ?? false,
        fallback_from: trace.fallbackFrom,
        error_status: trace.errorStatus,
      },
      start_time: new Date(now - trace.durationMs).toISOString(),
      end_time: new Date(now).toISOString(),
      session_name: process.env.LANGSMITH_PROJECT || "finio-ai-coach",
      extra: {
        metadata: {
          provider: trace.provider,
          model: trace.model,
          privacy_mode: "metadata_only",
        },
      },
      error: trace.status === "error" ? `Provider request failed (${trace.errorStatus ?? "unknown"}).` : undefined,
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    }
    if (process.env.LANGSMITH_WORKSPACE_ID) {
      headers["x-tenant-id"] = process.env.LANGSMITH_WORKSPACE_ID
    }

    const response = await fetch(`${endpoint}/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify(run),
    })
    if (!response.ok) {
      console.error(`[api/ai-traces] LangSmith returned HTTP ${response.status}.`)
      return NextResponse.json(
        { error: `LangSmith rejected the trace (HTTP ${response.status}).` },
        { status: 502 }
      )
    }

    return NextResponse.json({ recorded: true }, { status: 201 })
  } catch (error: unknown) {
    return errorResponse(error)
  }
}
