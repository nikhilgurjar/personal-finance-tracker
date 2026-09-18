// lib/ai/modelConfig.ts
// Free-only OpenRouter model tiers and validation.

export type AiTask = "PLAN" | "CONVERSATIONAL" | "CHAT"

const FREE_ROUTER_ID = "openrouter/free"

/** Only IDs ending in :free or exactly openrouter/free pass. */
export function isFreeModel(modelId: string): boolean {
  const id = modelId.trim()
  if (id === FREE_ROUTER_ID) return true
  return id.endsWith(":free")
}

/** Throws if modelId is not a permitted free OpenRouter model. */
export function assertFreeModel(modelId: string): void {
  if (!isFreeModel(modelId)) {
    throw new Error(
      `[modelConfig] Blocked non-free model "${modelId}". Only :free suffix or openrouter/free allowed.`
    )
  }
}

function validateTier(tiers: Record<AiTask, string[]>): Record<AiTask, string[]> {
  for (const models of Object.values(tiers)) {
    for (const id of models) {
      assertFreeModel(id)
    }
  }
  return tiers
}

export const FREE_MODEL_TIERS: Record<AiTask, string[]> = validateTier({
  PLAN: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openai/gpt-oss-120b:free",
    FREE_ROUTER_ID,
  ],
  CONVERSATIONAL: [
    "nvidia/nemotron-3-nano-30b-a3b:free",
    FREE_ROUTER_ID,
  ],
  CHAT: [
    "nvidia/nemotron-3-nano-30b-a3b:free",
    FREE_ROUTER_ID,
  ],
})

function parseEnvModels(envVar: string | undefined): string[] | null {
  if (!envVar?.trim()) return null
  return envVar
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function resolveModelChain(task: AiTask): string[] {
  const envKey =
    task === "PLAN" ? "OPENROUTER_PLAN_MODELS" : "OPENROUTER_CHAT_MODELS"
  const override = parseEnvModels(process.env[envKey])

  if (override?.length) {
    for (const id of override) {
      assertFreeModel(id)
    }
    return override
  }

  if (task === "CONVERSATIONAL") {
    return FREE_MODEL_TIERS.CONVERSATIONAL
  }

  return FREE_MODEL_TIERS[task]
}

/** Short label for UI badges (e.g. "Nemotron Ultra"). */
export function modelDisplayLabel(modelId: string): string {
  const id = modelId.trim()
  if (id === FREE_ROUTER_ID) return "Free Router"

  const labels: Record<string, string> = {
    "nvidia/nemotron-3-ultra-550b-a55b:free": "Nemotron Ultra",
    "nvidia/nemotron-3-super-120b-a12b:free": "Nemotron Super",
    "qwen/qwen3-next-80b-a3b-instruct:free": "Qwen3 Next",
    "openai/gpt-oss-120b:free": "GPT-OSS 120B",
    "nvidia/nemotron-3-nano-30b-a3b:free": "Nemotron Nano",
  }

  if (labels[id]) return labels[id]

  // Fallback: strip provider prefix and :free suffix
  const base = id.replace(/:free$/, "").split("/").pop() ?? id
  return base.length > 24 ? `${base.slice(0, 22)}…` : base
}
