import { auth, isConfigured } from "@/lib/firebase"
import { isAIProvider, type AIProvider } from "@/lib/ai/aiClient"

export interface SharedAIModel {
  id: string
  provider: AIProvider
  modelId: string
  label: string
}

function parseSharedAIModel(value: unknown): SharedAIModel {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("provider" in value) ||
    typeof value.provider !== "string" ||
    !isAIProvider(value.provider) ||
    !("modelId" in value) ||
    typeof value.modelId !== "string" ||
    !("label" in value) ||
    typeof value.label !== "string"
  ) {
    throw new Error("The shared AI model catalog returned invalid data.")
  }

  return {
    id: value.id,
    provider: value.provider,
    modelId: value.modelId,
    label: value.label,
  }
}

async function makeAuthorizedRequest(
  method: "GET" | "POST",
  body?: Omit<SharedAIModel, "id">
): Promise<unknown> {
  if (!isConfigured || !auth?.currentUser) {
    throw new Error("Sign in to Firebase to use the shared AI model catalog.")
  }

  const token = await auth.currentUser.getIdToken()
  const response = await fetch("/api/ai-models", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `AI model catalog request failed (${response.status}).`
    throw new Error(message)
  }

  return result
}

export async function listSharedAIModels(): Promise<SharedAIModel[]> {
  const result = await makeAuthorizedRequest("GET")
  if (
    typeof result !== "object" ||
    result === null ||
    !("models" in result) ||
    !Array.isArray(result.models)
  ) {
    throw new Error("The shared AI model catalog returned an invalid response.")
  }

  return result.models.map(parseSharedAIModel)
}

export async function addSharedAIModel(
  model: Omit<SharedAIModel, "id">
): Promise<SharedAIModel> {
  const modelId = model.modelId.trim()
  const label = model.label.trim()
  if (!isAIProvider(model.provider)) throw new Error("Select a supported AI provider.")
  if (!modelId || !label) throw new Error("A model ID and display name are required.")

  return parseSharedAIModel(
    await makeAuthorizedRequest("POST", { provider: model.provider, modelId, label })
  )
}
