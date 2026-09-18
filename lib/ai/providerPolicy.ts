export type ProviderName = "openrouter" | "gemini"

const providerCooldowns = new Map<ProviderName, number>()

export function getProviderCooldown(provider: ProviderName): number {
  const until = providerCooldowns.get(provider) ?? 0
  return Math.max(0, until - Date.now())
}

export function canUseProvider(provider: ProviderName): boolean {
  return getProviderCooldown(provider) <= 0
}

export function markProviderFailure(provider: ProviderName, retryAfterMs: number): void {
  providerCooldowns.set(provider, Date.now() + retryAfterMs)
}

export function markProviderSuccess(provider: ProviderName): void {
  providerCooldowns.delete(provider)
}

export function getProviderRetryMessage(provider: ProviderName, retryAfterSec?: number): string {
  const label = provider === "openrouter" ? "OpenRouter" : "Gemini"
  const seconds = Math.max(1, Math.ceil((retryAfterSec ?? getProviderCooldown(provider) / 1000) || 1))
  return `${label} is temporarily rate-limited. Please wait ${seconds}s and try again.`
}
