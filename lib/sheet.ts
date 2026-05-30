const URL = process.env.NEXT_PUBLIC_SHEETS_URL || ""

/**
 * Whether a Google Sheets endpoint has been configured.
 * Used as a fallback when Firestore persistence is unavailable.
 */
export const isSheetsConfigured = URL.length > 0

// ─── Types ────────────────────────────────────────────────────────────────────

export type Expense = {
  id: string
  date: string
  category: string
  subcategory: string
  amount: number
  payment_mode: string
  account: string
  merchant: string
  note: string
  is_recurring: boolean
  tags: string
  created_at: string
}

export type Saving = {
  id: string
  name: string
  owner: string
  type: string
  app: string
  provider: string
  invested_amount: number
  current_value: number
  returns_percent: number
  start_date: string
  maturity_date: string
  is_active: boolean
  frequency: string
  goal_ids: string
  note: string
  created_at: string
}

export type Goal = {
  id: string
  name: string
  category: string
  target_amount: number
  current_amount: number
  savings_ids: string
  priority: string
  deadline: string
  status: string
  note: string
  created_at: string
}

export type Account = {
  id: string
  name: string
  type: string
  bank: string
  last4: string
  balance: number
  credit_limit: number
  is_active: boolean
  note: string
  created_at: string
}

export type Transaction = {
  id: string
  date: string
  type: string
  amount: number
  from_account: string
  to_account: string
  expense_id: string
  note: string
  created_at: string
}

export type Provider = {
  id: string
  name: string
  type: string
  category: string
  created_at: string
}

export type App = {
  id: string
  name: string
  type: string
  created_at: string
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export async function getRows<T>(tab: string): Promise<T[]> {
  const res = await fetch(`${URL}?tab=${tab}`, { cache: "no-store" })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function appendRow(tab: string, data: unknown[]) {
  if (!URL) {
    throw new Error("Google Sheets endpoint not configured. Set NEXT_PUBLIC_SHEETS_URL in .env.local.")
  }

  const res = await fetch(URL, {
    method: "POST",
    body: JSON.stringify({ tab, action: "append", data }),
  })
  return res.json()
}

export async function updateRow(tab: string, rowIndex: number, values: unknown[]) {
  const res = await fetch(URL, {
    method: "POST",
    body: JSON.stringify({ tab, action: "update", data: { rowIndex, values } }),
  })
  return res.json()
}

// ─── Per-tab helpers ──────────────────────────────────────────────────────────

export const getExpenses    = () => getRows<Expense>("expenses")
export const getSavings     = () => getRows<Saving>("savings")
export const getGoals       = () => getRows<Goal>("goals")
export const getAccounts    = () => getRows<Account>("accounts")
export const getTransactions= () => getRows<Transaction>("transactions")
export const getProviders   = () => getRows<Provider>("providers")
export const getApps        = () => getRows<App>("apps")

// ─── Append helpers ───────────────────────────────────────────────────────────

export function appendExpense(e: Omit<Expense, "id" | "created_at">) {
  return appendRow("expenses", [
    crypto.randomUUID(),
    e.date, e.category, e.subcategory, e.amount,
    e.payment_mode, e.account, e.merchant,
    e.note, e.is_recurring, e.tags,
    new Date().toISOString(),
  ])
}

export function appendSaving(s: Omit<Saving, "id" | "created_at">) {
  return appendRow("savings", [
    crypto.randomUUID(),
    s.name, s.owner, s.type, s.app, s.provider,
    s.invested_amount, s.current_value, s.returns_percent,
    s.start_date, s.maturity_date, s.is_active,
    s.frequency, s.goal_ids, s.note,
    new Date().toISOString(),
  ])
}

export function appendGoal(g: Omit<Goal, "id" | "created_at">) {
  return appendRow("goals", [
    crypto.randomUUID(),
    g.name, g.category, g.target_amount, g.current_amount,
    g.savings_ids, g.priority, g.deadline, g.status, g.note,
    new Date().toISOString(),
  ])
}

export function appendAccount(a: Omit<Account, "id" | "created_at">) {
  return appendRow("accounts", [
    crypto.randomUUID(),
    a.name, a.type, a.bank, a.last4,
    a.balance, a.credit_limit, a.is_active, a.note,
    new Date().toISOString(),
  ])
}

export function appendProvider(p: Omit<Provider, "id" | "created_at">) {
  return appendRow("providers", [
    crypto.randomUUID(),
    p.name, p.type, p.category,
    new Date().toISOString(),
  ])
}

export function appendApp(a: Omit<App, "id" | "created_at">) {
  return appendRow("apps", [
    crypto.randomUUID(),
    a.name, a.type,
    new Date().toISOString(),
  ])
}