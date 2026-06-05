// lib/ai/planPromptBuilder.ts
// Builds prompts for the AI savings & wealth plan feature.

import type { HistoryMessage } from "./promptBuilder"

interface PlanPromptInput {
  dataSlice: Record<string, any[]>
  question: string
  history?: HistoryMessage[]
  savedPlan?: string
}

interface BuiltPlanPrompt {
  system: string
  user: string
  estimatedTokens: number
}

const SKIP_FIELDS = new Set([
  "photoURL",
  "userId",
  "createdAt",
  "updatedAt",
  "__typename",
])

function serializeCollection(collectionName: string, rows: any[]): string {
  if (rows.length === 0) {
    return `[${collectionName.toUpperCase()}]: No records found.`
  }

  const keySet = new Set<string>()
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!SKIP_FIELDS.has(k) && row[k] !== undefined && row[k] !== null && row[k] !== "") {
        keySet.add(k)
      }
    }
  }
  const keys = Array.from(keySet)

  const header = keys.join(" | ")
  const rowLines = rows.map((row) =>
    keys
      .map((k) => {
        const v = row[k]
        if (v === undefined || v === null || v === "") return "-"
        if (typeof v === "object" && "seconds" in v) {
          return new Date(v.seconds * 1000).toISOString().slice(0, 10)
        }
        if (typeof v === "object") return JSON.stringify(v)
        return String(v)
      })
      .join(" | ")
  )

  return `[${collectionName.toUpperCase()}] — ${rows.length} record(s):\n${header}\n${rowLines.join("\n")}`
}

function serializeSlice(dataSlice: Record<string, any[]>, maxTotalChars = 6000): string {
  const collectionNames = Object.keys(dataSlice)
  if (collectionNames.length === 0) return "No data available."

  const charBudgetPerCollection = Math.floor(maxTotalChars / collectionNames.length)
  const parts: string[] = []

  for (const col of collectionNames) {
    let rows = dataSlice[col]
    let serialized = serializeCollection(col, rows)

    while (serialized.length > charBudgetPerCollection && rows.length > 3) {
      rows = rows.slice(0, Math.max(3, Math.floor(rows.length * 0.7)))
      serialized = serializeCollection(col, rows) + "\n...[additional rows omitted for brevity]"
    }

    parts.push(serialized)
  }

  return parts.join("\n\n")
}

const num = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const fmt = (n: number): string =>
  `₹${Math.round(n).toLocaleString("en-IN")}`

const cleanName = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")

function isNameMatch(goal: any, saving: any): boolean {
  const goalName = cleanName(goal.name)
  const savingName = cleanName(saving.name)
  if (goalName.length < 8 || savingName.length < 8) return false
  return goalName === savingName || goalName.includes(savingName) || savingName.includes(goalName)
}

function getGoalBacking(goal: any, savings: any[]) {
  const savingsIds = Array.isArray(goal.savings_ids) ? goal.savings_ids : []
  const rawAllocations = Array.isArray(goal.savings_allocations) ? goal.savings_allocations : []
  const allocations =
    rawAllocations.length > 0 ? rawAllocations : savingsIds.map((id: string) => ({ id, amount: 0 }))
  const allocationIds = new Set(allocations.map((a: any) => a.id))

  const fallbackAllocations = savings
    .filter(
      (s) =>
        Array.isArray(s.linkedGoals) && s.linkedGoals.includes(goal.id) && !allocationIds.has(s.id)
    )
    .map((s) => ({ id: s.id, amount: 0 }))

  const explicitBacking = [...allocations, ...fallbackAllocations]
    .map((a: any) => {
      const saving = savings.find((s) => s.id === a.id)
      if (!saving) return null
      const amount = num(a.amount) > 0 ? num(a.amount) : num(saving.amount)
      return { amount, label: `${saving.name ?? "Unnamed saving"} ${fmt(amount)} linked` }
    })
    .filter((x): x is { amount: number; label: string } => x !== null)

  const explicitIds = new Set([
    ...allocationIds,
    ...fallbackAllocations.map((a) => a.id),
  ])
  const inferredBacking = savings
    .filter((s) => {
      const linkedGoals = Array.isArray(s.linkedGoals) ? s.linkedGoals : []
      return linkedGoals.length === 0 && !explicitIds.has(s.id) && isNameMatch(goal, s)
    })
    .map((s) => ({
      amount: num(s.amount),
      label: `${s.name ?? "Unnamed saving"} ${fmt(num(s.amount))} name-matched (inferred)`,
    }))

  const backing = [...explicitBacking, ...inferredBacking]
  return {
    amount: backing.reduce((s, x) => s + x.amount, 0),
    labels: backing.map((x) => x.label),
    hasInferred: inferredBacking.length > 0,
  }
}

function buildAnalyticsSummary(dataSlice: Record<string, any[]>): string {
  const goals = dataSlice.goals ?? []
  const savings = dataSlice.savings ?? []
  const expenses = dataSlice.expenses ?? []
  const income = dataSlice.income ?? []
  const sips = dataSlice.sips ?? []
  const debts = dataSlice.debts ?? []

  // ── Income ──────────────────────────────────────────────────────────────────
  const monthlyIncome = income
    .filter((i) => String(i.frequency ?? "").toLowerCase() === "monthly")
    .reduce((s, i) => s + num(i.amount), 0)

  const otherIncome = income
    .filter((i) => String(i.frequency ?? "").toLowerCase() !== "monthly")
    .reduce((s, i) => s + num(i.amount), 0)

  // ── Expenses ─────────────────────────────────────────────────────────────────
  const trackedExpenses = expenses.reduce((s, e) => s + num(e.amount), 0)

  // Category breakdown — only actual tracked categories, no fabrication
  const expenseByCat = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = String(e.category ?? "uncategorized")
    acc[cat] = (acc[cat] ?? 0) + num(e.amount)
    return acc
  }, {})
  const sortedExpenseCats = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1])
  const topExpense = sortedExpenseCats[0]

  // ── SIPs ─────────────────────────────────────────────────────────────────────
  const activeSipAmount = sips
    .filter((s) => String(s.sipStatus ?? "").toLowerCase() === "active")
    .reduce((s, x) => s + num(x.amount), 0)

  // ── Surplus & ratios ─────────────────────────────────────────────────────────
  const monthlySurplus = monthlyIncome - trackedExpenses - activeSipAmount
  const surplusRatio = monthlyIncome > 0 ? monthlySurplus / monthlyIncome : 0
  const expenseRatio = monthlyIncome > 0 ? trackedExpenses / monthlyIncome : 0

  // ── Expense tracking gap warning ─────────────────────────────────────────────
  // If expenses < 40% of income it almost certainly means under-tracking
  const undertrackingWarning =
    expenseRatio < 0.4 && monthlyIncome > 0
      ? `⚠️ CRITICAL GAP: Only ${fmt(trackedExpenses)} tracked against ${fmt(monthlyIncome)} income ` +
        `(${Math.round(expenseRatio * 100)}%). ${fmt(monthlyIncome - trackedExpenses)} per month is UNACCOUNTED. ` +
        `The plan MUST prominently flag this — the apparent surplus of ${fmt(monthlySurplus)} is likely overstated. ` +
        `Advise user to add all regular living expenses (rent, food, transport, etc.) before trusting this plan.`
      : surplusRatio > 0.6
      ? `⚠️ NOTE: Surplus ${Math.round(surplusRatio * 100)}% of income — verify all expenses are tracked.`
      : ""

  // ── Debts ─────────────────────────────────────────────────────────────────────
  const lent = debts.filter((d) => d.type === "lent").reduce((s, d) => s + num(d.amount), 0)
  const lentRepaid = debts
    .filter((d) => d.type === "lent_repayment")
    .reduce((s, d) => s + num(d.amount), 0)
  const borrowed = debts.filter((d) => d.type === "borrowed").reduce((s, d) => s + num(d.amount), 0)
  const borrowedRepaid = debts
    .filter((d) => d.type === "borrowed_repayment")
    .reduce((s, d) => s + num(d.amount), 0)
  const receivable = Math.max(0, lent - lentRepaid)
  const payable = Math.max(0, borrowed - borrowedRepaid)
  const netDebt = receivable - payable

  const debtUrgency =
    payable > 100_000
      ? "CRITICAL"
      : payable > 50_000
      ? "HIGH"
      : payable > 10_000
      ? "MEDIUM"
      : "LOW"

  // How many months at full surplus to clear debt
  const debtPayoffMonths =
    monthlySurplus > 0 && payable > 0 ? Math.ceil(payable / monthlySurplus) : null
  // Recommended monthly debt repayment (pay off within 3 months if CRITICAL, 6 if HIGH)
  const recommendedDebtMonthly =
    debtUrgency === "CRITICAL" && payable > 0
      ? Math.ceil(payable / 3)
      : debtUrgency === "HIGH" && payable > 0
      ? Math.ceil(payable / 6)
      : null

  // ── Goals ─────────────────────────────────────────────────────────────────────
  const now = new Date()

  const goalDetails = goals.map((goal) => {
    const backing = getGoalBacking(goal, savings)
    const goalExpenses = expenses.filter((e) => e.goalId === goal.id).reduce((sum, e) => sum + num(e.amount), 0)
    const target = num(goal.target)
    const backed = num(goal.current) + backing.amount + goalExpenses
    const remaining = Math.max(0, target - backed)
    const progress = target > 0 ? Math.min(100, Math.round((backed / target) * 100)) : 0

    // Months to deadline
    let monthsToDeadline: number | null = null
    let deadlineStr = goal.deadline ?? null
    if (deadlineStr) {
      const deadlineDate = new Date(deadlineStr)
      const diff =
        (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
        (deadlineDate.getMonth() - now.getMonth())
      monthsToDeadline = Math.max(1, diff)
    }

    // Monthly needed to hit deadline
    const monthlyNeededForDeadline =
      monthsToDeadline && monthsToDeadline > 0 && remaining > 0
        ? Math.ceil(remaining / monthsToDeadline)
        : null

    // How many months at full surplus to complete this single goal
    const monthsAtFullSurplus =
      monthlySurplus > 0 && remaining > 0 ? Math.ceil(remaining / monthlySurplus) : 0

    // Is wedding-related?
    const name = String(goal.name ?? "").toLowerCase()
    const category = String(goal.category ?? "").toLowerCase()
    const isWedding =
      name.includes("marriage") ||
      name.includes("wedding") ||
      category === "wedding" ||
      name.includes("sangeet") ||
      name.includes("band") ||
      name.includes("tashe") ||
      name.includes("photographer") ||
      name.includes("stage show") ||
      name.includes("clothing")

    return {
      id: goal.id,
      name: goal.name ?? "Unnamed goal",
      target,
      backed,
      remaining,
      progress,
      deadline: deadlineStr,
      monthsToDeadline,
      monthlyNeededForDeadline,
      monthsAtFullSurplus,
      isWedding,
      backingLabels: backing.labels,
      hasInferred: backing.hasInferred,
    }
  })

  // ── Wedding goal aggregation ──────────────────────────────────────────────────
  const weddingGoals = goalDetails.filter((g) => g.isWedding)
  const weddingTotalRemaining = weddingGoals.reduce((s, g) => s + g.remaining, 0)
  const weddingTotalTarget = weddingGoals.reduce((s, g) => s + g.target, 0)
  const weddingTotalBacked = weddingGoals.reduce((s, g) => s + g.backed, 0)
  const weddingOverallProgress =
    weddingTotalTarget > 0 ? Math.round((weddingTotalBacked / weddingTotalTarget) * 100) : 0
  const weddingMonthsAtFullSurplus =
    monthlySurplus > 0 && weddingTotalRemaining > 0
      ? Math.ceil(weddingTotalRemaining / monthlySurplus)
      : null

  // ── Overall goal totals ───────────────────────────────────────────────────────
  const totalTarget = goalDetails.reduce((s, g) => s + g.target, 0)
  const totalBacked = goalDetails.reduce((s, g) => s + g.backed, 0)
  const totalRemaining = goalDetails.reduce((s, g) => s + g.remaining, 0)
  const overallProgress =
    totalTarget > 0 ? Math.min(100, Math.round((totalBacked / totalTarget) * 100)) : 0

  // ── Recommended surplus allocation ───────────────────────────────────────────
  // A suggested allocation the AI can use as a starting point (not final)
  let allocDebt = 0
  let allocWedding = 0
  let allocOtherGoals = 0
  let allocSIPExpansion = 0
  let allocBuffer = 0

  const workingSurplus = monthlySurplus // may be overstated if expenses under-tracked

  if (debtUrgency === "CRITICAL" && recommendedDebtMonthly) {
    allocDebt = Math.min(recommendedDebtMonthly, workingSurplus * 0.4)
  } else if (debtUrgency === "HIGH" && recommendedDebtMonthly) {
    allocDebt = Math.min(recommendedDebtMonthly, workingSurplus * 0.25)
  }

  const afterDebt = workingSurplus - allocDebt
  if (weddingTotalRemaining > 0) {
    // Push to finish wedding goals in 2–3 months if possible
    const weddingTarget3Months = Math.ceil(weddingTotalRemaining / 3)
    allocWedding = Math.min(weddingTarget3Months, afterDebt * 0.5)
  }

  const afterWedding = afterDebt - allocWedding
  const otherGoalRemaining = totalRemaining - weddingTotalRemaining
  if (otherGoalRemaining > 0) {
    allocOtherGoals = Math.min(Math.ceil(otherGoalRemaining / 6), afterWedding * 0.4)
  }

  allocSIPExpansion = Math.min(afterWedding * 0.2, 20_000)
  allocBuffer = workingSurplus - allocDebt - allocWedding - allocOtherGoals - allocSIPExpansion

  // ── Per-goal lines ────────────────────────────────────────────────────────────
  const goalLines = goalDetails.slice(0, 30).map((g) => {
    const parts: string[] = [
      `${g.name}: ${g.progress}% funded`,
      `backed ${fmt(g.backed)} of ${fmt(g.target)}`,
      `remaining ${fmt(g.remaining)}`,
    ]
    if (g.deadline) parts.push(`deadline ${g.deadline}`)
    if (g.monthsToDeadline !== null) parts.push(`${g.monthsToDeadline} months to deadline`)
    if (g.monthlyNeededForDeadline)
      parts.push(`needs ${fmt(g.monthlyNeededForDeadline)}/mo to hit deadline`)
    if (g.monthsAtFullSurplus <= 3 && g.remaining > 0)
      parts.push(`⚡ completable in ${g.monthsAtFullSurplus} month(s) at full surplus`)
    if (g.backingLabels.length) parts.push(`backing: ${g.backingLabels.join(", ")}`)
    if (g.hasInferred) parts.push(`(name-matched backing is inferred — recommend explicit linking)`)
    return `- ${parts.join(", ")}.`
  })

  // ── Expense category lines ────────────────────────────────────────────────────
  const expCatLines = sortedExpenseCats.map(
    ([cat, amt]) => `  ${cat}: ${fmt(amt)} (${Math.round((amt / trackedExpenses) * 100)}% of tracked)`
  )

  return [
    "════════════════════════════════════════════════════════════════",
    "  COMPUTED ANALYTICS — AUTHORITATIVE — DO NOT INVENT OTHER NUMBERS",
    "════════════════════════════════════════════════════════════════",
    "",
    "── INCOME ──",
    `Monthly income (tracked, frequency=monthly): ${fmt(monthlyIncome)}`,
    otherIncome > 0 ? `Other/one-time income (non-monthly, do not use for recurring plan): ${fmt(otherIncome)}` : "",
    "",
    "── EXPENSES (ACTUAL TRACKED CATEGORIES ONLY) ──",
    `Total tracked expenses: ${fmt(trackedExpenses)}`,
    `Tracked expense categories — USE ONLY THESE in the Budget Blueprint table:`,
    ...expCatLines,
    undertrackingWarning,
    "",
    "── SIPs ──",
    `Active SIP total: ${fmt(activeSipAmount)}`,
    sips.filter((s) => String(s.sipStatus ?? "").toLowerCase() === "active").length === 0
      ? "No active SIPs."
      : sips
          .filter((s) => String(s.sipStatus ?? "").toLowerCase() === "active")
          .map((s) => `  ${s.name}: ${fmt(num(s.amount))}/mo`)
          .join("\n"),
    "",
    "── SURPLUS ──",
    `Calculated monthly surplus (income − tracked expenses − active SIPs): ${fmt(monthlySurplus)}`,
    `Surplus as % of income: ${Math.round(surplusRatio * 100)}%`,
    surplusRatio > 0.6
      ? `⚠️ WARN: Surplus is unusually high (${Math.round(surplusRatio * 100)}% of income). This strongly suggests` +
        ` under-tracked expenses. Treat this surplus as TENTATIVE and flag it in the plan.`
      : "",
    "",
    "── DEBT POSITION ──",
    `Receivable (money owed TO user): ${fmt(receivable)}`,
    `Payable (money user OWES): ${fmt(payable)}`,
    `Net position: ${fmt(netDebt)} (${netDebt >= 0 ? "net receiver" : "net borrower — user owes more than owed"})`,
    `Debt urgency level: ${debtUrgency}`,
    debtPayoffMonths !== null
      ? `At full current surplus, payable debt cleared in: ~${debtPayoffMonths} month(s)`
      : "",
    recommendedDebtMonthly
      ? `Recommended monthly debt repayment to clear in ${debtUrgency === "CRITICAL" ? "3" : "6"} months: ${fmt(recommendedDebtMonthly)}`
      : "",
    debtUrgency === "CRITICAL"
      ? `🚨 CRITICAL DEBT: ${fmt(payable)} payable. This MUST appear prominently in Snapshot, This Week, and Wealth Building Steps.`
      : debtUrgency === "HIGH"
      ? `⚠️ HIGH DEBT: ${fmt(payable)} payable. Address in Wealth Building Steps.`
      : "",
    "",
    "── GOALS OVERVIEW ──",
    `Overall goal progress: ${overallProgress}% — ${fmt(totalBacked)} backed of ${fmt(totalTarget)} total target`,
    `Total remaining across all goals: ${fmt(totalRemaining)}`,
    "",
    weddingGoals.length > 0
      ? [
          "── WEDDING GOALS (TOP PRIORITY) ──",
          `Wedding goals combined: ${weddingOverallProgress}% funded, ${fmt(weddingTotalBacked)} backed of ${fmt(weddingTotalTarget)}`,
          `Total wedding remaining: ${fmt(weddingTotalRemaining)}`,
          weddingMonthsAtFullSurplus !== null
            ? `⚡ At full surplus ALL wedding goals completable in: ${weddingMonthsAtFullSurplus} month(s)`
            : "",
          `Suggested monthly wedding allocation to finish in 3 months: ${fmt(Math.ceil(weddingTotalRemaining / 3))}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    "",
    "── PER-GOAL BREAKDOWN (AUTHORITATIVE) ──",
    ...goalLines,
    "",
    "── SUGGESTED SURPLUS ALLOCATION (starting point for the plan) ──",
    `  Total surplus to allocate: ${fmt(monthlySurplus)}`,
    allocDebt > 0 ? `  Debt repayment (${debtUrgency}): ${fmt(allocDebt)}` : "",
    allocWedding > 0 ? `  Wedding goals (priority): ${fmt(allocWedding)}` : "",
    allocOtherGoals > 0 ? `  Other goals: ${fmt(allocOtherGoals)}` : "",
    `  Existing SIP commitment: ${fmt(activeSipAmount)}`,
    allocSIPExpansion > 0 ? `  SIP expansion opportunity: ${fmt(allocSIPExpansion)}` : "",
    `  Tracked expenses: ${fmt(trackedExpenses)}`,
    allocBuffer > 0 ? `  Remaining buffer/untracked: ${fmt(allocBuffer)}` : "",
    "",
    "════════════════════════════════════════════════════════════════",
    "  HARD CONSTRAINTS FOR THE AI (NEVER VIOLATE)",
    "════════════════════════════════════════════════════════════════",
    "C1. Budget Blueprint rows must use ONLY the tracked expense categories listed above.",
    "    DO NOT create aggregate buckets like 'Essential Expenses' or 'Discretionary'.",
    "    Every row must trace to an actual data record.",
    "C2. Budget Blueprint total column must sum to ≤ monthly income.",
    "    DO NOT double-count (e.g. credit_card already in tracked expenses — do not list again separately).",
    "C3. Every ₹ figure in the response must come from these analytics or raw data.",
    "    If a figure is not here, do not invent it.",
    "C4. Monthly Checklist ₹ amounts must EXACTLY match Goal Roadmap ₹ amounts.",
    "C5. Goal completion months must be: remaining ÷ monthly contribution — not estimated.",
    "C6. If surplus > 60% of income, put the ⚠️ data-completeness warning in Section 1 of the response.",
    "C7. Wedding goals are top priority — show the most aggressive realistic completion timeline.",
    "C8. All sections must be internally consistent — same goal, same number everywhere.",
    "════════════════════════════════════════════════════════════════",
  ]
    .filter((line) => line !== "")
    .join("\n")
}

function serializeHistory(history: HistoryMessage[]): string {
  if (!history.length) return ""
  const lines = history.map(
    (m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content.slice(0, 800)}`
  )
  return `\n\n--- Conversation so far ---\n${lines.join("\n")}\n--- End of conversation ---`
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

const PLAN_SYSTEM_PROMPT = `You are Finio Wealth Coach — a sharp, direct, data-driven personal finance planner for Indian users.

Your core job: turn real financial data into a specific, honest, actionable plan. Be concrete. Use exact numbers from the data.

═══════════════════════════════════════════════════════
§ GOLDEN RULES (violating any = bad plan)
═══════════════════════════════════════════════════════

RULE 1 — DATA FIDELITY: Every ₹ amount must come from the provided analytics. Never invent expense categories, estimates, or buckets not in the data.

RULE 2 — BUDGET BLUEPRINT TABLE: Use ONLY the tracked expense categories that appear in the analytics. No aggregate rows like "Essential Expenses" or "Discretionary Expenses". Each row = one real data record.
  Correct example row:  | credit_card   | ₹20,000 | 10.4% |
  Wrong example row:    | Essential Expenses | ₹1,20,000 | 62% |  ← NEVER DO THIS

RULE 3 — NO DOUBLE-COUNTING: If "credit_card" is already in tracked expenses, do not also add it as a separate row. The total of all rows must equal monthly income.

RULE 4 — CONSISTENCY: If Goal Roadmap says "₹X/month to wedding", Monthly Checklist must also say "₹X/month to wedding" — same number, same goal. Never contradict yourself between sections.

RULE 5 — FULL SURPLUS ALLOCATION: Every rupee of the monthly surplus must be accounted for. Show: tracked expenses + SIPs + debt repayment + goal contributions + buffer = income. Leave no large unexplained gap.

RULE 6 — EXPENSE TRACKING GAP: If surplus > 60% of income, flag it in section 1 ("⚠️ Data Completeness"). Tell the user the apparent surplus may be overstated because not all expenses are tracked, and ask them to add regular living costs before fully trusting the plan.

RULE 7 — FAST-TRACK GOALS: If a goal can be fully funded within 1–3 months at the current surplus, say so explicitly with a "⚡ Fast-Track" callout and recommended monthly amount.

RULE 8 — DEBT URGENCY: If debt urgency is CRITICAL (>₹1,00,000 payable), it must appear in: Financial Snapshot, Wealth Building Steps, and This Week. Provide a concrete payoff timeline.

RULE 9 — GOAL TIMELINES: Compute completion date as: today + (remaining ÷ monthly contribution) months. Do not guess. If monthly contribution needed exceeds surplus, flag it.

RULE 10 — WEDDING PRIORITY: If user states wedding goals are top priority, show the most aggressive realistic allocation first, with exact months-to-completion.

═══════════════════════════════════════════════════════
§ OUTPUT FORMAT
═══════════════════════════════════════════════════════

## ⚠️ Data Completeness Check
ONE sentence on whether tracked expenses are plausible vs income.
If surplus > 60% of income: "Only ₹X tracked against ₹Y income — add missing expenses before fully trusting this plan."

## Your Financial Snapshot
3–4 sentences: income, tracked expenses, SIP, surplus, debt urgency (if any), overall goal status.

## Key Analytics
Bullet list — use exact figures from analytics. No invented numbers.

## Monthly Budget Blueprint
Table with ONLY real tracked expense categories + SIPs + goal contributions + debt repayment + buffer.
| Category | ₹/month | % of Income |
All rows must sum to ≤ income. Show the total row.

## Goal-by-Goal Roadmap
List EVERY single goal provided in the data. Do NOT omit or summarize any goal. For EACH goal: progress %, backed, remaining, monthly contribution, estimated months to complete, deadline if set.
⚡ Fast-Track: if completable in ≤3 months, say so and show the accelerated monthly amount.

## Wealth Building Steps
Priority order:
1. Fix expense tracking if gap exists
2. Clear CRITICAL/HIGH debt with timeline
3. Fund priority (wedding) goals aggressively
4. SIP/investment expansion once goals/debt on track
5. Emergency fund if absent or thin
Educational only — no specific stock picks or guaranteed returns.

## Monthly Checklist
5–7 items with SPECIFIC ₹ amounts. Each ₹ must match a number in Goal Roadmap or Budget Blueprint exactly.

## This Week
3 immediate next steps. If debt is CRITICAL, the first step must be debt-related.

## 12-Month Plan
A month-by-month roadmap for the next 12 months. Show how the surplus is used each month to clear debt, fund goals, and build wealth. Keep it clear and specific.

═══════════════════════════════════════════════════════
§ STYLE
═══════════════════════════════════════════════════════
- Use ₹ with Indian comma formatting: ₹1,55,910 not ₹155910
- Prefer tables and bullets over paragraphs
- Be direct — say "do X" not "you might consider X"
- Flag real risks: low emergency fund, under-tracked expenses, 0% goal with deadline, CRITICAL debt
- Keep under 1000 words unless user asks for more detail
- If clarification is truly needed, ask at most 2 questions and proceed with stated assumptions`

export function buildPlanPrompt(input: PlanPromptInput): BuiltPlanPrompt {
  const { dataSlice, question, history = [], savedPlan } = input

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const systemInstruction = `Today's date: ${todayStr}\n\n${PLAN_SYSTEM_PROMPT}`

  const serialized = serializeSlice(dataSlice)
  const analyticsSummary = buildAnalyticsSummary(dataSlice)
  const historyBlock = serializeHistory(history.slice(-10))
  const savedPlanBlock = savedPlan
    ? `\n\n--- User's saved plan (refine if asked) ---\n${savedPlan.slice(0, 2000)}\n--- End of saved plan ---`
    : ""

  const userMessage =
    `User's complete financial data:\n${serialized}` +
    `\n\n${analyticsSummary}` +
    savedPlanBlock +
    historyBlock +
    `\n\nUser's message: ${question}`

  const totalTokens = estimateTokens(systemInstruction) + estimateTokens(userMessage)

  return {
    system: systemInstruction,
    user: userMessage,
    estimatedTokens: totalTokens,
  }
}