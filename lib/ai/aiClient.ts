export const AI_PROVIDERS = ["gemini", "groq", "openrouter", "mistral"] as const

export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIModelOption {
  provider: AIProvider
  modelId: string
  label: string
}

export interface AIResponse {
  text: string
  provider: AIProvider
  model: string
  fallbackFrom?: string
  incomplete?: boolean
  continuationWarning?: string
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
}

interface ModelGeneration {
  text: string
  truncated: boolean
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
}

const OPENAI_COMPATIBLE_CONFIG: Record<
  Exclude<AIProvider, "gemini">,
  { endpoint: string; modelsEndpoint: string; model: string }
> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    modelsEndpoint: "https://api.groq.com/openai/v1/models",
    model: "llama-3.3-70b-versatile",
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    modelsEndpoint: "https://openrouter.ai/api/v1/models",
    model: "openrouter/free",
  },
  mistral: {
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    modelsEndpoint: "https://api.mistral.ai/v1/models",
    model: "mistral-small-latest",
  },
}

export const DEFAULT_AI_MODELS: AIModelOption[] = [
  { provider: "gemini", modelId: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "groq", modelId: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { provider: "openrouter", modelId: "openrouter/free", label: "OpenRouter Free Router" },
  { provider: "mistral", modelId: "mistral-small-latest", label: "Mistral Small" },
]

class ProviderAPIError extends Error {
  constructor(
    readonly provider: AIProvider,
    readonly status: number,
    detail: string
  ) {
    super(`${provider} API error (${status})${detail ? `: ${detail}` : ""}`)
    this.name = "ProviderAPIError"
  }
}

export function isAIProvider(value: string): value is AIProvider {
  return AI_PROVIDERS.some((provider) => provider === value)
}

export function getAISettingsStorageKeys(userId?: string | null) {
  const suffix = userId ? `:${userId}` : ""
  return {
    provider: `aiProvider${suffix}`,
    apiKey: `aiApiKey${suffix}`,
    model: `aiModel${suffix}`,
  }
}

async function getErrorDetail(response: Response): Promise<string> {
  const detail = (await response.text()).trim()
  if (!detail) return ""

  try {
    const parsed: unknown = JSON.parse(detail)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof parsed.error === "object" &&
      parsed.error !== null &&
      "message" in parsed.error &&
      typeof parsed.error.message === "string"
    ) {
      return parsed.error.message.slice(0, 1000)
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return parsed.message.slice(0, 1000)
    }
  } catch {
    return detail.slice(0, 1000)
  }

  return detail.slice(0, 1000)
}

function getGeminiModelId(name: string): string {
  return name.replace(/^models\//, "")
}

function isLikelyChatModel(modelId: string): boolean {
  return !/(?:embed(?:ding)?|whisper|transcri(?:be|ption)|\btts\b|audio|moderation|guard|rerank|classifier)/i.test(
    modelId
  )
}

export async function listAvailableAIModels(
  provider: AIProvider,
  apiKey: string
): Promise<AIModelOption[]> {
  if (!apiKey.trim()) throw new Error("An AI API key is required to discover models.")

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    )
    if (!response.ok) {
      throw new ProviderAPIError(provider, response.status, await getErrorDetail(response))
    }

    const data: unknown = await response.json()
    if (
      typeof data !== "object" ||
      data === null ||
      !("models" in data) ||
      !Array.isArray(data.models)
    ) {
      throw new Error("Gemini returned an invalid model list.")
    }

    return data.models.flatMap((value: unknown) => {
      if (
        typeof value !== "object" ||
        value === null ||
        !("name" in value) ||
        typeof value.name !== "string" ||
        !("supportedGenerationMethods" in value) ||
        !Array.isArray(value.supportedGenerationMethods) ||
        !value.supportedGenerationMethods.includes("generateContent")
      ) {
        return []
      }
      const modelId = getGeminiModelId(value.name)
      const label =
        "displayName" in value && typeof value.displayName === "string"
          ? value.displayName
          : modelId
      return [{ provider, modelId, label }]
    })
  }

  const { modelsEndpoint } = OPENAI_COMPATIBLE_CONFIG[provider]
  const response = await fetch(modelsEndpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new ProviderAPIError(provider, response.status, await getErrorDetail(response))
  }

  const data: unknown = await response.json()
  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data) ||
    !Array.isArray(data.data)
  ) {
    throw new Error(`${provider} returned an invalid model list.`)
  }

  return data.data
    .flatMap((value: unknown) =>
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string"
        ? [{ provider, modelId: value.id, label: value.id }]
        : []
    )
    .filter((model) => isLikelyChatModel(model.modelId))
}

export function recommendAIModel(
  provider: AIProvider,
  models: AIModelOption[]
): AIModelOption | undefined {
  const available = models.filter(
    (model) => model.provider === provider && isLikelyChatModel(model.modelId)
  )
  const priorities: Record<AIProvider, string[]> = {
    gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"],
    groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    openrouter: ["openrouter/free"],
    mistral: ["mistral-small-latest", "open-mistral-nemo"],
  }
  const preferred = priorities[provider]
    .map((modelId) => available.find((model) => model.modelId === modelId))
    .find((model): model is AIModelOption => model !== undefined)

  if (preferred) return preferred
  if (provider === "gemini") {
    const flashModel = available.find((model) =>
      /flash/i.test(model.modelId) && !/preview|experimental/i.test(model.modelId)
    )
    if (flashModel) return flashModel
  }
  if (provider === "openrouter") {
    const freeModel = available.find((model) => model.modelId.endsWith(":free"))
    if (freeModel) return freeModel
    return undefined
  }
  return available[0]
}

function isModelUnavailable(error: unknown): error is ProviderAPIError {
  if (!(error instanceof ProviderAPIError)) return false
  return (
    error.status === 404 ||
    /model.{0,40}(not found|does not exist|not available|not supported)|(?:not found|does not exist).{0,40}model/i.test(
      error.message
    )
  )
}

function numberProperty(value: unknown, property: string): number | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    property in value &&
    typeof value[property as keyof typeof value] === "number"
  ) {
    return value[property as keyof typeof value] as number
  }
}

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string,
  previousResponse?: string
): Promise<ModelGeneration> {
  const contents = [
    { role: "user", parts: [{ text: prompt }] },
    ...(previousResponse
      ? [
          { role: "model", parts: [{ text: previousResponse }] },
          {
            role: "user",
            parts: [
              {
                text: "Continue exactly where your previous answer stopped. Do not repeat any text. Finish the remaining sections and the final sentence.",
              },
            ],
          },
        ]
      : []),
  ]
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    }
  )
  if (!response.ok) {
    throw new ProviderAPIError("gemini", response.status, await getErrorDetail(response))
  }

  const data: unknown = await response.json()
  const candidate =
    typeof data === "object" &&
    data !== null &&
    "candidates" in data &&
    Array.isArray(data.candidates)
      ? data.candidates[0]
      : undefined
  const text =
    typeof candidate === "object" &&
    candidate !== null &&
    "content" in candidate &&
    typeof candidate.content === "object" &&
    candidate.content !== null &&
    "parts" in candidate.content &&
    Array.isArray(candidate.content.parts)
      ? candidate.content.parts
          .map((part: unknown) =>
            typeof part === "object" &&
            part !== null &&
            "text" in part &&
            typeof part.text === "string"
              ? part.text
              : ""
          )
          .join("")
          .trim()
      : ""
  if (!text) throw new Error("Gemini returned an empty response.")
  const finishReason =
    typeof candidate === "object" &&
    candidate !== null &&
    "finishReason" in candidate &&
    typeof candidate.finishReason === "string"
      ? candidate.finishReason
      : undefined
  const usage =
    typeof data === "object" && data !== null && "usageMetadata" in data
      ? data.usageMetadata
      : undefined
  return {
    text,
    truncated: finishReason === "MAX_TOKENS",
    finishReason,
    inputTokens: numberProperty(usage, "promptTokenCount"),
    outputTokens: numberProperty(usage, "candidatesTokenCount"),
  }
}

async function callOpenAICompatible(
  prompt: string,
  provider: Exclude<AIProvider, "gemini">,
  apiKey: string,
  model: string,
  previousResponse?: string
): Promise<ModelGeneration> {
  const { endpoint } = OPENAI_COMPATIBLE_CONFIG[provider]
  const messages = [
    { role: "user", content: prompt },
    ...(previousResponse
      ? [
          { role: "assistant", content: previousResponse },
          {
            role: "user",
            content:
              "Continue exactly where your previous answer stopped. Do not repeat any text. Finish the remaining sections and the final sentence.",
          },
        ]
      : []),
  ]
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 8192,
    }),
  })
  if (!response.ok) {
    throw new ProviderAPIError(provider, response.status, await getErrorDetail(response))
  }

  const data: unknown = await response.json()
  const choice =
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray(data.choices)
      ? data.choices[0]
      : undefined
  const content =
    typeof choice === "object" &&
    choice !== null &&
    "message" in choice &&
    typeof choice.message === "object" &&
    choice.message !== null &&
    "content" in choice.message
      ? choice.message.content
      : null
  const text =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content
            .map((part: unknown) =>
              typeof part === "object" &&
              part !== null &&
              "text" in part &&
              typeof part.text === "string"
                ? part.text
                : ""
            )
            .join("")
            .trim()
        : ""
  if (!text) throw new Error(`${provider} returned an empty response.`)
  const finishReason =
    typeof choice === "object" &&
    choice !== null &&
    "finish_reason" in choice &&
    typeof choice.finish_reason === "string"
      ? choice.finish_reason
      : undefined
  const usage = typeof data === "object" && data !== null && "usage" in data ? data.usage : undefined
  return {
    text,
    truncated: finishReason === "length",
    finishReason,
    inputTokens: numberProperty(usage, "prompt_tokens"),
    outputTokens: numberProperty(usage, "completion_tokens"),
  }
}

export async function generateAIResponse(
  prompt: string,
  provider: AIProvider,
  apiKey: string,
  selectedModel?: string
): Promise<AIResponse> {
  if (!prompt.trim()) throw new Error("A prompt is required.")
  if (!apiKey.trim()) throw new Error("An AI API key is required.")

  const defaultModel =
    provider === "gemini" ? "gemini-2.5-flash" : OPENAI_COMPATIBLE_CONFIG[provider].model
  const requestedModel = selectedModel?.trim() || defaultModel
  const request = (model: string, previousResponse?: string) =>
    provider === "gemini"
      ? callGemini(prompt, apiKey, model, previousResponse)
      : callOpenAICompatible(prompt, provider, apiKey, model, previousResponse)

  const generateCompleteResponse = async (model: string) => {
    let generation = await request(model)
    let text = generation.text
    let inputTokens = generation.inputTokens ?? 0
    let outputTokens = generation.outputTokens ?? 0
    let continuationCount = 0
    let continuationWarning: string | undefined

    while (generation.truncated && continuationCount < 5) {
      try {
        generation = await request(model, text)
        text = `${text.trimEnd()} ${generation.text.trimStart()}`
        inputTokens += generation.inputTokens ?? 0
        outputTokens += generation.outputTokens ?? 0
        continuationCount += 1
      } catch (error: unknown) {
        continuationWarning =
          error instanceof Error ? error.message : "The provider failed to continue its response."
        break
      }
    }

    return {
      text,
      incomplete: generation.truncated,
      continuationWarning,
      inputTokens: inputTokens || undefined,
      outputTokens: outputTokens || undefined,
      finishReason: generation.finishReason,
    }
  }

  try {
    return {
      ...(await generateCompleteResponse(requestedModel)),
      provider,
      model: requestedModel,
    }
  } catch (error: unknown) {
    if (!isModelUnavailable(error)) throw error

    let availableModels: AIModelOption[]
    try {
      availableModels = await listAvailableAIModels(provider, apiKey)
    } catch (discoveryError: unknown) {
      const reason =
        discoveryError instanceof Error ? discoveryError.message : "model discovery failed."
      throw new Error(
        `The selected ${provider} model "${requestedModel}" is unavailable. Automatic model discovery also failed: ${reason} Check the provider and API key in Settings.`
      )
    }

    const recommendations = availableModels.filter((model) => model.modelId !== requestedModel)
    const recommendedModel = recommendAIModel(provider, recommendations)
    const availableList = recommendations
      .slice(0, 5)
      .map((model) => model.modelId)
      .join(", ")

    if (!recommendedModel) {
      throw new Error(
        `The selected ${provider} model "${requestedModel}" is unavailable, and the provider returned no models that support generation. Check your API key and provider settings.`
      )
    }

    try {
      const completion = await generateCompleteResponse(recommendedModel.modelId)
      return {
        ...completion,
        provider,
        model: recommendedModel.modelId,
        fallbackFrom: requestedModel,
      }
    } catch (fallbackError: unknown) {
      const reason =
        fallbackError instanceof Error ? fallbackError.message : "the recommended model failed."
      throw new Error(
        `The selected model "${requestedModel}" was unavailable. Automatic fallback to "${recommendedModel.modelId}" also failed: ${reason} Available models include: ${availableList || recommendedModel.modelId}. Select a compatible model in Settings.`
      )
    }
  }
}
