// lib/ai/planPromptBuilder.ts
// Builds prompts for the AI savings & wealth plan feature.
// v3: Question mode detection — conversational questions get focused answers,
//     only explicit plan requests generate the full 12-month template.

import type { HistoryMessage } from "./promptBuilder"
import { logger } from "@/lib/logger"
import { getGoalBackingAmount } from "./goalUtils"

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
  mode: PlanQuestionMode  // exposed so the route can set isPlan correctly
}

// ─── Question mode detection ──────────────────────────────────────────────────

type PlanQuestionMode = "PLAN" | "CONVERSATIONAL"

/**
 * Determines whether the user wants a full plan generation or a specific answer.
 *
 * PLAN     → full 8-section template with 12-month roadmap
 * CONVERSATIONAL → concise, focused answer to the specific question
 *
 * If in doubt, default to CONVERSATIONAL so we never spam a 12-month plan
 * when someone just asks "what did I spend this month?".
 */
function classifyPlanQuestion(question: string): PlanQuestionMode {
  const q = question.trim()

  const PLAN_PATTERNS: RegExp[] = [
    // Explicit plan-build requests
    /\b(build|create|generate|make|give me|show me)\s+(me\s+)?(a\s+)?(full|complete|robust|comprehensive|detailed|monthly|12.month|yearly|annual)?\s*(plan|roadmap|strategy|blueprint|wealth plan)\b/i,
    /\bbuild\s+my\s+(robust\s+)?monthly\s+plan\b/i,
    // Data overview / analytics requests
    /\bread\s+all\s+my\s+data\b/i,
    /\bshow\s+(me\s+)?analytics\b/i,
    /\bshow\s+(me\s+)?(full|all|complete)\s+(overview|summary|analysis)\b/i,
    // Prioritization / risk-finding (planning-mode questions)
    /\bprioritize\s+(goals|sips|debts|investments)\b/i,
    /\bfind\s+(risks|gaps|issues)\b/i,
    /\b(what'?s?\s+(my\s+)?overall|give\s+me\s+(a\s+)?overall)\b/i,
    // Explicit 12-month / planning horizon
    /\b12.month\b/i,
    /\bnext\s+(12|year|6)\s+months?\b/i,
    /\b(wealth|financial|savings)\s+(plan|roadmap|strategy|blueprint)\b/i,
    /\bhow\s+(should|can|do)\s+i\s+(allocate|plan|invest|build\s+wealth)\b/i,
  ]

  if (PLAN_PATTERNS.some((p) => p.test(q))) return "PLAN"

  // Very long, richly-described requests are usually plan requests
  if (q.length > 300 && /\b(plan|roadmap|invest|allocate|strategy)\b/i.test(q)) return "PLAN"

  return "CONVERSATIONAL"
}

// ─── System prompts ───────────────────────────────────────────────────────────

/**
 * Used ONLY for conversational questions — short, focused, data-faithful.
 * Must NOT generate the full plan template.
 */
const CONVERSATIONAL_SYSTEM_PROMPT = `You are Finio Wealth Coach — a direct, data-driven personal finance assistant for Indian users.

⚡ CORE INSTRUCTION: Answer ONLY the user's specific question. Do NOT generate a full financial plan or section headers unless explicitly asked.

Rules:
- OUTPUT FORMAT: Provide the final answer IMMEDIATELY. Do NOT output any internal thinking, reasoning, scratchpad, or meta-commentary before your answer.
- Use ₹ with Indian comma formatting (e.g. ₹1,55,000)
- Be concise but complete. If asked to list items (like goals, debts, or sips), list ALL of them. Do not summarize or omit items to save space.
- ALWAYS use the PRE-COMPUTED ANALYTICS section if present — never contradict those numbers or recalculate them yourself.
- No greetings, no preamble, no "Here is your progress...". 
- Start directly with the data.

How to handle specific question types:
- "What are my expenses [period]?" → Category breakdown with ₹ amounts + total.
- "Can I afford X more expense?" → Use pre-computed surplus from analytics: income − expenses − active SIPs = surplus (EMI already factored if shown). Answer yes/no with the arithmetic shown in bullet points.
- "Where should I cut expenses?" → List the top 3 categories by amount. Name the single biggest lever.
- "How to increase savings?" → Identify the single clearest opportunity from the data. One concrete recommendation with a ₹ number.
- "What's my savings rate / surplus?" → Single calculation shown clearly using pre-computed figures.
- Goal progress questions → Present in a table: | Goal | Progress % | Backed (₹) | Target (₹) | Remaining (₹) | Deadline |. Use pre-computed values.
- If no relevant data exists for the question, say so in one sentence and suggest what to add.`

/**
 * Used for explicit plan requests — full 8-section template.
 */
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
Present a month-by-month roadmap for the next 12 months using a clear Markdown table.
Columns should include: | Month | Focus Area | Surplus Allocation (Debt, Goals, etc.) | Milestones Hit |
Show exactly how the surplus is used each month. Keep it clear, realistic, and specific to the data.

═══════════════════════════════════════════════════════
§ STYLE
═══════════════════════════════════════════════════════
- Use ₹ with Indian comma formatting: ₹1,55,910 not ₹155910
- Prefer tables and bullets over paragraphs
- Be direct — say "do X" not "you might consider X"
- Flag real risks: low emergency fund, under-tracked expenses, 0% goal with deadline, CRITICAL debt
- Keep under 1000 words unless user asks for more detail
- If clarification is truly needed, ask at most 2 questions and proceed with stated assumptions`

// ─── Data serializers (unchanged from v2) ─────────────────────────────────────

const SKIP_FIELDS = new Set([
  "photoURL",
  "userId",
  "createdAt",
  "updatedAt",
  "__typename",
  "id",
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

function serializeSlice(dataSlice: Record<string, any[]>, maxTotalChars = 10000): string {
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

// ─── Analytics summary (only used for PLAN mode) ─────────────────────────────

function buildAnalyticsSummary(dataSlice: Record<string, any[]>): string {
  const goals = dataSlice.goals ?? []
  const savings = dataSlice.savings ?? []
  const expenses = dataSlice.expenses ?? []
  const income = dataSlice.income ?? []
  const sips = dataSlice.sips ?? []
  const debts = dataSlice.debts ?? []

  const monthlyIncome = income
    .filter((i) => String(i.frequency ?? "").toLowerCase() === "monthly")
    .reduce((s, i) => s + num(i.amount), 0)

  const otherIncome = income
    .filter((i) => String(i.frequency ?? "").toLowerCase() !== "monthly")
    .reduce((s, i) => s + num(i.amount), 0)

  const nowForExpenses = new Date();
  let targetMonth = nowForExpenses.getMonth();
  let targetYear = nowForExpenses.getFullYear();
  if (nowForExpenses.getDate() <= 10) {
    targetMonth -= 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
  }

  const currentMonthExpenses = expenses.filter((e) => {
    const dateStr = typeof e.date === 'string' ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000).toISOString().slice(0, 10) : '');
    if (!dateStr) return false;
    const expenseDate = new Date(dateStr);
    return expenseDate.getFullYear() === targetYear && expenseDate.getMonth() === targetMonth;
  })

  const trackedExpenses = currentMonthExpenses.reduce((s, e) => s + num(e.amount), 0)

  const expenseByCat = currentMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    const cat = String(e.category ?? "uncategorized")
    acc[cat] = (acc[cat] ?? 0) + num(e.amount)
    return acc
  }, {})
  const sortedExpenseCats = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1])
  const topExpense = sortedExpenseCats[0]

  const monthlyExpenseTrend: Record<string, number> = {}
  for (const e of expenses) {
    const dateStr =
      typeof e.date === "string"
        ? e.date
        : e.date?.seconds
        ? new Date(e.date.seconds * 1000).toISOString().slice(0, 7)
        : ""
    const monthKey = dateStr.slice(0, 7)
    if (monthKey) {
      monthlyExpenseTrend[monthKey] = (monthlyExpenseTrend[monthKey] ?? 0) + num(e.amount)
    }
  }

  const activeSips = sips.filter((s) => String(s.sipStatus ?? "").toLowerCase() === "active")
  const activeSipAmount = activeSips.reduce((s, sip) => s + num(sip.amount), 0)

  const lent = debts.filter((d) => d.type === "lent").reduce((s, d) => s + num(d.amount), 0)
  const lentRepaid = debts
    .filter((d) => d.type === "lent_repayment")
    .reduce((s, d) => s + num(d.amount), 0)
  const borrowed = debts
    .filter((d) => d.type === "borrowed")
    .reduce((s, d) => s + num(d.amount), 0)
  const borrowedRepaid = debts
    .filter((d) => d.type === "borrowed_repayment")
    .reduce((s, d) => s + num(d.amount), 0)
  const receivable = Math.max(0, lent - lentRepaid)
  const payable = Math.max(0, borrowed - borrowedRepaid)
  const debtUrgency =
    payable > 100000 ? "CRITICAL" : payable > 30000 ? "HIGH" : payable > 0 ? "MODERATE" : "NONE"

  const totalSavings = savings.reduce((s, sv) => s + num(sv.amount), 0)

  const monthlySurplus = monthlyIncome - trackedExpenses - activeSipAmount
  const surplusRatio = monthlyIncome > 0 ? monthlySurplus / monthlyIncome : 0

  const allocDebt =
    debtUrgency === "CRITICAL" ? Math.min(payable, monthlySurplus * 0.4) :
    debtUrgency === "HIGH" ? Math.min(payable, monthlySurplus * 0.25) : 0
  const remainingAfterDebt = Math.max(0, monthlySurplus - allocDebt)

  const weddingGoals = goals.filter(
    (g) => /wedding|shadi|vivah|marriage|engagement/i.test(String(g.name ?? ""))
  )
  const otherGoals = goals.filter((g) => !weddingGoals.includes(g))

  const weddingTotalTarget = weddingGoals.reduce((s, g) => s + num(g.target), 0)
  const weddingTotalBacked = weddingGoals.reduce((g_sum, g) => {
    return g_sum + num(g.current) + getGoalBacking(g, savings).amount
  }, 0)
  const weddingTotalRemaining = Math.max(0, weddingTotalTarget - weddingTotalBacked)
  const weddingOverallProgress =
    weddingTotalTarget > 0 ? Math.min(100, Math.round((weddingTotalBacked / weddingTotalTarget) * 100)) : 0
  const weddingMonthsAtFullSurplus =
    remainingAfterDebt > 0 && weddingTotalRemaining > 0
      ? Math.ceil(weddingTotalRemaining / remainingAfterDebt)
      : null

  const allocWedding =
    weddingGoals.length > 0 ? Math.min(weddingTotalRemaining, remainingAfterDebt * 0.6) : 0
  const remainingAfterWedding = Math.max(0, remainingAfterDebt - allocWedding)

  const otherGoalTarget = otherGoals.reduce((s, g) => s + num(g.target), 0)
  const otherGoalBacked = otherGoals.reduce((g_sum, g) => {
    return g_sum + num(g.current) + getGoalBacking(g, savings).amount
  }, 0)
  const otherGoalRemaining = Math.max(0, otherGoalTarget - otherGoalBacked)
  const allocOtherGoals = Math.min(otherGoalRemaining, remainingAfterWedding * 0.5)
  const remainingAfterGoals = Math.max(0, remainingAfterWedding - allocOtherGoals)

  const allocSIPExpansion = Math.min(remainingAfterGoals * 0.4, 10000)
  const allocBuffer = Math.max(0, remainingAfterGoals - allocSIPExpansion)

  const totalTarget = goals.reduce((s, g) => s + num(g.target), 0)
  const totalBacked = goals.reduce((g_sum, g) => {
    return g_sum + num(g.current) + getGoalBacking(g, savings).amount
  }, 0)
  const totalRemaining = Math.max(0, totalTarget - totalBacked)
  const overallProgress =
    totalTarget > 0 ? Math.min(100, Math.round((totalBacked / totalTarget) * 100)) : 0

  const goalLines = goals.map((g) => {
    const target = num(g.target)
    const current = num(g.current)
    const { amount: backed, labels, hasInferred } = getGoalBacking(g, savings)
    const totalFunded = current + backed
    const remaining = Math.max(0, target - totalFunded)
    const progress = target > 0 ? Math.min(100, Math.round((totalFunded / target) * 100)) : 0
    const deadline = g.deadline ? String(g.deadline) : null
    const name = String(g.name ?? "Unnamed goal")
    const backingNote = labels.length > 0 ? ` (${labels.join(", ")}${hasInferred ? " — inferred" : ""})` : ""
    const fastTrack =
      remaining > 0 && monthlySurplus > 0 && remaining / monthlySurplus <= 3
        ? ` ⚡ Fast-track: ${fmt(Math.ceil(remaining / 3))}/month clears in 3 months`
        : ""

    return `  ${name}: ${fmt(totalFunded)} backed of ${fmt(target)} (${progress}%)${backingNote}. Remaining: ${fmt(remaining)}.${deadline ? ` Deadline: ${deadline}.` : ""}${fastTrack}`
  })

  return [
    "════════════════════════════════════════════════════════════════",
    "  PRE-COMPUTED ANALYTICS (USE THESE EXACT NUMBERS IN YOUR PLAN)",
    "════════════════════════════════════════════════════════════════",
    "",
    "── INCOME ──",
    `Monthly income: ${fmt(monthlyIncome)}`,
    otherIncome > 0 ? `Other/irregular income in data: ${fmt(otherIncome)}` : "",
    "",
    "── EXPENSES ──",
    `Total tracked expenses: ${fmt(trackedExpenses)}`,
    topExpense ? `Top expense category: ${topExpense[0]} — ${fmt(topExpense[1])}` : "",
    sortedExpenseCats.length > 0
      ? `All categories: ${sortedExpenseCats.map(([k, v]) => `${k} ${fmt(v)}`).join(", ")}`
      : "",
    Object.keys(monthlyExpenseTrend).length > 0
      ? `Monthly trend: ${Object.entries(monthlyExpenseTrend)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([m, v]) => `${m}: ${fmt(v)}`)
          .join(", ")}`
      : "",
    "",
    "── CASHFLOW ──",
    `Monthly surplus (income − expenses − active SIPs): ${fmt(monthlySurplus)}`,
    `Surplus as % of income: ${monthlyIncome > 0 ? Math.round(surplusRatio * 100) : 0}%`,
    surplusRatio > 0.6 ? `⚠️ HIGH SURPLUS RATIO: likely means expenses are under-tracked` : "",
    "",
    "── SIPs ──",
    `Active SIPs total: ${fmt(activeSipAmount)}`,
    activeSips.length > 0
      ? activeSips.map((s) => `  ${s.name ?? "SIP"}: ${fmt(num(s.amount))}/month`).join("\n")
      : "  No active SIPs found.",
    "",
    "── SAVINGS ──",
    `Total savings / instruments: ${fmt(totalSavings)}`,
    savings.length > 0
      ? savings.map((s) => `  ${s.name ?? "Saving"}: ${fmt(num(s.amount))}`).join("\n")
      : "  No savings records found.",
    "",
    "── DEBT ──",
    `Receivable (others owe you): ${fmt(receivable)}`,
    `Payable (you owe others): ${fmt(payable)}`,
    `Debt urgency: ${debtUrgency}`,
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

// ─── History / token helpers ──────────────────────────────────────────────────

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

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPlanPrompt(input: PlanPromptInput): BuiltPlanPrompt {
  const { dataSlice, question, history = [], savedPlan } = input

  // ── Step 1: classify the question ─────────────────────────────────────────
  const mode = classifyPlanQuestion(question)

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // ── Step 2: pick system prompt based on mode ───────────────────────────────
  const systemInstruction =
    `Today's date: ${todayStr}\n\n` +
    (mode === "PLAN" ? PLAN_SYSTEM_PROMPT : CONVERSATIONAL_SYSTEM_PROMPT)

  // ── Step 3: serialize data — more budget for plans, less for Q&A ──────────
  const dataCharBudget = mode === "PLAN" ? 10000 : 3500

  // Filter expenses for the LLM slice to prevent it from inventing rows from past months
  const nowForExpenses = new Date();
  let targetMonth = nowForExpenses.getMonth();
  let targetYear = nowForExpenses.getFullYear();
  if (nowForExpenses.getDate() <= 10) {
    targetMonth -= 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
  }

  const currentMonthExpenses = (dataSlice.expenses ?? []).filter((e) => {
    const dateStr = typeof e.date === 'string' ? e.date : (e.date?.seconds ? new Date(e.date.seconds * 1000).toISOString().slice(0, 10) : '');
    if (!dateStr) return false;
    const expenseDate = new Date(dateStr);
    return expenseDate.getFullYear() === targetYear && expenseDate.getMonth() === targetMonth;
  });

  // Pre-compute goal progress for weak LLMs
  const processedGoals = (dataSlice.goals ?? []).map((g) => {
    const saved = getGoalBackingAmount(g, dataSlice.savings ?? [])
    const percent = g.target > 0 ? Math.round((saved / g.target) * 100) : 0
    return {
      ...g,
      computed_saved_amount: saved,
      computed_progress_percent: `${percent}%`
    }
  })

  // Build the slice that goes to the LLM (current-month expenses only)
  const sliceForLLM = { ...dataSlice, expenses: currentMonthExpenses, goals: processedGoals }

  // For CONVERSATIONAL: goals+savings get a dedicated 6000-char budget so they are never truncated
  let serialized: string
  if (mode === "CONVERSATIONAL") {
    const goalsSavingsSlice = { goals: sliceForLLM.goals ?? [], savings: dataSlice.savings ?? [] }
    const otherSlice = Object.fromEntries(
      Object.entries(sliceForLLM).filter(([k]) => k !== "goals" && k !== "savings")
    )
    serialized = [
      serializeSlice(goalsSavingsSlice, 6000),
      serializeSlice(otherSlice, 3000),
    ].filter(Boolean).join("\n\n")
  } else {
    serialized = serializeSlice(sliceForLLM, dataCharBudget)
  }

  logger.info("planPromptBuilder", "serialized data slice", {
    mode,
    goals: (dataSlice.goals ?? []).length,
    savings: (dataSlice.savings ?? []).length,
    expenses_total: (dataSlice.expenses ?? []).length,
    expenses_current_month: currentMonthExpenses.length,
    income: (dataSlice.income ?? []).length,
    sips: (dataSlice.sips ?? []).length,
    accounts: (dataSlice.accounts ?? []).length,
    debts: (dataSlice.debts ?? []).length,
    serializedChars: serialized.length,
  })

  // ── Step 4: analytics summary ─────────────────────────────────────────────
  // PLAN mode: full analytics; CONVERSATIONAL mode: compact analytics for accuracy
  const analyticsSummary = buildAnalyticsSummary(dataSlice)

  // ── Step 5: saved plan context — only relevant for PLAN mode ──────────────
  const savedPlanBlock =
    savedPlan && mode === "PLAN"
      ? `\n\n--- User's saved plan (refine if asked) ---\n${savedPlan.slice(0, 2000)}\n--- End of saved plan ---`
      : ""

  const historyBlock = serializeHistory(history.slice(-10))

  const userMessage =
    `User's financial data:\n${serialized}` +
    (analyticsSummary ? `\n\n${analyticsSummary}` : "") +
    savedPlanBlock +
    historyBlock +
    `\n\nUser's message: ${question}`

  const totalTokens = estimateTokens(systemInstruction) + estimateTokens(userMessage)

  return {
    system: systemInstruction,
    user: userMessage,
    estimatedTokens: totalTokens,
    mode,
  }
}