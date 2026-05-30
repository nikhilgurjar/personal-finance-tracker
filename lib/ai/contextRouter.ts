// lib/ai/contextRouter.ts
// Pure JS/regex intent classifier. Zero API calls, zero cost.
// Classifies the user's question and returns which Firebase collections to fetch
// and how many rows to limit to, keeping prompts tight (150–800 tokens).

export type Intent =
  | "EXPENSE_QUERY"
  | "INCOME_QUERY"
  | "SIP_QUERY"
  | "GOAL_QUERY"
  | "BALANCE_QUERY"
  | "DEBT_QUERY"
  | "SAVINGS_QUERY"
  | "GENERAL"

export interface RouterResult {
  intent: Intent
  collections: string[]
  limit: number
  /** Optional keyword filters to pass down to the slice fetcher */
  filters?: Record<string, string>
}

// ─── Regex pattern bank ───────────────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: "EXPENSE_QUERY",
    patterns: [
      /\b(spend|spent|expense|expenses|cost|paid|payment|bought|purchase|shopping|bill|bills|food|dining|grocery|groceries|transport|subscription|utilities|rent|emi|loan)\b/i,
      /how much.*(month|week|today|yesterday|last)/i,
      /where.*money.*go(ing|ne)?/i,
      /budget|overspend|overbudget/i,
      /biggest.*expense|most.*expensive/i,
    ],
  },
  {
    intent: "INCOME_QUERY",
    patterns: [
      /\b(income|salary|earn(ed|ing|s)?|revenue|freelance|bonus|credited|source of income|pay(check|slip)?|wage)\b/i,
      /how much.*earn/i,
      /total.*income|income.*total/i,
      /monthly income|income.*month/i,
    ],
  },
  {
    intent: "SIP_QUERY",
    patterns: [
      /\b(sip|systematic investment|mutual fund|mf|etf|investment plan|investing|invested|portfolio|equity|zerodha|groww|coin|kuvera)\b/i,
      /how much.*invest(ing|ed|ment)?/i,
      /sip.*(active|paused|status|amount)/i,
      /return(s)?.*investment|investment.*return/i,
    ],
  },
  {
    intent: "GOAL_QUERY",
    patterns: [
      /\b(goal|target|saving for|how close|progress|reach|achieve|deadline|milestone|fund|emergency fund|vacation|laptop|vehicle|home|wedding|retirement)\b/i,
      /when.*reach|how long.*save/i,
      /goal.*(complete|progress|status)/i,
    ],
  },
  {
    intent: "BALANCE_QUERY",
    patterns: [
      /\b(balance|account|wallet|bank|hdfc|icici|sbi|axis|net worth|total money|available|liquid)\b/i,
      /how much.*have|what.*balance/i,
      /net worth|overall.*money|total.*money/i,
      /credit card|credit limit|outstanding/i,
    ],
  },
  {
    intent: "DEBT_QUERY",
    patterns: [
      /\b(lend|borrow|debt|owe|owes|repay|repayment|borrowed|lent|personal loan|payback|pay back)\b/i,
      /who.*owe|owe.*who/i,
      /lend.*borrow|borrow.*lend/i,
    ],
  },
  {
    intent: "SAVINGS_QUERY",
    patterns: [
      /\b(saving(s)?|fd|fixed deposit|ppf|provident fund|rd|recurring deposit|nps|gold|crypto|deposit)\b/i,
      /how much.*save|saved.*how much/i,
      /total.*saving|saving.*total/i,
    ],
  },
]

// ─── Collection → limit map ───────────────────────────────────────────────────

const INTENT_TO_CONTEXT: Record<Intent, { collections: string[]; limit: number }> = {
  EXPENSE_QUERY:  { collections: ["expenses"],          limit: 30 },
  INCOME_QUERY:   { collections: ["income"],            limit: 20 },
  SIP_QUERY:      { collections: ["sips"],              limit: 15 },
  GOAL_QUERY:     { collections: ["goals", "savings"],  limit: 10 },
  BALANCE_QUERY:  { collections: ["accounts"],          limit: 20 },
  DEBT_QUERY:     { collections: ["debts"],             limit: 20 },
  SAVINGS_QUERY:  { collections: ["savings"],           limit: 15 },
  GENERAL:        { collections: ["accounts", "expenses", "income"], limit: 5 },
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Classifies the user question and returns exactly which data to fetch.
 * Pure regex — no network call, no AI cost.
 */
export function classifyIntent(question: string): RouterResult {
  const q = question.trim().toLowerCase()

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(q)) {
        const ctx = INTENT_TO_CONTEXT[intent]
        return {
          intent,
          collections: ctx.collections,
          limit: ctx.limit,
        }
      }
    }
  }

  // Fallback: general overview
  const ctx = INTENT_TO_CONTEXT["GENERAL"]
  return { intent: "GENERAL", collections: ctx.collections, limit: ctx.limit }
}
