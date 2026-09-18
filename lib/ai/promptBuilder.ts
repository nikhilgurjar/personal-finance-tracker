// lib/ai/promptBuilder.ts
// Assembles a tight system + user prompt based on the classified intent.
// v3: today's date injected, tabular data format, safe per-collection truncation,
//     conversation history support, improved token estimator.
//     Pre-computed analytics injected for financial accuracy (SIP totals, surplus, goals).

import type { Intent } from "./contextRouter"
import { getGoalBackingAmount } from "./goalUtils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoryMessage {
  role: "user" | "assistant"
  content: string
}

interface PromptInput {
  intent: Intent
  dataSlice: Record<string, any[]>
  question: string
  timeFilterLabel?: string   // e.g. "this month" — injected into system prompt
  history?: HistoryMessage[] // last N conversation turns for follow-up support
}

interface BuiltPrompt {
  system: string
  user: string
  estimatedTokens: number
}

// ─── Per-intent system instruction blocks ────────────────────────────────────

const SYSTEM_BLOCKS: Record<Intent, string> = {
  EXPENSE_QUERY: `You are an extremely concise personal finance analyst.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting (e.g. ₹1,20,000).
- Show category-wise breakdown and top expenses.
- Do NOT provide advice or suggestions. Keep it strictly to the data.
- Keep response under 80 words.`,

  INCOME_QUERY: `You are an extremely concise personal finance analyst.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- List income sources and totals. Use pre-computed analytics if provided.
- Keep response under 60 words.`,

  SIP_QUERY: `You are an extremely concise SIP tracking assistant.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- ALWAYS use the pre-computed SIP totals from the PRE-COMPUTED ANALYTICS section if present — do NOT recalculate from the raw table.
- List active SIPs and totals. No investment advice.
- Use tabular format when listing multiple SIPs.
- Keep response under 100 words.`,

  GOAL_QUERY: `You are a savings goals tracker.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- List EVERY goal with progress (saved / target and %). Use pre-computed values if provided.
- Present in a table: | Goal | Progress % | Backed (₹) | Target (₹) | Remaining (₹) | Deadline |
- Do NOT truncate or omit any goals — show all of them.
- Mention which savings are allocated to each goal if data shows links.`,

  BALANCE_QUERY: `You are an extremely concise account balance tracker.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- List accounts and compute net worth.
- Keep response under 60 words.`,

  DEBT_QUERY: `You are an extremely concise lend/borrow tracker.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- IMPORTANT: Group and display net positions strictly using the "personName" field. Do NOT use the "note" or description content as the person's name.
- Report net position per person: (lent - repayments received) or (borrowed - repayments made).
- Use a table format showing: Person | Lent | Borrowed | Net.
- Keep response under 90 words.`,

  SAVINGS_QUERY: `You are an extremely concise savings assistant.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting.
- List savings instruments and totals.
- Keep response under 70 words.`,

  GENERAL: `You are Finio, a concise personal finance assistant.
Rules:
- Use ₹ (Indian Rupees) with Indian comma formatting (e.g. ₹1,20,000).
- Answer direct questions without chatty filler.
- ALWAYS use the PRE-COMPUTED ANALYTICS section figures if present — never contradict those numbers.
- For affordability questions ("Can I afford X?"): use the pre-computed surplus = income − expenses − active SIPs − EMI. Show the arithmetic clearly.
- If the user asks for a list, provide the complete list without summarizing or omitting items.`,
  ADD_INCOME: "You are a transaction entry assistant.",
  ADD_EXPENSE: "You are a transaction entry assistant.",
  ADD_SAVING: "You are a savings entry assistant.",
  ADD_GOAL: "You are a goal creation assistant.",
}

// ─── Fields to strip from every row (saves tokens, not useful to the model) ──

const SKIP_FIELDS = new Set([
  "photoURL",
  "userId",
  "createdAt",
  "updatedAt",
  "__typename",
  "id",
])

// ─── Data serializer ──────────────────────────────────────────────────────────

/**
 * Converts a data slice into a compact tabular text format.
 * Tabular format is significantly easier for LLMs to parse than raw JSON blobs,
 * and uses ~30% fewer tokens for the same data.
 */
function serializeCollection(collectionName: string, rows: any[]): string {
  if (rows.length === 0) {
    return `[${collectionName.toUpperCase()}]: No records found.`
  }

  // Gather all keys from all rows (union), excluding skipped fields
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
    keys.map((k) => {
      const v = row[k]
      if (v === undefined || v === null || v === "") return "-"
      // Flatten Firestore Timestamp objects to ISO string
      if (typeof v === "object" && "seconds" in v) {
        return new Date(v.seconds * 1000).toISOString().slice(0, 10)
      }
      if (typeof v === "object") return JSON.stringify(v)
      return String(v)
    }).join(" | ")
  )

  return `[${collectionName.toUpperCase()}] — ${rows.length} record(s):\n${header}\n${rowLines.join("\n")}`
}

/**
 * Safe truncation: if a single collection exceeds its budget, reduce its rows
 * rather than cutting mid-table or mid-JSON.
 */
function serializeSlice(
  dataSlice: Record<string, any[]>,
  maxTotalChars = 6000
): string {
  const collectionNames = Object.keys(dataSlice)
  if (collectionNames.length === 0) return "No data available."

  const charBudgetPerCollection = Math.floor(maxTotalChars / collectionNames.length)
  const parts: string[] = []

  for (const col of collectionNames) {
    let rows = dataSlice[col]
    let serialized = serializeCollection(col, rows)

    // If over budget: reduce row count until it fits (minimum 3 rows)
    while (serialized.length > charBudgetPerCollection && rows.length > 3) {
      rows = rows.slice(0, Math.max(3, Math.floor(rows.length * 0.7)))
      serialized = serializeCollection(col, rows) + "\n...[additional rows omitted for brevity]"
    }

    parts.push(serialized)
  }

  return parts.join("\n\n")
}

// ─── Token estimator ──────────────────────────────────────────────────────────

/** ~3.5 chars per token is closer to reality than the old 4.0 estimate */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

// ─── History serializer ───────────────────────────────────────────────────────

function serializeHistory(history: HistoryMessage[]): string {
  if (!history.length) return ""
  const lines = history.map(
    (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 300)}`
  )
  return `\n\n--- Conversation history (most recent last) ---\n${lines.join("\n")}\n--- End of history ---`
}

// ─── Pre-computed analytics builder ──────────────────────────────────────────

/**
 * Injects pre-computed financial analytics into the prompt so weak LLMs
 * cannot re-derive incorrect numbers from raw data.
 * This mirrors the approach used in planPromptBuilder.ts.
 */
function buildFinancialAnalytics(dataSlice: Record<string, any[]>, intent: Intent): string {
  // Only inject analytics for queries where numerical accuracy is critical
  const ANALYTICS_INTENTS: Intent[] = ["GENERAL", "SIP_QUERY", "GOAL_QUERY", "INCOME_QUERY", "EXPENSE_QUERY"]
  if (!ANALYTICS_INTENTS.includes(intent)) return ""

  const goals   = dataSlice.goals   ?? []
  const savings = dataSlice.savings  ?? []
  const income  = dataSlice.income   ?? []
  const sips    = dataSlice.sips     ?? []
  const expenses = dataSlice.expenses ?? []
  const debts   = dataSlice.debts    ?? []

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`
  const num = (v: unknown) => { const p = Number(v); return Number.isFinite(p) ? p : 0 }

  // ── Income ──
  const monthlyIncome = income
    .filter((i) => String(i.frequency ?? "").toLowerCase() === "monthly")
    .reduce((s, i) => s + num(i.amount), 0)

  // ── Expenses (current month) ──
  const now = new Date()
  let tMonth = now.getMonth()
  let tYear = now.getFullYear()
  if (now.getDate() <= 10) {
    tMonth -= 1
    if (tMonth < 0) { tMonth = 11; tYear -= 1 }
  }
  const currentMonthExpenses = expenses.filter((e) => {
    const dateStr = typeof e.date === "string" ? e.date
      : e.date?.seconds ? new Date(e.date.seconds * 1000).toISOString().slice(0, 10) : ""
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d.getFullYear() === tYear && d.getMonth() === tMonth
  })
  const trackedExpenses = currentMonthExpenses.reduce((s, e) => s + num(e.amount), 0)

  // ── SIPs ──
  const activeSips = sips.filter((s) => String(s.sipStatus ?? "").toLowerCase() === "active")
  const activeSipTotal = activeSips.reduce((s, sip) => s + num(sip.amount), 0)

  // ── EMI / loan payments in debts ──
  // Detect recurring EMI: debts with "emi" or "loan" in the note
  const emiDebts = debts.filter((d) =>
    /\b(emi|loan|car|vehicle|home|bike)\b/i.test(String(d.note ?? "")) &&
    (d.type === "borrowed" || d.type === "borrowed_repayment")
  )
  const estimatedEMI = emiDebts.length > 0
    ? emiDebts.reduce((s, d) => s + num(d.amount), 0) / Math.max(1, emiDebts.length)
    : 0

  // ── Goals ──
  const goalLines = goals.map((g) => {
    const backed = getGoalBackingAmount(g, savings)
    const totalFunded = num(g.current) + backed
    const remaining = Math.max(0, num(g.target) - totalFunded)
    const pct = g.target > 0 ? Math.min(100, Math.round((totalFunded / num(g.target)) * 100)) : 0
    return `  ${g.name}: ${fmt(totalFunded)} backed of ${fmt(num(g.target))} (${pct}%). Remaining: ${fmt(remaining)}.${g.deadline ? ` Deadline: ${g.deadline}.` : ""}`
  })

  // ── Surplus ──
  const surplus = monthlyIncome - trackedExpenses - activeSipTotal

  const parts: string[] = [
    "════════════════════════════════════",
    "  PRE-COMPUTED ANALYTICS — USE THESE EXACT FIGURES",
    "════════════════════════════════════",
  ]

  if (monthlyIncome > 0 || income.length > 0) {
    parts.push(`Monthly income (recurring): ${fmt(monthlyIncome)}`)
  }

  if (expenses.length > 0) {
    parts.push(`Tracked expenses this month: ${fmt(trackedExpenses)}`)
  }

  if (sips.length > 0) {
    parts.push(`Active SIPs total: ${fmt(activeSipTotal)} (${activeSips.length} active)`)
    if (activeSips.length > 0) {
      parts.push("Active SIP breakdown:")
      activeSips.forEach((s) => parts.push(`  ${s.name ?? "SIP"}: ${fmt(num(s.amount))}/month`))
    }
  }

  if (estimatedEMI > 0) {
    parts.push(`Detected EMI/loan payments: ${fmt(estimatedEMI)} (approximate, check debt records)`)
  }

  if (monthlyIncome > 0) {
    parts.push(`Computed surplus (income − expenses − SIPs): ${fmt(surplus)}`)
    if (estimatedEMI > 0) {
      parts.push(`Surplus after EMI: ${fmt(Math.max(0, surplus - estimatedEMI))}`)
    }
  }

  if (goals.length > 0) {
    parts.push(`Goals (${goals.length} total):`)
    parts.push(...goalLines)
  }

  parts.push("════════════════════════════════════")

  return parts.filter((l) => l !== "").join("\n")
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds the final system + user prompt from the classified intent, data slice,
 * optional conversation history, and time filter context.
 */
export function buildPrompt(input: PromptInput): BuiltPrompt {
  const { intent, dataSlice, question, timeFilterLabel, history = [] } = input

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const timeNote = timeFilterLabel
    ? `\nThe user's question refers to: **${timeFilterLabel}**. Restrict your analysis to that period.`
    : ""

  const systemInstruction =
    `Today's date: ${todayStr}${timeNote}\n` +
    `- Global Rules:\n` +
    `- OUTPUT FORMAT: Return valid JSON only. No markdown, no reasoning, no chain-of-thought, no preamble.\n` +
    `- Use this exact schema: { "answer": string, "highlights": string[], "confidence": "low" | "medium" | "high" }\n` +
    `- Keep answer brief and directly rooted in the provided data.\n` +
    `- Stick strictly to facts in the provided data. Do NOT provide unsolicited suggestions, warnings, or financial advice unless specifically requested.\n` +
    `- When PRE-COMPUTED ANALYTICS are provided in the user message, use those exact numbers — never recalculate or contradict them.\n\n` +
    (SYSTEM_BLOCKS[intent] ?? SYSTEM_BLOCKS.GENERAL)

  // ── Pre-compute goal progress for weak LLMs ──
  if (intent === "GOAL_QUERY" && dataSlice.goals) {
    dataSlice.goals = dataSlice.goals.map((g) => {
      const saved = getGoalBackingAmount(g, dataSlice.savings ?? [])
      const percent = g.target > 0 ? Math.round((saved / g.target) * 100) : 0
      return {
        ...g,
        computed_saved_amount: saved,
        computed_progress_percent: `${percent}%`
      }
    })
  }

  // ── Smart Budgeting: goals + savings never get truncated ──
  let serialized: string
  if (intent === "GOAL_QUERY" || intent === "GENERAL") {
    // Give goals and savings a dedicated large budget so they are never truncated
    const goalsSavingsSlice = { goals: dataSlice.goals ?? [], savings: dataSlice.savings ?? [] }
    const otherSlice = Object.fromEntries(
      Object.entries(dataSlice).filter(([k]) => k !== "goals" && k !== "savings")
    )
    serialized = [
      serializeSlice(goalsSavingsSlice, 8000), // increased budget for goals
      serializeSlice(otherSlice, 3000),
    ].filter(Boolean).join("\n\n")
  } else {
    serialized = serializeSlice(dataSlice, 6000)
  }

  // ── Inject pre-computed analytics ──
  const analytics = buildFinancialAnalytics(dataSlice, intent)

  const historyLimit = intent === "GENERAL" ? 3 : 2
  const historyBlock = serializeHistory(history.slice(-historyLimit * 2))

  const userMessage =
    `User's financial data:\n${serialized}` +
    (analytics ? `\n\n${analytics}` : "") +
    historyBlock +
    `\n\nUser's question: ${question}\n\nReturn JSON only with keys answer, highlights, confidence.`

  const totalTokens = estimateTokens(systemInstruction) + estimateTokens(userMessage)

  return {
    system: systemInstruction,
    user: userMessage,
    estimatedTokens: totalTokens,
  }
}