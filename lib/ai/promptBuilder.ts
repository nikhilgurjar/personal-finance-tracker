// lib/ai/promptBuilder.ts
// Assembles a tight system + user prompt based on the classified intent.
// v2: today's date injected, tabular data format, safe per-collection truncation,
//     conversation history support, improved token estimator.

import type { Intent } from "./contextRouter"

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
- Use ₹ (Indian Rupees).
- Show category-wise breakdown and top expenses.
- Do NOT provide advice or suggestions. Keep it strictly to the data.
- Keep response under 80 words.`,

  INCOME_QUERY: `You are an extremely concise personal finance analyst.
Rules:
- Use ₹ (Indian Rupees).
- List income sources and totals.
- Keep response under 60 words.`,

  SIP_QUERY: `You are an extremely concise SIP tracking assistant.
Rules:
- Use ₹ (Indian Rupees).
- List active SIPs and totals. No investment advice.
- Keep response under 80 words.`,

  GOAL_QUERY: `You are an extremely concise savings goals tracker.
Rules:
- Use ₹ (Indian Rupees).
- List each goal with progress (saved / target and %).
- Mention which savings/mutual funds are allocated to it and their amounts if the data shows these links.
- Keep response under 100 words.`,

  BALANCE_QUERY: `You are an extremely concise account balance tracker.
Rules:
- Use ₹ (Indian Rupees).
- List accounts and compute net worth.
- Keep response under 60 words.`,

  DEBT_QUERY: `You are an extremely concise lend/borrow tracker.
Rules:
- Use ₹ (Indian Rupees).
- IMPORTANT: Group and display net positions strictly using the "personName" field. Do NOT use the "note" or description content as the person's name.
- Report net position per person: (lent - repayments received) or (borrowed - repayments made).
- Keep response under 70 words.`,

  SAVINGS_QUERY: `You are an extremely concise savings assistant.
Rules:
- Use ₹ (Indian Rupees).
- List savings instruments and totals.
- Keep response under 70 words.`,

  GENERAL: `You are Finio, an extremely concise personal finance assistant.
Rules:
- Use ₹ (Indian Rupees).
- Answer direct questions without chatty filler.
- Keep response under 90 words.`,
}

// ─── Fields to strip from every row (saves tokens, not useful to the model) ──

const SKIP_FIELDS = new Set([
  "photoURL",
  "userId",
  "createdAt",
  "updatedAt",
  "__typename",
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
  maxTotalChars = 2800
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
    `Global Rules:\n` +
    `- Be extremely direct, concise, and professional. Do NOT include greetings (like "Namaste!"), conversational filler, or intro/outro sentences.\n` +
    `- Stick strictly to facts in the provided data. Do NOT provide unsolicited suggestions, warnings, or financial advice unless specifically requested.\n\n` +
    (SYSTEM_BLOCKS[intent] ?? SYSTEM_BLOCKS.GENERAL)

  const serialized = serializeSlice(dataSlice)
  const historyBlock = serializeHistory(history.slice(-6)) // last 3 turns (6 messages)

  const userMessage =
    `User's financial data:\n${serialized}` +
    historyBlock +
    `\n\nUser's question: ${question}`

  const totalTokens = estimateTokens(systemInstruction) + estimateTokens(userMessage)

  return {
    system: systemInstruction,
    user: userMessage,
    estimatedTokens: totalTokens,
  }
}