import { NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebaseAdmin"
import {
  authenticateFirebaseRequest,
  FirebaseAuthenticationError,
} from "@/lib/firebaseAdminAuth"
import { isAIProvider, type AIProvider } from "@/lib/ai/aiClient"

function modelDocumentId(provider: AIProvider, modelId: string): string {
  return `${provider}_${encodeURIComponent(modelId)}`
}

function toModel(id: string, data: FirebaseFirestore.DocumentData) {
  if (
    typeof data.provider !== "string" ||
    !isAIProvider(data.provider) ||
    typeof data.modelId !== "string" ||
    typeof data.label !== "string"
  ) {
    throw new Error(`Shared AI model "${id}" has invalid data.`)
  }

  return { id, provider: data.provider, modelId: data.modelId, label: data.label }
}

function errorResponse(error: unknown) {
  if (error instanceof FirebaseAuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  console.error("[api/ai-models]", error)
  return NextResponse.json({ error: "Unable to access the shared AI model catalog." }, { status: 500 })
}

export async function GET(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Shared AI models require Firebase Admin to be configured." },
      { status: 503 }
    )
  }

  try {
    await authenticateFirebaseRequest(request)
    const snapshot = await adminDb.collection("aiModels").get()
    const models = snapshot.docs
      .map((modelDocument) => toModel(modelDocument.id, modelDocument.data()))
      .sort((first, second) => first.label.localeCompare(second.label))
    return NextResponse.json({ models }, { headers: { "Cache-Control": "no-store" } })
  } catch (error: unknown) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Shared AI models require Firebase Admin to be configured." },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("provider" in body) ||
    typeof body.provider !== "string" ||
    !isAIProvider(body.provider) ||
    !("modelId" in body) ||
    typeof body.modelId !== "string" ||
    !("label" in body) ||
    typeof body.label !== "string"
  ) {
    return NextResponse.json({ error: "Provider, model ID, and display name are required." }, { status: 400 })
  }

  const modelId = body.modelId.trim()
  const label = body.label.trim()
  if (!modelId || modelId.length > 200 || !label || label.length > 100) {
    return NextResponse.json(
      { error: "Model ID must be 1–200 characters and display name 1–100 characters." },
      { status: 400 }
    )
  }

  try {
    const userId = await authenticateFirebaseRequest(request)
    const id = modelDocumentId(body.provider, modelId)
    const reference = adminDb.collection("aiModels").doc(id)
    await reference.create({
      provider: body.provider,
      modelId,
      label,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ id, provider: body.provider, modelId, label }, { status: 201 })
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined
    if (code === 6 || code === "already-exists") {
      return NextResponse.json(
        { error: "That provider model is already in the shared catalog." },
        { status: 409 }
      )
    }
    return errorResponse(error)
  }
}
