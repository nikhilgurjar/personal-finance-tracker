import type { Goal, Saving } from "@/hooks/use-finance-data"
import { safeNumber } from "@/lib/utils"

export interface LiquidationCandidate {
  saving: Saving
  goalId: string
  goalName: string
  score: number
  reasons: string[]
  isExactMatch: boolean
}

export interface SwapSuggestion {
  highYieldSaving: Saving
  fromGoalId: string
  fromGoalName: string
  toGoalId: string
  toGoalName: string
  amount: number
  reason: string
}

export interface LiquidationSuggestion {
  targetAmount: number
  requestGoalId: string
  primary: LiquidationCandidate | null
  swap: SwapSuggestion | null
  alternatives: LiquidationCandidate[]
}

const LIQUIDITY_SCORE: Record<string, number> = {
  savings: 100,
  cash: 100,
  fd: 72,
  rd: 68,
  ppf: 35,
  nps: 30,
  mf: 48,
  equity: 42,
  gold: 55,
}

const YIELD_PENALTY: Record<string, number> = {
  savings: 0,
  cash: 0,
  fd: 5,
  rd: 8,
  ppf: 15,
  nps: 18,
  mf: 25,
  equity: 35,
  gold: 12,
}

function getPrimaryGoalId(saving: Saving): string | null {
  return saving.linkedGoals?.[0] ?? null
}

function scoreAsset(
  saving: Saving,
  targetAmount: number,
  requestGoalId: string,
  goals: Goal[]
): LiquidationCandidate {
  const amount = safeNumber(saving.amount)
  const reasons: string[] = []
  let score = 0

  const isExactMatch = Math.abs(amount - targetAmount) < 1
  if (isExactMatch) {
    score += 1000
    reasons.push("Exact amount match — avoids partial-break penalties")
  } else if (amount >= targetAmount) {
    score += 200
    reasons.push("Covers full expense amount")
  } else {
    score -= 100
    reasons.push("Insufficient balance for full expense")
  }

  const liquidity = LIQUIDITY_SCORE[saving.type] ?? 40
  score += liquidity
  reasons.push(`${saving.type.toUpperCase()} liquidity score: ${liquidity}`)

  const tenureMonths = safeNumber(saving.tenure_months)
  const tenureDays = safeNumber(saving.tenure_days)
  if (tenureMonths > 0 || tenureDays > 0) {
    const totalTenureDays = tenureMonths * 30 + tenureDays
    const recencyBonus = Math.max(0, 120 - totalTenureDays)
    score += recencyBonus
    if (recencyBonus > 60) reasons.push("Shorter/newer tenure — lower break penalty")
  }

  const yieldPenalty = YIELD_PENALTY[saving.type] ?? 10
  score -= yieldPenalty
  if (yieldPenalty <= 8) reasons.push("Low-yield asset — prefer breaking this first")

  const primaryGoalId = getPrimaryGoalId(saving)
  const goal = goals.find((g) => g.id === primaryGoalId)
  if (primaryGoalId === requestGoalId) {
    score += 80
    reasons.push("Already linked to this goal")
  }

  return {
    saving,
    goalId: primaryGoalId ?? "",
    goalName: goal?.name ?? "Unassigned",
    score,
    reasons,
    isExactMatch,
  }
}

function findHighYieldSwapCandidate(
  requestGoalId: string,
  amount: number,
  savings: Saving[],
  goals: Goal[],
  excludeSavingId: string
): SwapSuggestion | null {
  const requestGoal = goals.find((g) => g.id === requestGoalId)
  if (!requestGoal) return null

  const requestGoalSavingIds = new Set([
    ...(requestGoal.savings_ids ?? []),
    ...(requestGoal.savings_allocations?.map((a) => a.id) ?? []),
    ...savings.filter((s) => s.linkedGoals?.includes(requestGoalId)).map((s) => s.id),
  ])

  const candidates = savings
    .filter((s) => s.id !== excludeSavingId && requestGoalSavingIds.has(s.id) && safeNumber(s.amount) >= amount)
    .map((s) => ({
      saving: s,
      yieldScore: YIELD_PENALTY[s.type] ?? 10,
    }))
    .sort((a, b) => b.yieldScore - a.yieldScore)

  const best = candidates[0]
  if (!best || best.yieldScore < 15) return null

  return {
    highYieldSaving: best.saving,
    fromGoalId: requestGoalId,
    fromGoalName: requestGoal.name,
    toGoalId: "",
    toGoalName: "",
    amount,
    reason: `Preserve high-yield ${best.saving.name} on ${requestGoal.name} by swapping allocation after liquidation`,
  }
}

/** Score all savings globally and pick the optimal asset to fund an expense. */
export function suggestLiquidation(
  targetAmount: number,
  requestGoalId: string,
  savings: Saving[],
  goals: Goal[]
): LiquidationSuggestion {
  if (targetAmount <= 0) {
    return { targetAmount, requestGoalId, primary: null, swap: null, alternatives: [] }
  }

  const activeSavings = savings.filter((s) => s.active !== false && safeNumber(s.amount) > 0)
  const ranked = activeSavings
    .map((s) => scoreAsset(s, targetAmount, requestGoalId, goals))
    .filter((c) => safeNumber(c.saving.amount) >= targetAmount)
    .sort((a, b) => b.score - a.score)

  const primary = ranked[0] ?? null
  const alternatives = ranked.slice(1, 4)

  let swap: SwapSuggestion | null = null
  if (primary && primary.goalId && primary.goalId !== requestGoalId) {
    const swapCandidate = findHighYieldSwapCandidate(
      requestGoalId,
      targetAmount,
      savings,
      goals,
      primary.saving.id
    )
    if (swapCandidate) {
      const sourceGoal = goals.find((g) => g.id === primary.goalId)
      swap = {
        ...swapCandidate,
        toGoalId: primary.goalId,
        toGoalName: sourceGoal?.name ?? primary.goalName,
      }
    }
  }

  return { targetAmount, requestGoalId, primary, swap, alternatives }
}

export interface SmartLiquidationPlan {
  fundingSourceId: string
  goalId: string
  amount: number
  swapSteps: Array<{
    savingId: string
    fromGoalIds: string[]
    toGoalIds: string[]
    amount: number
  }>
}

/** Build an execution plan from a suggestion (UI/hook applies the mutations). */
export function buildLiquidationPlan(
  suggestion: LiquidationSuggestion,
  requestGoalId: string
): SmartLiquidationPlan | null {
  if (!suggestion.primary) return null

  const plan: SmartLiquidationPlan = {
    fundingSourceId: suggestion.primary.saving.id,
    goalId: requestGoalId,
    amount: suggestion.targetAmount,
    swapSteps: [],
  }

  if (suggestion.swap && suggestion.primary.goalId !== requestGoalId) {
    const highYield = suggestion.swap.highYieldSaving
    plan.swapSteps.push({
      savingId: highYield.id,
      fromGoalIds: highYield.linkedGoals ?? [requestGoalId],
      toGoalIds: [...new Set([...(highYield.linkedGoals ?? []), suggestion.primary.goalId])],
      amount: suggestion.targetAmount,
    })
  }

  return plan
}
