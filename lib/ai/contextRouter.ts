// lib/ai/contextRouter.ts
// Pure JS/regex intent classifier. Zero API calls, zero cost.
// v2: multi-intent scoring, temporal filter parsing, compound question support.

export type Intent =
  | "EXPENSE_QUERY"
  | "INCOME_QUERY"
  | "SIP_QUERY"
  | "GOAL_QUERY"
  | "BALANCE_QUERY"
  | "DEBT_QUERY"
  | "SAVINGS_QUERY"
  | "GENERAL"
  // ── Write intents ──
  | "ADD_INCOME"
  | "ADD_EXPENSE"
  | "ADD_SAVING"
  | "ADD_GOAL"

export interface TimeFilter {
  start: Date
  end: Date
  label: string // e.g. "this month", "last week" — injected into prompt
}

export interface RouterResult {
  intent: Intent
  collections: string[]
  limit: number
  timeFilter?: TimeFilter
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
      /biggest.*expense|most.*expensive|top.*spend/i,
      /\b(category|categories|breakdown|split)\b.*expense/i,
      /expense.*\b(category|breakdown|summary)\b/i,
      /what.*i.*(spent|bought|paid)/i,
    ],
  },
  {
    intent: "INCOME_QUERY",
    patterns: [
      /\b(income|salary|earn(ed|ing|s)?|revenue|freelance|bonus|credited|source of income|pay(check|slip)?|wage)\b/i,
      /how much.*earn/i,
      /total.*income|income.*total/i,
      /monthly income|income.*month/i,
      /\b(credit|received|inflow)\b.*month/i,
      /how much.*came in/i,
    ],
  },
  {
    intent: "SIP_QUERY",
    patterns: [
      /\b(sip|systematic investment|mutual fund|mf|etf|investment plan|investing|invested|portfolio|equity|zerodha|groww|coin|kuvera)\b/i,
      /how much.*invest(ing|ed|ment)?/i,
      /sip.*(active|paused|status|amount)/i,
      /return(s)?.*investment|investment.*return/i,
      /\b(folio|nav|units|fund\s?house|amc)\b/i,
      /total.*invested|invested.*total/i,
    ],
  },
  {
    intent: "GOAL_QUERY",
    patterns: [
      /\b(goal|target|saving for|how close|progress|reach|achieve|deadline|milestone|fund|emergency fund|vacation|laptop|vehicle|home|wedding|retirement)\b/i,
      /when.*reach|how long.*save/i,
      /goal.*(complete|progress|status)/i,
      /\b(on track|behind|ahead)\b.*goal/i,
      /how much more.*need/i,
    ],
  },
  {
    intent: "BALANCE_QUERY",
    patterns: [
      /\b(balance|account|wallet|bank|hdfc|icici|sbi|axis|net worth|total money|available|liquid)\b/i,
      /how much.*have|what.*balance/i,
      /net worth|overall.*money|total.*money/i,
      /credit card|credit limit|outstanding/i,
      /\b(cash|funds)\b.*available/i,
      /what.*in my (account|bank|wallet)/i,
    ],
  },
  {
    intent: "DEBT_QUERY",
    patterns: [
      /\b(lend|borrow|debt|owe|owes|repay|repayment|borrowed|lent|personal loan|payback|pay back)\b/i,
      /who.*owe|owe.*who/i,
      /lend.*borrow|borrow.*lend/i,
      /\b(due|pending|clearance|settle|settlement)\b.*loan/i,
      /money.*owe(d)?|owe.*money/i,
    ],
  },
  {
    intent: "SAVINGS_QUERY",
    patterns: [
      /\b(saving(s)?|fd|fixed deposit|ppf|provident fund|rd|recurring deposit|nps|gold|crypto|deposit)\b/i,
      /how much.*save|saved.*how much/i,
      /total.*saving|saving.*total/i,
      /\b(maturity|interest rate|tenure|lock.?in)\b/i,
      /my.*fd|fd.*amount/i,
    ],
  },
]

// ─── Collection → limit map ───────────────────────────────────────────────────

const INTENT_TO_CONTEXT: Record<Intent, { collections: string[]; limit: number }> = {
  EXPENSE_QUERY:  { collections: ["expenses"],                       limit: 30 },
  INCOME_QUERY:   { collections: ["income"],                         limit: 20 },
  SIP_QUERY:      { collections: ["sips"],                           limit: 15 },
  GOAL_QUERY:     { collections: ["goals", "savings"],               limit: 10 },
  BALANCE_QUERY:  { collections: ["accounts"],                       limit: 20 },
  DEBT_QUERY:     { collections: ["debts"],                          limit: 20 },
  SAVINGS_QUERY:  { collections: ["savings"],                        limit: 15 },
  GENERAL:        { collections: ["accounts", "expenses", "income"], limit: 5  },
}

// ─── Temporal filter parser ───────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c
}
function endOfDay(d: Date): Date {
  const c = new Date(d); c.setHours(23, 59, 59, 999); return c
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function startOfWeek(d: Date): Date {
  const c = new Date(d)
  const day = c.getDay()
  c.setDate(c.getDate() - day)
  c.setHours(0, 0, 0, 0)
  return c
}
function subMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() - n, d.getDate())
}
function subDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}

export function parseTimeFilter(question: string): TimeFilter | undefined {
  const q = question.toLowerCase()
  const now = new Date()

  if (/\btoday\b/.test(q)) {
    return { start: startOfDay(now), end: endOfDay(now), label: "today" }
  }
  if (/\byesterday\b/.test(q)) {
    const y = subDays(now, 1)
    return { start: startOfDay(y), end: endOfDay(y), label: "yesterday" }
  }
  if (/\bthis\s+week\b/.test(q)) {
    return { start: startOfWeek(now), end: now, label: "this week" }
  }
  if (/\blast\s+week\b/.test(q)) {
    const weekStart = startOfWeek(now)
    const lastWeekEnd = subDays(weekStart, 1)
    const lastWeekStart = startOfWeek(lastWeekEnd)
    return { start: lastWeekStart, end: endOfDay(lastWeekEnd), label: "last week" }
  }
  if (/\bthis\s+month\b/.test(q)) {
    return { start: startOfMonth(now), end: now, label: "this month" }
  }
  if (/\blast\s+month\b/.test(q)) {
    const lm = subMonths(now, 1)
    return { start: startOfMonth(lm), end: endOfMonth(lm), label: "last month" }
  }
  if (/\blast\s+3\s+months?\b/.test(q)) {
    return { start: startOfMonth(subMonths(now, 3)), end: now, label: "last 3 months" }
  }
  if (/\blast\s+6\s+months?\b/.test(q)) {
    return { start: startOfMonth(subMonths(now, 6)), end: now, label: "last 6 months" }
  }
  if (/\bthis\s+year\b/.test(q)) {
    return { start: new Date(now.getFullYear(), 0, 1), end: now, label: "this year" }
  }
  if (/\blast\s+year\b/.test(q)) {
    const y = now.getFullYear() - 1
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999), label: "last year" }
  }
  if (/\blast\s+30\s+days?\b/.test(q)) {
    return { start: subDays(now, 30), end: now, label: "last 30 days" }
  }
  if (/\blast\s+7\s+days?\b/.test(q)) {
    return { start: subDays(now, 7), end: now, label: "last 7 days" }
  }

  return undefined
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Classifies the user question and returns exactly which data to fetch.
 * v2: scores all intents, merges collections for compound questions,
 *     and attaches an optional time filter.
 */
export function classifyIntent(question: string): RouterResult {
  const q = question.trim().toLowerCase()

  // Score every intent
  const scores = new Map<Intent, number>()

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(q)) {
        scores.set(intent, (scores.get(intent) ?? 0) + 1)
      }
    }
  }

  if (scores.size === 0) {
    // Fallback: general overview
    const ctx = INTENT_TO_CONTEXT["GENERAL"]
    return {
      intent: "GENERAL",
      collections: ctx.collections,
      limit: ctx.limit,
      timeFilter: parseTimeFilter(question),
    }
  }

  // Sort intents by score descending
  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  const [primaryIntent, primaryScore] = sorted[0]

  const primaryCtx = INTENT_TO_CONTEXT[primaryIntent]
  let collections = [...primaryCtx.collections]

  // Merge secondary intent's collections if it scored at least half of primary
  if (sorted.length > 1) {
    const [secondaryIntent, secondaryScore] = sorted[1]
    if (secondaryScore >= 1 && secondaryScore >= primaryScore / 2) {
      const secCtx = INTENT_TO_CONTEXT[secondaryIntent]
      collections = [...new Set([...collections, ...secCtx.collections])]
    }
  }

  return {
    intent: primaryIntent,
    collections,
    limit: primaryCtx.limit,
    timeFilter: parseTimeFilter(question),
  }
}