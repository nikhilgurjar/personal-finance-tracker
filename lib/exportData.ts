// lib/exportData.ts
// Client-side CSV export for: goals, savings, debts, SIP schedule, income.
// Produces a single CSV file with labelled sections — no external dependencies.

import type { Goal, Saving, DebtTransaction, SIPSchedule, Income, SavingAllocation } from "@/hooks/use-finance-data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  // Wrap in quotes if it contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCsv).join(",")
}

function sectionHeader(title: string): string {
  return `\n${title}\n`
}

function fmt(n: number): string {
  // Round to nearest rupee, no decimals — keeps the CSV readable.
  return String(Math.round(n))
}

function pct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return "0%"
  return `${Math.round((numerator / denominator) * 100)}%`
}

/** Whole + fractional months between now and a YYYY-MM-DD deadline. Null if no/invalid deadline. */
function monthsUntil(now: Date, deadline?: string): number | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  const msPerDay = 1000 * 60 * 60 * 24
  const days = (d.getTime() - now.getTime()) / msPerDay
  return days / 30.44
}

// ─── Shared goal math (used by both the Summary and Goals sections) ──────────

interface GoalMetric {
  goal: Goal
  backingAmount: number
  totalProgress: number
  progressPct: number
  remaining: number
  monthsRemaining: number | null // null = no deadline set
  requiredMonthly: number | null // null = achieved, overdue, or no deadline
  status: "Achieved" | "Overdue" | "No Deadline" | "On Track" | "Tight"
  linkedSavingsNames: string
}

/**
 * Computes progress, pacing, and required-savings-rate for every goal.
 * `monthlySurplus` (income minus active SIPs) is used only to flag a goal
 * "Tight" vs "On Track" — it's a per-goal heuristic and doesn't account for
 * multiple goals competing for the same surplus (see the aggregate total
 * in the Summary section for that).
 */
function computeGoalMetrics(goals: Goal[], savings: Saving[], now: Date, monthlySurplus: number): GoalMetric[] {
  return goals.map((g) => {
    const allocations: SavingAllocation[] = g.savings_allocations && g.savings_allocations.length > 0
      ? g.savings_allocations
      : (g.savings_ids || []).map((id) => ({ id, amount: 0 }))

    const allocationIds = new Set(allocations.map((a) => a.id))

    // Also include savings that link back via linkedGoals
    const fallback = savings
      .filter((s) => s.linkedGoals?.includes(g.id) && !allocationIds.has(s.id))
      .map((s) => ({ id: s.id, amount: 0 }))

    const combined = [...allocations, ...fallback]
    const backingAmount = combined.reduce((sum, alloc) => {
      const saving = savings.find((s) => s.id === alloc.id)
      if (!saving) return sum
      const amount = alloc.amount > 0 ? alloc.amount : saving.amount
      return sum + Number(amount || 0)
    }, 0)

    const linkedSavingsNames = combined
      .map((alloc) => savings.find((s) => s.id === alloc.id)?.name ?? "")
      .filter(Boolean)
      .join("; ")

    const totalProgress = Number(g.current || 0) + backingAmount
    const progressPctNum = g.target > 0 ? (totalProgress / g.target) * 100 : 0
    const remaining = Math.max(0, g.target - totalProgress)
    const monthsRemaining = monthsUntil(now, g.deadline)

    let status: GoalMetric["status"]
    let requiredMonthly: number | null = null

    if (remaining <= 0) {
      status = "Achieved"
    } else if (monthsRemaining === null) {
      status = "No Deadline"
    } else if (monthsRemaining <= 0) {
      status = "Overdue"
    } else {
      requiredMonthly = remaining / monthsRemaining
      status = requiredMonthly <= monthlySurplus ? "On Track" : "Tight"
    }

    return {
      goal: g,
      backingAmount,
      totalProgress,
      progressPct: progressPctNum,
      remaining,
      monthsRemaining,
      requiredMonthly,
      status,
      linkedSavingsNames,
    }
  })
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildSummarySection(
  goalMetrics: GoalMetric[],
  savings: Saving[],
  debts: DebtTransaction[],
  monthlyIncome: number,
  monthlySIP: number,
): string {
  const lines: string[] = [sectionHeader("=== SUMMARY / ANALYTICS ===")]

  // Savings & goals
  const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const totalGoalTarget = goalMetrics.reduce((sum, m) => sum + Number(m.goal.target || 0), 0)
  const totalGoalProgress = goalMetrics.reduce((sum, m) => sum + m.totalProgress, 0)

  // Debts: recompute net positions to get receivable/payable totals
  const persons = new Map<string, number>()
  for (const d of debts) {
    const prev = persons.get(d.personName) ?? 0
    if (d.type === "lent" || d.type === "borrowed_repayment") {
      persons.set(d.personName, prev + d.amount)
    } else if (d.type === "borrowed" || d.type === "lent_repayment") {
      persons.set(d.personName, prev - d.amount)
    }
  }
  let totalReceivable = 0
  let totalPayable = 0
  for (const net of persons.values()) {
    if (net > 0) totalReceivable += net
    else totalPayable += -net
  }
  const netDebtPosition = totalReceivable - totalPayable

  // Net worth = all savings + any goal "current cash" + net debt position (receivables are assets, payables are liabilities)
  const totalGoalCurrentCash = goalMetrics.reduce((sum, m) => sum + Number(m.goal.current || 0), 0)
  const netWorth = totalSavings + totalGoalCurrentCash + netDebtPosition

  // Cash flow
  const monthlySurplus = monthlyIncome - monthlySIP
  const totalRequiredMonthlyForGoals = goalMetrics.reduce(
    (sum, m) => sum + (m.requiredMonthly ?? 0),
    0,
  )
  const surplusAfterGoals = monthlySurplus - totalRequiredMonthlyForGoals

  const activeGoalCount = goalMetrics.filter((m) => m.status !== "Achieved").length
  const overdueGoalCount = goalMetrics.filter((m) => m.status === "Overdue").length
  const tightGoalCount = goalMetrics.filter((m) => m.status === "Tight").length

  lines.push(rowToCsv(["Metric", "Value (₹)", "Notes"]))
  lines.push(rowToCsv(["Net Worth", fmt(netWorth), "Savings + goal cash + net debt position"]))
  lines.push(rowToCsv(["Total Savings (all accounts)", fmt(totalSavings), `${savings.length} instruments`]))
  lines.push(rowToCsv(["Total Goal Target", fmt(totalGoalTarget), `${goalMetrics.length} goals`]))
  lines.push(rowToCsv(["Total Goal Progress", fmt(totalGoalProgress), pct(totalGoalProgress, totalGoalTarget) + " of target"]))
  lines.push(rowToCsv(["Total Receivable (owed to you)", fmt(totalReceivable), ""]))
  lines.push(rowToCsv(["Total Payable (you owe)", fmt(totalPayable), ""]))
  lines.push(rowToCsv(["Net Debt Position", fmt(netDebtPosition), "Positive = net lender"]))
  lines.push("")
  lines.push(rowToCsv(["Monthly Income", fmt(monthlyIncome), ""]))
  lines.push(rowToCsv(["Monthly Active SIP Commitment", fmt(monthlySIP), ""]))
  lines.push(rowToCsv(["Monthly Surplus (Income − SIP)", fmt(monthlySurplus), ""]))
  lines.push(rowToCsv(["Required Monthly Across All Active Goals", fmt(totalRequiredMonthlyForGoals), `to hit every deadline on time`]))
  lines.push(rowToCsv(["Surplus After Goal Savings", fmt(surplusAfterGoals), surplusAfterGoals < 0 ? "⚠ Deficit — goals compete for the same surplus" : "Healthy"]))
  lines.push("")
  lines.push(rowToCsv(["Active Goals", activeGoalCount, ""]))
  lines.push(rowToCsv(["Overdue Goals", overdueGoalCount, overdueGoalCount > 0 ? "⚠ past deadline, not yet funded" : ""]))
  lines.push(rowToCsv(["Tight Goals", tightGoalCount, "required pace exceeds current surplus"]))

  return lines.join("\n")
}

function buildAssetAllocationSection(savings: Saving[]): string {
  const lines: string[] = [sectionHeader("=== ASSET ALLOCATION ===")]

  const total = savings.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  const byType = new Map<string, number>()
  const byOwner = new Map<string, number>()
  for (const s of savings) {
    byType.set(s.type, (byType.get(s.type) ?? 0) + Number(s.amount || 0))
    const owner = s.owner || "Unspecified"
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + Number(s.amount || 0))
  }

  lines.push("By Instrument Type")
  lines.push(rowToCsv(["Type", "Amount (₹)", "% of Total"]))
  for (const [type, amount] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(rowToCsv([type, fmt(amount), pct(amount, total)]))
  }

  lines.push("")
  lines.push("By Owner")
  lines.push(rowToCsv(["Owner", "Amount (₹)", "% of Total"]))
  for (const [owner, amount] of [...byOwner.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(rowToCsv([owner, fmt(amount), pct(amount, total)]))
  }

  lines.push("")
  lines.push(rowToCsv(["", "Total Savings (₹)", fmt(total)]))

  return lines.join("\n")
}

function buildGoalsSection(goalMetrics: GoalMetric[]): string {
  const lines: string[] = [
    sectionHeader("=== GOALS ==="),
    rowToCsv([
      "Name", "Category", "Target (₹)", "Current Cash (₹)", "Savings Backing (₹)",
      "Total Progress (₹)", "Progress %", "Deadline", "Months Remaining",
      "Required Monthly (₹)", "Status", "Linked Savings",
    ]),
  ]

  for (const m of goalMetrics) {
    lines.push(rowToCsv([
      m.goal.name,
      m.goal.category || "",
      m.goal.target,
      m.goal.current,
      fmt(m.backingAmount),
      fmt(m.totalProgress),
      `${Math.round(m.progressPct)}%`,
      m.goal.deadline || "",
      m.monthsRemaining !== null ? m.monthsRemaining.toFixed(1) : "",
      m.requiredMonthly !== null ? fmt(m.requiredMonthly) : "",
      m.status,
      m.linkedSavingsNames,
    ]))
  }

  return lines.join("\n")
}

function buildSavingsSection(savings: Saving[], goals: Goal[]): string {
  const lines: string[] = [
    sectionHeader("=== SAVINGS ==="),
    rowToCsv(["Name", "Owner", "Type", "App/Platform", "Provider", "Amount (₹)", "Frequency", "Active", "Linked Goals"]),
  ]

  for (const s of savings) {
    // A saving can back multiple goals (linkedGoals) and a goal can draw from
    // multiple savings — resolve every linked id to its goal name here,
    // falling back to the raw id if the goal was deleted/not found.
    const linkedGoalNames = (s.linkedGoals || [])
      .map((goalId) => goals.find((g) => g.id === goalId)?.name ?? goalId)
      .join("; ")

    lines.push(rowToCsv([
      s.name,
      s.owner || "",
      s.type,
      s.app,
      s.provider,
      s.amount,
      s.frequency || "",
      s.active ? "Yes" : "No",
      linkedGoalNames,
    ]))
  }

  return lines.join("\n")
}

function buildDebtsSection(debts: DebtTransaction[]): string {
  const lines: string[] = [
    sectionHeader("=== DEBTS / LEND-BORROW ==="),
    rowToCsv(["Person", "Type", "Amount (₹)", "Date", "Note"]),
  ]

  for (const d of debts) {
    lines.push(rowToCsv([
      d.personName,
      d.type,
      d.amount,
      d.date,
      d.note || "",
    ]))
  }

  // Net positions summary
  const persons = new Map<string, number>()
  for (const d of debts) {
    const prev = persons.get(d.personName) ?? 0
    if (d.type === "lent" || d.type === "borrowed_repayment") {
      // Money out from your pocket (+receivable)
      persons.set(d.personName, prev + d.amount)
    } else if (d.type === "borrowed" || d.type === "lent_repayment") {
      // Money in, reducing what they owe you
      persons.set(d.personName, prev - d.amount)
    }
  }

  // Compute net: positive = they owe you, negative = you owe them
  const netLines: string[] = [
    "",
    "Net Positions (positive = they owe you; negative = you owe them)",
    rowToCsv(["Person", "Net Amount (₹)"]),
  ]
  for (const [person, net] of [...persons.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
    netLines.push(rowToCsv([person, net]))
  }

  const totalReceivable = [...persons.values()].filter((n) => n > 0).reduce((s, n) => s + n, 0)
  const totalPayable = [...persons.values()].filter((n) => n < 0).reduce((s, n) => s - n, 0)
  netLines.push("")
  netLines.push(rowToCsv(["", "Total Receivable (₹)", fmt(totalReceivable), "", "Total Payable (₹)", fmt(totalPayable)]))
  netLines.push(rowToCsv(["", "Net Position (₹)", fmt(totalReceivable - totalPayable)]))

  return lines.join("\n") + "\n" + netLines.join("\n")
}

function buildSIPSection(sips: SIPSchedule[], monthlyIncome: number): string {
  const lines: string[] = [
    sectionHeader("=== SIP SCHEDULE ==="),
    rowToCsv(["Name", "Investment Type", "Amount (₹/period)", "Frequency", "Start Date", "End Date", "Status", "Total Invested (₹)", "Linked Goal", "App", "Account", "Note"]),
  ]

  for (const s of sips) {
    lines.push(rowToCsv([
      s.name,
      s.investmentType,
      s.amount,
      s.frequency,
      s.startDate,
      s.endDate || "",
      s.sipStatus,
      s.totalInvested || 0,
      s.linkedGoal || "",
      s.app,
      s.account,
      s.note || "",
    ]))
  }

  // Summary
  const active = sips.filter((s) => s.sipStatus === "active")
  const totalMonthly = active.reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const totalInvested = sips.reduce((sum, s) => sum + Number(s.totalInvested || 0), 0)

  lines.push("")
  lines.push(rowToCsv(["", "Active SIPs Monthly Total (₹)", totalMonthly, "", "Cumulative Invested (₹)", totalInvested]))
  lines.push(rowToCsv(["", "SIP as % of Monthly Income", pct(totalMonthly, monthlyIncome)]))

  return lines.join("\n")
}

function buildIncomeSection(income: Income[]): string {
  const lines: string[] = [
    sectionHeader("=== INCOME ==="),
    rowToCsv(["Source", "Amount (₹)", "Frequency", "Date", "Account", "Note"]),
  ]

  for (const i of income) {
    lines.push(rowToCsv([
      i.source,
      i.amount,
      i.frequency,
      i.date,
      i.account,
      i.note || "",
    ]))
  }

  const monthlyTotal = income
    .filter((i) => String(i.frequency || "").toLowerCase() === "monthly")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const total = income.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  lines.push("")
  lines.push(rowToCsv(["", "Monthly Income Total (₹)", monthlyTotal, "", "All Income Total (₹)", total]))

  return lines.join("\n")
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ExportDataInput {
  goals: Goal[]
  savings: Saving[]
  debts: DebtTransaction[]
  sips: SIPSchedule[]
  income: Income[]
}

/**
 * Builds a single CSV string containing the summary dashboard plus all
 * underlying data sections.
 */
export function buildExportCsv(data: ExportDataInput): string {
  const now = new Date()
  const generatedAt = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const header = `Finio Finance Data Export\nGenerated: ${generatedAt}\n`

  // Shared totals computed once, reused across sections.
  const monthlyIncome = data.income
    .filter((i) => String(i.frequency || "").toLowerCase() === "monthly")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const monthlySIP = data.sips
    .filter((s) => s.sipStatus === "active")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const monthlySurplus = monthlyIncome - monthlySIP

  const goalMetrics = computeGoalMetrics(data.goals, data.savings, now, monthlySurplus)

  return [
    header,
    buildSummarySection(goalMetrics, data.savings, data.debts, monthlyIncome, monthlySIP),
    buildGoalsSection(goalMetrics),
    buildAssetAllocationSection(data.savings),
    buildSavingsSection(data.savings, data.goals),
    buildDebtsSection(data.debts),
    buildSIPSection(data.sips, monthlyIncome),
    buildIncomeSection(data.income),
  ].join("\n")
}

/**
 * Triggers a browser file download of the CSV.
 */
export function downloadCsv(csv: string, filename = "finio_export.csv"): void {
  // UTF-8 BOM ensures Excel opens with correct encoding
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}