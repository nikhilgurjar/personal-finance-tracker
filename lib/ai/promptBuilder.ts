// lib/ai/promptBuilder.ts
// Assembles a tight system + user prompt based on the classified intent.
// Each intent gets a specific instruction block — not a generic "finance assistant" blob.
// Target: 150–800 tokens total.

import type { Intent } from "./contextRouter"

interface PromptInput {
  intent: Intent
  dataSlice: Record<string, any[]>
  question: string
}

interface BuiltPrompt {
  system: string
  user: string
  estimatedTokens: number
}

// ─── Per-intent system instruction blocks ────────────────────────────────────

const SYSTEM_BLOCKS: Record<Intent, string> = {
  EXPENSE_QUERY: `You are a concise personal finance analyst. The user is asking about their expenses.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Group by category when helpful, show totals.
- Highlight the top 3 expense categories if relevant.
- Keep your answer under 150 words.
- If data is missing or empty, say so clearly.`,

  INCOME_QUERY: `You are a concise personal finance analyst. The user is asking about their income.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Distinguish between one-time and recurring income.
- Show monthly total if asked.
- Keep your answer under 120 words.
- If data is missing, say so clearly.`,

  SIP_QUERY: `You are a concise investment assistant specializing in SIPs (Systematic Investment Plans).
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Show active SIPs, monthly commitment, and total invested.
- Mention the investment type (MF, ETF, Gold, etc.).
- Keep your answer under 150 words.
- Do not give investment advice. Stick to the data.`,

  GOAL_QUERY: `You are a concise personal finance coach helping track savings goals.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Show progress as a percentage and absolute amount (saved / target).
- If deadline is available, mention if the user is on track.
- Keep your answer under 150 words.`,

  BALANCE_QUERY: `You are a concise personal finance assistant providing account balance summaries.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- List each account with its balance and type.
- Show net worth (total assets minus credit card balances).
- Keep your answer under 100 words.`,

  DEBT_QUERY: `You are a concise personal finance assistant for tracking lend/borrow records.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Clearly distinguish "lent" (others owe you) vs "borrowed" (you owe others).
- Show net position per person.
- Keep your answer under 120 words.`,

  SAVINGS_QUERY: `You are a concise personal finance assistant specializing in savings instruments.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Distinguish FD, MF, PPF, Stocks, RD, NPS, Gold, Crypto.
- Show total savings amount.
- Keep your answer under 120 words.`,

  GENERAL: `You are Finio, a concise personal finance assistant for an Indian user.
Rules:
- Use ₹ (Indian Rupees) for all amounts.
- Give a brief overview based on the provided data.
- Be friendly, professional, and specific.
- Keep your answer under 200 words.
- Do not make up numbers not in the provided data.`,
}

// ─── Data serializer — keeps JSON compact ────────────────────────────────────

function serializeSlice(dataSlice: Record<string, any[]>): string {
  const parts: string[] = []

  for (const [col, rows] of Object.entries(dataSlice)) {
    if (rows.length === 0) {
      parts.push(`[${col.toUpperCase()}]: No data available.`)
      continue
    }

    // Strip verbose/internal fields to save tokens
    const cleaned = rows.map((r) => {
      const out: Record<string, any> = {}
      const skip = ["id", "linkedGoals", "savings_ids", "savings_allocations", "photoURL"]
      for (const [k, v] of Object.entries(r)) {
        if (!skip.includes(k) && v !== undefined && v !== null && v !== "") {
          out[k] = v
        }
      }
      return out
    })

    parts.push(`[${col.toUpperCase()}] (${rows.length} records):\n${JSON.stringify(cleaned, null, 0)}`)
  }

  return parts.join("\n\n")
}

// ─── Token estimator (rough: 1 token ≈ 4 chars) ──────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds the final system + user prompt from the classified intent and data slice.
 * Keeps total tokens between 150–800.
 */
export function buildPrompt(input: PromptInput): BuiltPrompt {
  const { intent, dataSlice, question } = input

  const systemInstruction = SYSTEM_BLOCKS[intent] ?? SYSTEM_BLOCKS.GENERAL

  const serialized = serializeSlice(dataSlice)

  // If serialized data is too long, truncate gracefully
  const MAX_DATA_CHARS = 2400 // ~600 tokens
  const truncated =
    serialized.length > MAX_DATA_CHARS
      ? serialized.slice(0, MAX_DATA_CHARS) + "\n...[data truncated for brevity]"
      : serialized

  const userMessage = `User's financial data:\n${truncated}\n\nUser's question: ${question}`

  const totalTokens = estimateTokens(systemInstruction) + estimateTokens(userMessage)

  return {
    system: systemInstruction,
    user: userMessage,
    estimatedTokens: totalTokens,
  }
}
