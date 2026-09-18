import type { Expense, Goal, Saving } from "@/hooks/use-finance-data"
import { safeNumber } from "@/lib/utils"

export interface GoalBackingItem {
  saving: Saving
  allocatedAmount: number
  amount: number
}

export interface GoalProgress {
  linkedSavings: GoalBackingItem[]
  totalLinkedBacking: number
  linkedExpenses: Expense[]
  totalSpent: number
  baseCash: number
  netSaved: number
  target: number
  pct: number
  done: boolean
  basePct: number
  backingPct: number
  spentPct: number
}

export function getGoalSavingsBacking(goal: Goal, savings: Saving[]): GoalBackingItem[] {
  const allocations =
    goal.savings_allocations && goal.savings_allocations.length > 0
      ? goal.savings_allocations
      : (goal.savings_ids || []).map((id) => ({ id, amount: 0 }))

  const fallbackAllocations = savings
    .filter((s) => s.linkedGoals?.includes(goal.id) && !allocations.some((alloc) => alloc.id === s.id))
    .map((s) => ({ id: s.id, amount: 0 }))

  const combined = [...allocations, ...fallbackAllocations]

  return combined
    .map((alloc) => {
      const saving = savings.find((s) => s.id === alloc.id)
      if (!saving) return null
      const effectiveAmount = alloc.amount > 0 ? alloc.amount : saving.amount
      return {
        saving,
        allocatedAmount: alloc.amount,
        amount: effectiveAmount,
      }
    })
    .filter((item): item is GoalBackingItem => item !== null)
}

export function getTotalSpentOnGoal(goalId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.goalId === goalId)
    .reduce((sum, e) => sum + safeNumber(e.amount), 0)
}

/** Net progress = base cash + backing savings + already spent on goal */
export function getGoalProgress(goal: Goal, savings: Saving[], expenses: Expense[]): GoalProgress {
  const linkedSavings = getGoalSavingsBacking(goal, savings)
  const totalLinkedBacking = linkedSavings.reduce((sum, s) => sum + safeNumber(s.amount), 0)
  const linkedExpenses = expenses.filter((e) => e.goalId === goal.id)
  const totalSpent = linkedExpenses.reduce((sum, e) => sum + safeNumber(e.amount), 0)
  const baseCash = safeNumber(goal.current)
  const netSaved = baseCash + totalLinkedBacking + totalSpent
  const target = safeNumber(goal.target)
  const pct = target > 0 ? Math.min(100, Math.round((netSaved / target) * 100)) : 0

  return {
    linkedSavings,
    totalLinkedBacking,
    linkedExpenses,
    totalSpent,
    baseCash,
    netSaved,
    target,
    pct,
    done: pct >= 100,
    basePct: target > 0 ? Math.round((baseCash / target) * 100) : 0,
    backingPct: target > 0 ? Math.round((totalLinkedBacking / target) * 100) : 0,
    spentPct: target > 0 ? Math.round((totalSpent / target) * 100) : 0,
  }
}

export function getFundingSourceLabel(
  fundingSourceId: string | undefined,
  savings: Saving[]
): string {
  if (!fundingSourceId || fundingSourceId === "base_cash") return "Base Cash"
  const saving = savings.find((s) => s.id === fundingSourceId)
  return saving?.name ?? "Unknown Asset"
}
