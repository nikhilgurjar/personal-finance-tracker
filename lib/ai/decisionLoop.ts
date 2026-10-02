export type DecisionToolName =
  | "getFinanceSnapshot"
  | "getIncomeSummary"
  | "getExpenseSummary"
  | "getGoalsSummary"
  | "getDebtSummary"
  | "getSIPSummary"
  | "getSavingsSummary"
  | "getAccountBalanceSummary"
  | "calculateMonthlyCapacity"
  | "applyUserConstraint"
  | "produceRecommendation"

export interface DecisionLoopTraceEntry {
  tool: DecisionToolName
  summary: string
}

export interface DecisionLoopResult {
  mode: "clarify" | "recommendation" | "safe-default"
  loopBudget: number
  loopUsed: number
  questions: string[]
  constraints: string[]
  facts: string[]
  recommendation: string
  summary: string
  toolTrace: DecisionLoopTraceEntry[]
  formula: string
}

const DEFAULT_TOOLS: DecisionToolName[] = [
  "getFinanceSnapshot",
  "getIncomeSummary",
  "getExpenseSummary",
  "getDebtSummary",
  "getGoalsSummary",
  "calculateMonthlyCapacity",
  "applyUserConstraint",
  "produceRecommendation",
]

const num = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const fmt = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function getDecisionLoopBudget(toolCount: number, minTurns = 3, maxTurns = 7): number {
  const computed = 2 * Math.max(1, toolCount) + 1
  return clamp(computed, minTurns, maxTurns)
}

export function buildDecisionLoopSpec(toolNames: DecisionToolName[] = DEFAULT_TOOLS) {
  const toolCount = toolNames.length
  const loopBudget = getDecisionLoopBudget(toolCount)

  return {
    toolCount,
    loopBudget,
    tools: toolNames,
    formula: `max_turns = 2 * n + 1, bounded to [${3}, ${7}]`,
  }
}

function detectConstraints(question: string): string[] {
  const text = question.trim()
  const constraints: string[] = []

  const capMatches = text.match(/(?:only|max|cap|limit|not more than|budget)\s*(?:₹|rs|inr)?\s*([\d,]+(?:\.\d+)?)/gi)
  if (capMatches?.length) {
    constraints.push(`Hard spending cap: ${capMatches[0].replace(/\s+/g, " ")}`)
  }

  if (/defer|deferred|paused|reduce|delay/i.test(text)) {
    constraints.push("Debt deferral is allowed by user request.")
  }

  if (/till\s+(march|april|june|september|december)|before\s+(march|april|june|september|december)/i.test(text)) {
    constraints.push("There is a date-based affordability deadline in the request.")
  }

  return constraints
}

function detectQuestions(dataSlice: Record<string, any[]>, question: string, constraints: string[]): string[] {
  const questions: string[] = []
  const debts = dataSlice.debts ?? []
  const goals = dataSlice.goals ?? []
  const payable = debts.reduce((sum, row) => sum + num(row.amount), 0)

  if (payable > 0 && !/defer|deferred|paused|reduce|delay/i.test(question)) {
    questions.push("Which debts can be deferred, reduced, or paused before you want a recommendation?")
  }

  if (goals.length > 1 && !/priority|wedding|emergency|debt payoff|goal/i.test(question)) {
    questions.push("Which goal is your top priority: wedding, emergency fund, or debt payoff?")
  }

  if (!constraints.length && /can i afford|should i|extra spend|extra expense/i.test(question)) {
    questions.push("What is the maximum additional cash you are comfortable allocating this month?")
  }

  return questions.slice(0, 2)
}

function deriveBudgetFacts(dataSlice: Record<string, any[]>) {
  const income = dataSlice.income ?? []
  const expenses = dataSlice.expenses ?? []
  const sips = dataSlice.sips ?? []
  const debts = dataSlice.debts ?? []
  const goals = dataSlice.goals ?? []

  const monthlyIncome = income
    .filter((row) => String(row.frequency ?? "").toLowerCase() === "monthly")
    .reduce((sum, row) => sum + num(row.amount), 0)

  const trackedExpenses = expenses.reduce((sum, row) => sum + num(row.amount), 0)
  const activeSips = (sips.filter((row) => String(row.sipStatus ?? "").toLowerCase() === "active").reduce((sum, row) => sum + num(row.amount), 0))
  const monthlySurplus = monthlyIncome - trackedExpenses - activeSips
  const payable = debts.reduce((sum, row) => sum + num(row.amount), 0)
  const totalGoalTarget = goals.reduce((sum, row) => sum + num(row.target), 0)
  const totalGoalCurrent = goals.reduce((sum, row) => sum + num(row.current), 0)

  return {
    monthlyIncome,
    trackedExpenses,
    activeSips,
    monthlySurplus,
    payable,
    totalGoalTarget,
    totalGoalCurrent,
    debtUrgency: payable > 100000 ? "CRITICAL" : payable > 30000 ? "HIGH" : payable > 0 ? "MODERATE" : "NONE",
  }
}

function summarizeTool(tool: DecisionToolName, dataSlice: Record<string, any[]>, question: string, constraints: string[]): string {
  const { monthlyIncome, trackedExpenses, activeSips, monthlySurplus, payable, totalGoalTarget, totalGoalCurrent, debtUrgency } = deriveBudgetFacts(dataSlice)

  switch (tool) {
    case "getFinanceSnapshot": {
      return `Income ${fmt(monthlyIncome)}, tracked expenses ${fmt(trackedExpenses)}, active SIPs ${fmt(activeSips)}, debt payable ${fmt(payable)}, goal target ${fmt(totalGoalTarget)}, current funded ${fmt(totalGoalCurrent)}.`
    }
    case "getIncomeSummary":
      return `Monthly income base is ${fmt(monthlyIncome)}. This is the ceiling before existing expenses and SIP commitments.`
    case "getExpenseSummary":
      return `Tracked monthly expense load is ${fmt(trackedExpenses)}. This is the non-negotiable baseline unless the user cuts spending.`
    case "getDebtSummary":
      return `Outstanding debt is ${fmt(payable)} and urgency is ${debtUrgency}.` + (debtUrgency !== "NONE" ? " Do not assume deferment without explicit user approval." : "")
    case "getGoalsSummary":
      return `Goals total ${fmt(totalGoalTarget)} with ${fmt(totalGoalCurrent)} already funded. Remaining gap is ${fmt(Math.max(0, totalGoalTarget - totalGoalCurrent))}.`
    case "getSIPSummary":
      return `Active SIP commitment is ${fmt(activeSips)}. New discretionary spend must not ignore this fixed outflow.`
    case "getSavingsSummary":
      return `Savings data is considered as backup buffer only; no new recommendation should assume extra cash beyond the net surplus.`
    case "getAccountBalanceSummary":
      return `Account balance is not a planning signal for monthly affordability when the operating cashflow is already known.`
    case "calculateMonthlyCapacity":
      return `Monthly capacity = income - tracked expenses - active SIPs = ${fmt(monthlySurplus)}. This is the maximum safe free cash before constraints.`
    case "applyUserConstraint":
      if (constraints.length === 0) return "No hard cap or deadline was explicitly stated, so the safe default is to use the current monthly surplus only."
      return `Constraint(s) detected: ${constraints.join("; ")}. The recommendation must respect these limits before any extra spending.`
    case "produceRecommendation": {
      const safeDefault = monthlySurplus > 0
        ? `Recommend keeping new extra spend within ${fmt(monthlySurplus)} and prioritizing debt reduction or goal funding before any discretionary addition.`
        : "Recommendation: do not add new spend or SIPs. Cut costs first and redirect cash toward debt or critical goals."

      return question.toLowerCase().includes("afford") || question.toLowerCase().includes("extra")
        ? safeDefault
        : `Use the computed monthly surplus of ${fmt(monthlySurplus)} as the baseline and validate any plan against the user constraints before increasing spend.`
    }
    default:
      return "No tool result available."
  }
}

export function runFinanceDecisionLoop(input: { question: string; dataSlice: Record<string, any[]>; history?: unknown[]; savedPlan?: string }): DecisionLoopResult {
  const question = input.question ?? ""
  const dataSlice = input.dataSlice ?? {}
  const toolNames = [...DEFAULT_TOOLS]
  const spec = buildDecisionLoopSpec(toolNames)
  const constraints = detectConstraints(question)
  const questions = detectQuestions(dataSlice, question, constraints)
  const toolTrace: DecisionLoopTraceEntry[] = []
  const facts: string[] = []

  let loopUsed = 0
  const maxIterations = Math.min(spec.loopBudget, toolNames.length)

  for (let i = 0; i < maxIterations; i++) {
    const tool = toolNames[i]
    const summary = summarizeTool(tool, dataSlice, question, constraints)
    toolTrace.push({ tool, summary })
    facts.push(summary)
    loopUsed += 1
  }

  const { monthlySurplus, debtUrgency, payable } = deriveBudgetFacts(dataSlice)

  const safeDefault =
    monthlySurplus <= 0
      ? "Do not add new spending or SIPs. Reduce expenses, protect the cash buffer, and pay down high-priority debt before increasing commitments."
      : payable > 0 && debtUrgency !== "NONE"
        ? `Keep discretionary spend to a maximum of ${fmt(monthlySurplus)} and direct the surplus to debt payoff or priority goals before any new discretionary expense.`
        : `Use ${fmt(monthlySurplus)} as the safe extra-cash limit for this month. Any additional commitment should only be made if it remains within the user-defined cap and does not reduce the emergency buffer.`

  let mode: DecisionLoopResult["mode"] = "recommendation"
  let recommendation = safeDefault

  if (questions.length > 0) {
    mode = "clarify"
    recommendation = `Missing constraints: ${questions.join(" ")}`
  } else if (monthlySurplus <= 0) {
    mode = "safe-default"
    recommendation = safeDefault
  }

  return {
    mode,
    loopBudget: spec.loopBudget,
    loopUsed,
    questions,
    constraints,
    facts,
    recommendation,
    summary: `${toolTrace.map((item) => `${item.tool}: ${item.summary}`).join("\n")}\n\nFinal assessment: ${recommendation}`,
    toolTrace,
    formula: spec.formula,
  }
}
