// hooks/use-finance-data.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { auth, db, isConfigured } from "@/lib/firebase"
import { appendAccount as appendSheetAccount, isSheetsConfigured } from "@/lib/sheet"
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  User
} from "firebase/auth"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs
} from "firebase/firestore"
import {
  ACCOUNTS,
  GOALS,
  EXPENSES,
  SAVINGS_APPS,
  SAVINGS_PROVIDERS
} from "@/constants/finance"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  type: string
  bank: string
  last4: string
  balance: number
  creditLimit?: number
  note?: string
}

export interface Expense {
  id: string
  date: string
  category: string
  amount: number
  account: string
  note: string
  goalId?: string
  goalName?: string
}

export interface SavingAllocation {
  id: string
  amount: number
}

export interface Goal {
  id: string
  name: string
  category: string
  target: number
  current: number
  savings_ids?: string[]
  savings_allocations?: SavingAllocation[]
  deadline?: string
  color: string
}

export interface Saving {
  id: string
  name: string
  owner: string
  type: string
  app: string
  provider: string
  amount: number
  linkedGoals: string[]
  frequency?: string
  active?: boolean
}

export interface DebtTransaction {
  id: string
  personName: string
  type: "lent" | "borrowed" | "lent_repayment" | "borrowed_repayment"
  amount: number
  date: string
  note: string
}

export interface Income {
  id: string
  source: string
  amount: number
  frequency: string
  date: string
  account: string
  note?: string
}

export interface SIPSchedule {
  id: string
  name: string
  investmentType: string
  amount: number
  frequency: string
  startDate: string
  endDate?: string
  account: string
  app: string
  sipStatus: "active" | "paused" | "completed"
  totalInvested?: number
  linkedGoal?: string
  note?: string
  savingId?: string
  triggeredMonths?: string[] // Track which months SIP has been triggered (e.g., ["2026-05", "2026-06"])
}

export interface TriggerHistory {
  id: string
  date: string // ISO date when triggered
  month: string // "2026-05" format
  triggeredSIPs: Array<{
    sipId: string
    sipName: string
    amount: number
    savingId: string
    savingName: string
  }>
}

interface FinanceDataContextType {
  user: User | null
  loading: boolean
  isDemo: boolean
  accounts: Account[]
  expenses: Expense[]
  goals: Goal[]
  savings: Saving[]
  debts: DebtTransaction[]
  income: Income[]
  sips: SIPSchedule[]
  triggerHistory: TriggerHistory[]
  apps: { value: string; label: string }[]
  providers: { value: string; label: string }[]
  
  // Actions
  loginWithGoogle: () => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  
  // Accounts CRUD
  addAccount: (acc: Omit<Account, "id">) => Promise<void>
  updateAccount: (id: string, acc: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  
  // Expenses CRUD
  addExpense: (exp: Omit<Expense, "id">) => Promise<void>
  updateExpense: (id: string, exp: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  
  // Goals CRUD
  addGoal: (goal: Omit<Goal, "id">) => Promise<void>
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  
  // Savings CRUD
  addSaving: (sav: Omit<Saving, "id" | "linkedGoals"> & { linkedGoals?: string[] }) => Promise<void>
  updateSaving: (id: string, sav: Partial<Saving>) => Promise<void>
  deleteSaving: (id: string) => Promise<void>

  // Debts CRUD
  addDebtTransaction: (debt: Omit<DebtTransaction, "id">) => Promise<void>
  updateDebtTransaction: (id: string, debt: Partial<Omit<DebtTransaction, "id">>) => Promise<void>
  deleteDebtTransaction: (id: string) => Promise<void>

  // Income CRUD
  addIncome: (inc: Omit<Income, "id">) => Promise<void>
  updateIncome: (id: string, inc: Partial<Income>) => Promise<void>
  deleteIncome: (id: string) => Promise<void>

  // SIP CRUD
  addSIP: (sip: Omit<SIPSchedule, "id">) => Promise<void>
  updateSIP: (id: string, sip: Partial<SIPSchedule>) => Promise<void>
  deleteSIP: (id: string) => Promise<void>
  triggerMonthSIPs: () => Promise<{ triggered: number; skipped: number }>
  undoLastTrigger: () => Promise<boolean>
  
  // Custom Apps & Providers
  addApp: (name: string) => Promise<void>
  addProvider: (name: string) => Promise<void>
}

// ─── Default Mock Data Seeds (used only for offline/demo localStorage) ────────

const INITIAL_ACCOUNTS: Account[] = ACCOUNTS.map((acc, index) => ({
  id: `acc_${index + 1}`,
  name: acc.name,
  type: acc.type,
  bank: acc.name.split(" ")[0],
  last4: acc.last4,
  balance: acc.balance,
}))

const INITIAL_EXPENSES: Expense[] = [
  { id: "exp_1", date: "2026-05-30", category: "food_dining", amount: 420, account: "acc_1", note: "Swiggy Order" },
  { id: "exp_2", date: "2026-05-29", category: "shopping", amount: 649, account: "acc_2", note: "Netflix Subscription" },
  { id: "exp_3", date: "2026-05-25", category: "other", amount: 5000, account: "acc_3", note: "Zerodha SIP" },
  { id: "exp_4", date: "2026-05-24", category: "other", amount: 3000, account: "acc_1", note: "ATM Cash Withdrawal" },
  { id: "exp_5", date: "2026-05-20", category: "utilities", amount: 3800, account: "acc_1", note: "Electricity Bill" },
  { id: "exp_6", date: "2026-05-18", category: "groceries", amount: 1540, account: "acc_2", note: "Weekly Groceries" },
]

const INITIAL_GOALS: Goal[] = GOALS.map((g, index) => ({
  id: `goal_${index + 1}`,
  name: g.name,
  category: g.name.toLowerCase().includes("vacation") ? "vacation" : g.name.toLowerCase().includes("laptop") ? "gadget" : "emergency_fund",
  target: g.target,
  current: g.current,
  savings_ids: index === 0 ? ["sav_1", "sav_2"] : index === 1 ? ["sav_3"] : [],
  savings_allocations: index === 0 ? [
    { id: "sav_1", amount: 35000 },
    { id: "sav_2", amount: 33000 },
  ] : index === 1 ? [
    { id: "sav_3", amount: 22000 },
  ] : [],
  color: g.color,
}))

const INITIAL_SAVINGS: Saving[] = [
  { id: "sav_1", name: "Axis Small Cap Mutual Fund", owner: "John Doe", type: "mf", app: "groww", provider: "axis_small_cap", amount: 35000, linkedGoals: ["goal_1"], frequency: "Monthly", active: true },
  { id: "sav_2", name: "HDFC Tax Saver FD", owner: "John Doe", type: "fd", app: "hdfc_bank", provider: "hdfc_bank", amount: 33000, linkedGoals: ["goal_1"], frequency: "One-time", active: true },
  { id: "sav_3", name: "Zerodha PPF Account", owner: "John Doe", type: "ppf", app: "coin", provider: "sbi", amount: 22000, linkedGoals: ["goal_2"], frequency: "Monthly", active: true },
]

const INITIAL_DEBTS: DebtTransaction[] = [
  { id: "debt_1", personName: "Amit Sharma", type: "lent", amount: 12000, date: "2026-05-15", note: "Business loan for rent" },
  { id: "debt_2", personName: "Amit Sharma", type: "lent_repayment", amount: 4000, date: "2026-05-22", note: "First partial repayment" },
  { id: "debt_3", personName: "Pooja Hegde", type: "borrowed", amount: 5000, date: "2026-05-10", note: "Borrowed for shopping emergency" },
  { id: "debt_4", personName: "Pooja Hegde", type: "borrowed_repayment", amount: 2000, date: "2026-05-28", note: "Repaid partial cash" },
]

const INITIAL_INCOME: Income[] = [
  { id: "inc_1", source: "salary", amount: 80000, frequency: "monthly", date: "2026-05-01", account: "acc_1", note: "Monthly Salary" },
  { id: "inc_2", source: "freelance", amount: 15000, frequency: "monthly", date: "2026-05-15", account: "acc_2", note: "Freelance Project" },
  { id: "inc_3", source: "bonus", amount: 50000, frequency: "one-time", date: "2026-05-20", account: "acc_1", note: "Annual Bonus" },
]

const INITIAL_SIPS: SIPSchedule[] = [
  { id: "sip_1", name: "Axis Small Cap SIP", investmentType: "mf", amount: 5000, frequency: "monthly", startDate: "2026-01-01", account: "acc_2", app: "groww", sipStatus: "active", totalInvested: 25000, linkedGoal: "goal_1", note: "Equity investment for growth" },
  { id: "sip_2", name: "Zerodha Direct SIP", investmentType: "mf", amount: 10000, frequency: "monthly", startDate: "2026-02-01", account: "acc_1", app: "zerodha", sipStatus: "active", totalInvested: 40000, linkedGoal: "goal_3", note: "Large Cap Fund SIP" },
]

const INITIAL_TRIGGER_HISTORY: TriggerHistory[] = []

const INITIAL_APPS = [...SAVINGS_APPS]
const INITIAL_PROVIDERS = [...SAVINGS_PROVIDERS]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeGoal = (rawGoal: any): Goal => {
  const savings_ids: string[] = rawGoal.savings_ids || []
  const savings_allocations: SavingAllocation[] = rawGoal.savings_allocations || []
  const normalizedAllocations = savings_allocations.length > 0
    ? savings_allocations
    : savings_ids.map((id) => ({ id, amount: 0 }))
  return {
    ...rawGoal,
    savings_ids,
    savings_allocations: normalizedAllocations,
  }
}

const cleanUndefined = <T extends object>(obj: T): T => {
  const newObj = { ...obj }
  Object.keys(newObj).forEach((key) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T]
    }
  })
  return newObj
}

const persistToSheet = async (createRow: () => Promise<unknown>) => {
  if (!isSheetsConfigured) return false
  try {
    await createRow()
    return true
  } catch (error) {
    console.error("Google Sheets sync failed:", error)
    return false
  }
}

// ─── React Context ────────────────────────────────────────────────────────────

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined)

export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(true)
  
  // Data State
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [debts, setDebts] = useState<DebtTransaction[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [sips, setSIPs] = useState<SIPSchedule[]>([])
  const [triggerHistory, setTriggerHistory] = useState<TriggerHistory[]>([])
  const [apps, setApps] = useState<{ value: string; label: string }[]>([])
  const [providers, setProviders] = useState<{ value: string; label: string }[]>([])

  // 1. Auth State & Data Loading
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      loadLocalStorageData()
      return
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        setIsDemo(false)
        await loadFirestoreData(currentUser.uid)
      } else {
        setIsDemo(true)
        loadLocalStorageData()
      }
      setLoading(false)
    })

    return () => unsubscribeAuth()
  }, [])

  // 2. Demo / Offline — load from localStorage
  const loadLocalStorageData = () => {
    const localAccounts = localStorage.getItem("finio_accounts")
    const localExpenses = localStorage.getItem("finio_expenses")
    const localGoals = localStorage.getItem("finio_goals")
    const localSavings = localStorage.getItem("finio_savings")
    const localDebts = localStorage.getItem("finio_debts")
    const localIncome = localStorage.getItem("finio_income")
    const localSIPs = localStorage.getItem("finio_sips")
    const localTriggerHistory = localStorage.getItem("finio_trigger_history")
    const localApps = localStorage.getItem("finio_apps")
    const localProviders = localStorage.getItem("finio_providers")

    if (localAccounts) setAccounts(JSON.parse(localAccounts))
    else {
      setAccounts(INITIAL_ACCOUNTS)
      localStorage.setItem("finio_accounts", JSON.stringify(INITIAL_ACCOUNTS))
    }

    if (localExpenses) setExpenses(JSON.parse(localExpenses))
    else {
      setExpenses(INITIAL_EXPENSES)
      localStorage.setItem("finio_expenses", JSON.stringify(INITIAL_EXPENSES))
    }

    if (localGoals) setGoals(JSON.parse(localGoals).map(normalizeGoal))
    else {
      setGoals(INITIAL_GOALS)
      localStorage.setItem("finio_goals", JSON.stringify(INITIAL_GOALS))
    }

    if (localSavings) setSavings(JSON.parse(localSavings))
    else {
      setSavings(INITIAL_SAVINGS)
      localStorage.setItem("finio_savings", JSON.stringify(INITIAL_SAVINGS))
    }

    if (localDebts) setDebts(JSON.parse(localDebts))
    else {
      setDebts(INITIAL_DEBTS)
      localStorage.setItem("finio_debts", JSON.stringify(INITIAL_DEBTS))
    }

    if (localIncome) setIncome(JSON.parse(localIncome))
    else {
      setIncome(INITIAL_INCOME)
      localStorage.setItem("finio_income", JSON.stringify(INITIAL_INCOME))
    }

    if (localSIPs) setSIPs(JSON.parse(localSIPs))
    else {
      setSIPs(INITIAL_SIPS)
      localStorage.setItem("finio_sips", JSON.stringify(INITIAL_SIPS))
    }

    if (localTriggerHistory) setTriggerHistory(JSON.parse(localTriggerHistory))
    else {
      setTriggerHistory(INITIAL_TRIGGER_HISTORY)
      localStorage.setItem("finio_trigger_history", JSON.stringify(INITIAL_TRIGGER_HISTORY))
    }

    if (localApps) setApps(JSON.parse(localApps))
    else {
      setApps(INITIAL_APPS)
      localStorage.setItem("finio_apps", JSON.stringify(INITIAL_APPS))
    }

    if (localProviders) setProviders(JSON.parse(localProviders))
    else {
      setProviders(INITIAL_PROVIDERS)
      localStorage.setItem("finio_providers", JSON.stringify(INITIAL_PROVIDERS))
    }
  }

  // 3. Cloud — one-time fetch from Firestore
  const loadFirestoreData = async (uid: string) => {
    try {
      const fetchCol = async <T,>(path: string, normalize?: (raw: any) => T): Promise<T[]> => {
        const segments = path.split("/")
        const snap = await getDocs(collection(db, segments[0], ...segments.slice(1)))
        const list: T[] = []
        snap.forEach((d) => list.push(
          normalize
            ? normalize({ id: d.id, ...d.data() })
            : ({ id: d.id, ...d.data() } as T)
        ))
        return list
      }

      const [accs, exps, gls, savs, dbts, incs, sipsData, aps, provs] = await Promise.all([
        fetchCol<Account>(`users/${uid}/accounts`),
        fetchCol<Expense>(`users/${uid}/expenses`),
        fetchCol<Goal>(`users/${uid}/goals`, normalizeGoal),
        fetchCol<Saving>(`users/${uid}/savings`),
        fetchCol<DebtTransaction>(`users/${uid}/debts`),
        fetchCol<Income>(`users/${uid}/income`),
        fetchCol<SIPSchedule>(`users/${uid}/sips`),
        fetchCol<any>(`users/${uid}/apps`),
        fetchCol<any>(`users/${uid}/providers`),
      ])

      setAccounts(accs)
      setExpenses(exps)
      setGoals(gls)
      setSavings(savs)
      setDebts(dbts)
      setIncome(incs)
      setSIPs(sipsData)
      setApps(aps)
      setProviders(provs)
    } catch (error) {
      console.error("Failed to load Firestore data, falling back to demo mode:", error)
      setIsDemo(true)
      loadLocalStorageData()
    }
  }

  // 4. Authentication Action Handlers
  const loginWithGoogle = async () => {
    if (!isConfigured) return
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      console.error("Google Sign-In failed:", e)
      throw e
    }
  }

  const loginWithEmail = async (email: string, password: string) => {
    if (!isConfigured) {
      // Mock log in locally
      setUser({
        displayName: "Demo User",
        email: email,
        uid: "demo_uid",
        photoURL: ""
      } as any)
      setIsDemo(false)
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      console.error("Email Login failed:", e)
      throw e
    }
  }

  const registerWithEmail = async (email: string, password: string, name: string) => {
    if (!isConfigured) {
      // Mock register locally
      setUser({
        displayName: name,
        email: email,
        uid: "demo_uid",
        photoURL: ""
      } as any)
      setIsDemo(false)
      return
    }
    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, password)
      if (credentials.user) {
        await updateProfile(credentials.user, { displayName: name })
        setUser({ ...credentials.user, displayName: name })
      }
    } catch (e) {
      console.error("Email Registration failed:", e)
      throw e
    }
  }

  const logout = async () => {
    if (!isConfigured) {
      setUser(null)
      setIsDemo(true)
      loadLocalStorageData()
      return
    }
    try {
      await signOut(auth)
    } catch (e) {
      console.error("Logout failed:", e)
    }
  }

  // ─── CRUD Actions ───────────────────────────────────────────────────────────
  // Pattern: always update React state immediately, then persist to
  //          localStorage (demo) or Firestore (cloud).

  // Accounts
  const addAccount = async (acc: Omit<Account, "id">) => {
    const id = `acc_${Math.random().toString(36).substr(2, 9)}`
    const newAcc = { id, ...acc }
    const updated = [...accounts, newAcc]
    setAccounts(updated)

    if (isDemo || !user) {
      localStorage.setItem("finio_accounts", JSON.stringify(updated))
      return
    }

    try {
      await setDoc(doc(db, "users", user.uid, "accounts", id), cleanUndefined(newAcc))
    } catch (error) {
      console.error("Firestore account save failed:", error)

      const sheetPersisted = await persistToSheet(() =>
        appendSheetAccount({
          name: newAcc.name,
          type: newAcc.type,
          bank: newAcc.bank,
          last4: newAcc.last4,
          balance: newAcc.balance,
          credit_limit: newAcc.creditLimit ?? 0,
          is_active: true,
          note: newAcc.note || "",
        })
      )

      if (!sheetPersisted) {
        localStorage.setItem("finio_accounts", JSON.stringify(updated))
      }
    }
  }

  const updateAccount = async (id: string, acc: Partial<Account>) => {
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...acc } : a))
    setAccounts(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_accounts", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "accounts", id), cleanUndefined(acc), { merge: true })
    }
  }

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id)
    setAccounts(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_accounts", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "accounts", id))
    }
  }

  // Expenses
  const addExpense = async (exp: Omit<Expense, "id">) => {
    const id = `exp_${Math.random().toString(36).substr(2, 9)}`
    const newExp = { id, ...exp }
    const updated = [...expenses, newExp]
    setExpenses(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_expenses", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "expenses", id), cleanUndefined(newExp))
    }

    // Adjust linked goal if present
    if (exp.goalId) {
      const goal = goals.find((g) => g.id === exp.goalId)
      if (goal) {
        await updateGoal(goal.id, { current: Math.max(0, (goal.current || 0) - exp.amount) })
      }
    }
  }

  const updateExpense = async (id: string, exp: Partial<Expense>) => {
    const oldExp = expenses.find((e) => e.id === id)
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...exp } : e))
    setExpenses(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_expenses", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "expenses", id), cleanUndefined(exp), { merge: true })
    }

    // Handle goal changes
    if (oldExp) {
      const oldGoalId = oldExp.goalId
      const newGoalId = exp.goalId !== undefined ? exp.goalId : oldExp.goalId
      const oldAmount = oldExp.amount
      const newAmount = exp.amount !== undefined ? exp.amount : oldExp.amount

      if (oldGoalId === newGoalId) {
        // Goal didn't change, but amount might have
        if (oldGoalId && oldAmount !== newAmount) {
          const goal = goals.find((g) => g.id === oldGoalId)
          if (goal) {
            const difference = newAmount - oldAmount
            await updateGoal(goal.id, { current: Math.max(0, (goal.current || 0) - difference) })
          }
        }
      } else {
        // Goal changed
        if (oldGoalId) {
          // Restore amount to old goal
          const oldGoal = goals.find((g) => g.id === oldGoalId)
          if (oldGoal) {
            await updateGoal(oldGoal.id, { current: (oldGoal.current || 0) + oldAmount })
          }
        }
        if (newGoalId) {
          // Deduct from new goal (note: use goals state, but since state updates might not be synchronous, we find the fresh goal value if oldGoal was same but since they are different, we can just grab from goals state)
          const newGoal = goals.find((g) => g.id === newGoalId)
          if (newGoal) {
            await updateGoal(newGoal.id, { current: Math.max(0, (newGoal.current || 0) - newAmount) })
          }
        }
      }
    }
  }

  const deleteExpense = async (id: string) => {
    const exp = expenses.find((e) => e.id === id)
    const updated = expenses.filter((e) => e.id !== id)
    setExpenses(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_expenses", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "expenses", id))
    }

    // Restore goal budget if expense was linked to a goal
    if (exp && exp.goalId) {
      const goal = goals.find((g) => g.id === exp.goalId)
      if (goal) {
        await updateGoal(goal.id, { current: (goal.current || 0) + exp.amount })
      }
    }
  }

  // Goals
  const addGoal = async (goal: Omit<Goal, "id">) => {
    const id = `goal_${Math.random().toString(36).substr(2, 9)}`
    const newGoal = {
      id,
      savings_ids: goal.savings_ids || [],
      savings_allocations: goal.savings_allocations || [],
      ...goal,
    }
    const updated = [...goals, newGoal]
    setGoals(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_goals", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "goals", id), cleanUndefined(newGoal))
    }
  }

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, ...goal } : g))
    setGoals(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_goals", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "goals", id), cleanUndefined(goal), { merge: true })
    }
  }

  const deleteGoal = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id)
    setGoals(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_goals", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "goals", id))
    }
  }

  // Savings
  const addSaving = async (sav: Omit<Saving, "id" | "linkedGoals"> & { linkedGoals?: string[] }) => {
    const id = `sav_${Math.random().toString(36).substr(2, 9)}`
    const newSav = { id, linkedGoals: [], active: true, ...sav }
    const updated = [...savings, newSav]
    setSavings(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_savings", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "savings", id), cleanUndefined(newSav))
    }
  }

  const updateSaving = async (id: string, sav: Partial<Saving>) => {
    const updated = savings.map((s) => (s.id === id ? { ...s, ...sav } : s))
    setSavings(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_savings", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "savings", id), cleanUndefined(sav), { merge: true })
    }
  }

  const deleteSaving = async (id: string) => {
    const updated = savings.filter((s) => s.id !== id)
    setSavings(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_savings", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "savings", id))
    }
  }

  // Debts
  const addDebtTransaction = async (debt: Omit<DebtTransaction, "id">) => {
    const id = `debt_${Math.random().toString(36).substr(2, 9)}`
    const newDebt = { id, ...debt }
    const updated = [...debts, newDebt]
    setDebts(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_debts", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "debts", id), cleanUndefined(newDebt))
    }
  }

  const updateDebtTransaction = async (id: string, debt: Partial<Omit<DebtTransaction, "id">>) => {
    const updated = debts.map((d) => (d.id === id ? { ...d, ...debt } : d))
    setDebts(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_debts", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "debts", id), cleanUndefined(debt), { merge: true })
    }
  }

  const deleteDebtTransaction = async (id: string) => {
    const updated = debts.filter((d) => d.id !== id)
    setDebts(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_debts", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "debts", id))
    }
  }

  // Apps
  const addApp = async (name: string) => {
    const value = name.toLowerCase().replace(/[^a-z0-9]/g, "_")
    const newApp = { value, label: name }
    const updated = [...apps, newApp]
    setApps(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_apps", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "apps", value), newApp)
    }
  }

  // Providers
  const addProvider = async (name: string) => {
    const value = name.toLowerCase().replace(/[^a-z0-9]/g, "_")
    const newProv = { value, label: name }
    const updated = [...providers, newProv]
    setProviders(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_providers", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "providers", value), newProv)
    }
  }

  // Income
  const addIncome = async (inc: Omit<Income, "id">) => {
    const id = `inc_${Math.random().toString(36).substr(2, 9)}`
    const newInc = { id, ...inc }
    const updated = [...income, newInc]
    setIncome(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_income", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "income", id), cleanUndefined(newInc))
    }
  }

  const updateIncome = async (id: string, inc: Partial<Income>) => {
    const updated = income.map((i) => (i.id === id ? { ...i, ...inc } : i))
    setIncome(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_income", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "income", id), cleanUndefined(inc), { merge: true })
    }
  }

  const deleteIncome = async (id: string) => {
    const updated = income.filter((i) => i.id !== id)
    setIncome(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_income", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "income", id))
    }
  }

  // SIPs
  const addSIP = async (sip: Omit<SIPSchedule, "id">) => {
    const id = `sip_${Math.random().toString(36).substr(2, 9)}`
    const newSIP = { id, ...sip }
    const updated = [...sips, newSIP]
    setSIPs(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_sips", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "sips", id), cleanUndefined(newSIP))
    }
  }

  const updateSIP = async (id: string, sip: Partial<SIPSchedule>) => {
    const updated = sips.map((s) => (s.id === id ? { ...s, ...sip } : s))
    setSIPs(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_sips", JSON.stringify(updated))
    } else {
      await setDoc(doc(db, "users", user.uid, "sips", id), cleanUndefined(sip), { merge: true })
    }
  }

  const deleteSIP = async (id: string) => {
    const updated = sips.filter((s) => s.id !== id)
    setSIPs(updated)
    if (isDemo || !user) {
      localStorage.setItem("finio_sips", JSON.stringify(updated))
    } else {
      await deleteDoc(doc(db, "users", user.uid, "sips", id))
    }
  }

  // Trigger monthly SIPs
  const triggerMonthSIPs = async () => {
    const today = new Date("2026-05-30") // Use consistent date for demo
    const currentMonth = today.toISOString().substring(0, 7) // "2026-05"
    
    let triggered = 0
    let skipped = 0
    const updatedSIPs = [...sips]
    const updatedSavings = [...savings]
    const triggeredSIPsList: TriggerHistory["triggeredSIPs"] = []

    // Process each active SIP
    for (const sip of sips.filter(s => s.sipStatus === "active")) {
      const triggeredMonths = sip.triggeredMonths || []
      
      // Check if already triggered this month
      if (triggeredMonths.includes(currentMonth)) {
        skipped++
        continue
      }

      // Find the linked saving
      let linkedSavingId = sip.savingId
      let linkedSavingName = ""
      if (!linkedSavingId && sip.linkedGoal) {
        // Try to find a saving from the linked goal
        const linkedGoal = goals.find(g => g.id === sip.linkedGoal)
        if (linkedGoal && linkedGoal.savings_ids && linkedGoal.savings_ids.length > 0) {
          linkedSavingId = linkedGoal.savings_ids[0]
        }
      }

      // If we found a linked saving, add the SIP amount
      if (linkedSavingId) {
        const savingIndex = updatedSavings.findIndex(s => s.id === linkedSavingId)
        if (savingIndex >= 0) {
          linkedSavingName = updatedSavings[savingIndex].name
          updatedSavings[savingIndex] = {
            ...updatedSavings[savingIndex],
            amount: updatedSavings[savingIndex].amount + sip.amount,
          }
          
          // Record this trigger
          triggeredSIPsList.push({
            sipId: sip.id,
            sipName: sip.name,
            amount: sip.amount,
            savingId: linkedSavingId,
            savingName: linkedSavingName,
          })
          triggered++
        }
      }

      // Update SIP with new triggered month
      const sipIndex = updatedSIPs.findIndex(s => s.id === sip.id)
      if (sipIndex >= 0) {
        updatedSIPs[sipIndex] = {
          ...updatedSIPs[sipIndex],
          triggeredMonths: [...triggeredMonths, currentMonth],
          totalInvested: (updatedSIPs[sipIndex].totalInvested || 0) + sip.amount,
        }
      }
    }

    // Create trigger history entry if any SIPs were triggered
    if (triggeredSIPsList.length > 0) {
      const newTriggerRecord: TriggerHistory = {
        id: `trigger_${Math.random().toString(36).substr(2, 9)}`,
        date: today.toISOString(),
        month: currentMonth,
        triggeredSIPs: triggeredSIPsList,
      }
      
      const updatedHistory = [newTriggerRecord, ...triggerHistory]
      setTriggerHistory(updatedHistory)
      
      if (isDemo || !user) {
        localStorage.setItem("finio_trigger_history", JSON.stringify(updatedHistory))
      }
    }

    // Update both SIPs and Savings
    setSIPs(updatedSIPs)
    setSavings(updatedSavings)

    if (isDemo || !user) {
      localStorage.setItem("finio_sips", JSON.stringify(updatedSIPs))
      localStorage.setItem("finio_savings", JSON.stringify(updatedSavings))
    } else {
      // Persist to Firestore
      try {
        for (const sip of updatedSIPs) {
          await setDoc(
            doc(db, "users", user.uid, "sips", sip.id),
            cleanUndefined(sip),
            { merge: true }
          )
        }
        for (const saving of updatedSavings) {
          await setDoc(
            doc(db, "users", user.uid, "savings", saving.id),
            cleanUndefined(saving),
            { merge: true }
          )
        }
        
        // Save trigger history
        if (triggeredSIPsList.length > 0) {
          const historyId = `trigger_${Math.random().toString(36).substr(2, 9)}`
          await setDoc(
            doc(db, "users", user.uid, "trigger_history", historyId),
            {
              id: historyId,
              date: today.toISOString(),
              month: currentMonth,
              triggeredSIPs: triggeredSIPsList,
            }
          )
        }
      } catch (error) {
        console.error("Failed to trigger SIPs:", error)
      }
    }

    return { triggered, skipped }
  }

  // Undo last trigger
  const undoLastTrigger = async () => {
    if (triggerHistory.length === 0) {
      return false
    }

    const lastTrigger = triggerHistory[0]
    const updatedSIPs = [...sips]
    const updatedSavings = [...savings]

    // Reverse the changes
    for (const triggeredSIP of lastTrigger.triggeredSIPs) {
      // Remove the triggered month from SIP
      const sipIndex = updatedSIPs.findIndex(s => s.id === triggeredSIP.sipId)
      if (sipIndex >= 0) {
        const updatedMonths = (updatedSIPs[sipIndex].triggeredMonths || []).filter(
          m => m !== lastTrigger.month
        )
        updatedSIPs[sipIndex] = {
          ...updatedSIPs[sipIndex],
          triggeredMonths: updatedMonths,
          totalInvested: Math.max(0, (updatedSIPs[sipIndex].totalInvested || 0) - triggeredSIP.amount),
        }
      }

      // Reduce the saving amount
      const savingIndex = updatedSavings.findIndex(s => s.id === triggeredSIP.savingId)
      if (savingIndex >= 0) {
        updatedSavings[savingIndex] = {
          ...updatedSavings[savingIndex],
          amount: Math.max(0, updatedSavings[savingIndex].amount - triggeredSIP.amount),
        }
      }
    }

    // Remove from trigger history
    const updatedHistory = triggerHistory.slice(1)
    setTriggerHistory(updatedHistory)

    // Update state
    setSIPs(updatedSIPs)
    setSavings(updatedSavings)

    // Persist
    if (isDemo || !user) {
      localStorage.setItem("finio_sips", JSON.stringify(updatedSIPs))
      localStorage.setItem("finio_savings", JSON.stringify(updatedSavings))
      localStorage.setItem("finio_trigger_history", JSON.stringify(updatedHistory))
    } else {
      // Persist to Firestore
      try {
        for (const sip of updatedSIPs) {
          await setDoc(
            doc(db, "users", user.uid, "sips", sip.id),
            cleanUndefined(sip),
            { merge: true }
          )
        }
        for (const saving of updatedSavings) {
          await setDoc(
            doc(db, "users", user.uid, "savings", saving.id),
            cleanUndefined(saving),
            { merge: true }
          )
        }
        // Delete trigger history entry
        await deleteDoc(doc(db, "users", user.uid, "trigger_history", lastTrigger.id))
      } catch (error) {
        console.error("Failed to undo trigger:", error)
        return false
      }
    }

    return true
  }

  return (
    <FinanceDataContext.Provider
      value={{
        user,
        loading,
        isDemo,
        accounts,
        expenses,
        goals,
        savings,
        debts,
        income,
        sips,
        triggerHistory,
        apps,
        providers,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        addAccount,
        updateAccount,
        deleteAccount,
        addExpense,
        updateExpense,
        deleteExpense,
        addGoal,
        updateGoal,
        deleteGoal,
        addSaving,
        updateSaving,
        deleteSaving,
        addDebtTransaction,
        updateDebtTransaction,
        deleteDebtTransaction,
        addIncome,
        updateIncome,
        deleteIncome,
        addSIP,
        updateSIP,
        deleteSIP,
        triggerMonthSIPs,
        undoLastTrigger,
        addApp,
        addProvider,
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  )
}

export function useFinanceData() {
  const context = useContext(FinanceDataContext)
  if (context === undefined) {
    throw new Error("useFinanceData must be used within a FinanceDataProvider")
  }
  return context
}
