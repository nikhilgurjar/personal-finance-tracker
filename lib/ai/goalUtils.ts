export function safeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function cleanFinanceName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function isGoalSavingNameMatch(goal: any, saving: any) {
  const goalName = cleanFinanceName(goal.name)
  const savingName = cleanFinanceName(saving.name)
  if (goalName.length < 8 || savingName.length < 8) return false
  return goalName === savingName || goalName.includes(savingName) || savingName.includes(goalName)
}

export function getGoalTotalSpent(goal: any, expenses: any[]) {
  return (expenses ?? [])
    .filter((e) => e.goalId === goal.id)
    .reduce((sum, e) => sum + safeNumber(e.amount), 0)
}

export function getGoalNetProgress(goal: any, savings: any[], expenses: any[] = []) {
  return safeNumber(goal.current) + getGoalBackingAmount(goal, savings) + getGoalTotalSpent(goal, expenses)
}

export function getGoalBackingAmount(goal: any, savings: any[]) {
  const parsedAllocations = typeof goal.savings_allocations === "string" 
    ? JSON.parse(goal.savings_allocations) 
    : (goal.savings_allocations || [])
    
  const allocations = parsedAllocations.length > 0
    ? parsedAllocations
    : (goal.savings_ids || []).map((id: string) => ({ id, amount: 0 }))
    
  const allocationIds = new Set(allocations.map((a: any) => a.id))

  const linkedAllocations = savings
    .filter((saving) => saving.linkedGoals?.includes(goal.id) && !allocationIds.has(saving.id))
    .map((saving) => ({ id: saving.id, amount: 0 }))

  const explicitBacking = [...allocations, ...linkedAllocations].reduce((sum, allocation) => {
    const saving = savings.find((item) => item.id === allocation.id)
    if (!saving) return sum
    return sum + safeNumber(allocation.amount > 0 ? allocation.amount : saving.amount)
  }, 0)

  const inferredBackingAmount = savings
    .filter(
      (saving) =>
        (saving.linkedGoals?.length ?? 0) === 0 &&
        !allocationIds.has(saving.id) &&
        isGoalSavingNameMatch(goal, saving)
    )
    .reduce((sum, saving) => sum + safeNumber(saving.amount), 0)

  return explicitBacking + inferredBackingAmount
}
