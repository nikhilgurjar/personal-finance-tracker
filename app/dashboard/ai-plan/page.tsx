"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useFinanceData, type Goal, type Saving } from "@/hooks/use-finance-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkdownContent } from "@/components/ai-plan/markdown"
import { ExpenseForm } from "@/components/forms/expense-form"
import { SavingsForm } from "@/components/forms/savings-form"
import { GoalForm } from "@/components/forms/goal-form"
import { SIPForm } from "@/components/forms/sip-form"
import { DebtForm } from "@/components/forms/debt-form"
import { safeNumber, formatCurrency, cn } from "@/lib/utils"
import {
  Sparkles,
  Send,
  Bot,
  User,
  Target,
  TrendingUp,
  PiggyBank,
  Wallet,
  RotateCcw,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Zap,
  Brain,
  AlertCircle,
  TrendingDown,
  BarChart3,
  ArrowLeftRight,
  PlusCircle,
  Landmark,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: "gemini" | "groq"
  isPlan?: boolean
  error?: boolean
  timestamp: Date
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm your **Finio AI Coach**. This is now the full-page finance assistant — no floating widget needed.\n\nI can read your expenses, savings, goals, SIPs, income, accounts, and lend/borrow data, then turn it into analytics and a practical plan. Add missing records above, then tap **Build My Plan**.",
  timestamp: new Date(),
}

const BUILD_PLAN_PROMPT =
  "Build a robust monthly finance plan from all available data. Use my actual income, expenses, savings, goals, SIPs, accounts, and lend/borrow records. Do not stop at clarifying questions unless a calculation is impossible. If assumptions are needed, state them briefly and still give a concrete plan with analytics, priorities, monthly allocation, goal progress, SIP/debt actions, and next steps."

const SUGGESTIONS = [
  "Build my robust monthly plan",
  "Read all my data and show analytics",
  "Prioritize goals, SIPs, and debts",
  "What expenses should I control first?",
  "How much can I safely invest monthly?",
  "Find risks in my finances",
]

const CHAT_STORAGE_KEY = "finio-ai-plan-chat"
const PLAN_STORAGE_KEY = "finio-savings-plan"

type QuickAddType = "expense" | "saving" | "goal" | "sip" | "debt" | null

function ProviderBadge({ provider }: { provider?: "gemini" | "groq" }) {
  if (!provider) return null
  const config = {
    gemini: { label: "Gemini", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    groq: { label: "Groq", classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  }
  const { label, classes } = config[provider]
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", classes)}>
      <Zap className="h-2 w-2" />
      {label}
    </span>
  )
}

function cleanFinanceName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function isGoalSavingNameMatch(goal: Goal, saving: Saving) {
  const goalName = cleanFinanceName(goal.name)
  const savingName = cleanFinanceName(saving.name)
  if (goalName.length < 8 || savingName.length < 8) return false
  return goalName === savingName || goalName.includes(savingName) || savingName.includes(goalName)
}

function getGoalBackingAmount(goal: Goal, savings: Saving[]) {
  const allocations =
    goal.savings_allocations && goal.savings_allocations.length > 0
      ? goal.savings_allocations
      : (goal.savings_ids || []).map((id) => ({ id, amount: 0 }))
  const allocationIds = new Set(allocations.map((allocation) => allocation.id))

  const linkedAllocations = savings
    .filter((saving) => saving.linkedGoals?.includes(goal.id) && !allocationIds.has(saving.id))
    .map((saving) => ({ id: saving.id, amount: 0 }))

  const explicitBacking = [...allocations, ...linkedAllocations].reduce((sum, allocation) => {
    const saving = savings.find((item) => item.id === allocation.id)
    if (!saving) return sum
    return sum + safeNumber(allocation.amount > 0 ? allocation.amount : saving.amount)
  }, 0)

  const inferredBackingAmount = savings
    .filter((saving) => (saving.linkedGoals?.length ?? 0) === 0 && !allocationIds.has(saving.id) && isGoalSavingNameMatch(goal, saving))
    .reduce((sum, saving) => sum + safeNumber(saving.amount), 0)

  return explicitBacking + inferredBackingAmount
}

export default function AIPlanPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [savedPlan, setSavedPlan] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState<QuickAddType>(null)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)
  const [activePanelTab, setActivePanelTab] = useState<"chat" | "plan">("chat")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { accounts, expenses, goals, savings, sips, debts, income, user, isDemo } = useFinanceData()

  const localData = useMemo(
    () => ({ accounts, expenses, goals, savings, sips, debts, income }),
    [accounts, expenses, goals, savings, sips, debts, income]
  )

  const monthlyIncome = income
    .filter((i) => i.frequency === "monthly")
    .reduce((sum, i) => sum + safeNumber(i.amount), 0)

  const monthlyExpenses = expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0)
  const totalSavings = savings.reduce((sum, s) => sum + safeNumber(s.amount), 0)
  const activeSIPTotal = sips
    .filter((sip) => sip.sipStatus === "active")
    .reduce((sum, sip) => sum + safeNumber(sip.amount), 0)
  const monthlySurplus = monthlyIncome - monthlyExpenses - activeSIPTotal
  const savingsRate = monthlyIncome > 0 ? Math.round(((Math.max(0, monthlyIncome - monthlyExpenses)) / monthlyIncome) * 100) : 0

  const debtAnalytics = useMemo(() => {
    const lent = debts.filter((d) => d.type === "lent").reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const lentRepaid = debts.filter((d) => d.type === "lent_repayment").reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const borrowed = debts.filter((d) => d.type === "borrowed").reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const borrowedRepaid = debts.filter((d) => d.type === "borrowed_repayment").reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const receivable = Math.max(0, lent - lentRepaid)
    const payable = Math.max(0, borrowed - borrowedRepaid)
    return { receivable, payable, net: receivable - payable }
  }, [debts])

  const topExpenseCategory = useMemo<[string, number]>(() => {
    const totals = expenses.reduce<Record<string, number>>((acc, expense) => {
      const category = expense.category || "Uncategorized"
      acc[category] = (acc[category] ?? 0) + safeNumber(expense.amount)
      return acc
    }, {})
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] ?? ["No expenses", 0]
  }, [expenses])

  const dataReadiness = useMemo(() => {
    const checks = [
      { label: "Income", count: income.length, ready: income.length > 0 },
      { label: "Expenses", count: expenses.length, ready: expenses.length > 0 },
      { label: "Savings", count: savings.length, ready: savings.length > 0 },
      { label: "Goals", count: goals.length, ready: goals.length > 0 },
      { label: "SIPs", count: sips.length, ready: sips.length > 0 },
      { label: "Lend/Borrow", count: debts.length, ready: debts.length > 0 },
    ]
    const readyCount = checks.filter((check) => check.ready).length
    return {
      checks,
      score: Math.round((readyCount / checks.length) * 100),
      missing: checks.filter((check) => !check.ready).map((check) => check.label),
    }
  }, [debts.length, expenses.length, goals.length, income.length, savings.length, sips.length])

  const goalsProgress = useMemo(() => {
    if (goals.length === 0) return 0
    const totals = goals.reduce(
      (acc, goal) => {
        acc.target += safeNumber(goal.target)
        acc.backed += safeNumber(goal.current) + getGoalBackingAmount(goal, savings)
        return acc
      },
      { target: 0, backed: 0 }
    )
    return totals.target > 0 ? Math.min(100, Math.round((totals.backed / totals.target) * 100)) : 0
  }, [goals, savings])

  const quickActions = [
    {
      type: "expense" as const,
      title: "Add Expense",
      description: "Capture a spend",
      icon: TrendingDown,
      classes: "bg-rose-500/10 text-rose-500",
      badgeClasses: "bg-rose-500/10 text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-900",
    },
    {
      type: "saving" as const,
      title: "Add Saving",
      description: "FD, MF, PPF, assets",
      icon: PiggyBank,
      classes: "bg-violet-500/10 text-violet-500",
      badgeClasses: "bg-violet-500/10 text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-900",
    },
    {
      type: "goal" as const,
      title: "Add Goal",
      description: "Track funding progress",
      icon: Target,
      classes: "bg-blue-500/10 text-blue-500",
      badgeClasses: "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-900",
    },
    {
      type: "sip" as const,
      title: "Add SIP",
      description: "Recurring investments",
      icon: BarChart3,
      classes: "bg-emerald-500/10 text-emerald-500",
      badgeClasses: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900",
    },
    {
      type: "debt" as const,
      title: "Lend / Borrow",
      description: "Money owed to/by you",
      icon: ArrowLeftRight,
      classes: "bg-amber-500/10 text-amber-500",
      badgeClasses: "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-900",
    },
  ]

  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(CHAT_STORAGE_KEY)
      if (savedChat) {
        const parsed: Message[] = JSON.parse(savedChat).map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
        if (parsed.length > 1) setMessages(parsed)
      }
      const savedPlanRaw = localStorage.getItem(PLAN_STORAGE_KEY)
      if (savedPlanRaw) {
        const { content, savedAt: at } = JSON.parse(savedPlanRaw)
        setSavedPlan(content)
        setSavedAt(new Date(at))
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      // ignore
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim()
      if (!question || loading) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setLoading(true)
      // Switch to chat tab when sending
      setActivePanelTab("chat")

      try {
        const history = messages
          .filter((m) => m.id !== "welcome" && !m.error)
          .slice(-10)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

        const res = await fetch("/api/ai-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            uid: user?.uid ?? null,
            isDemo,
            localData: isDemo ? localData : undefined,
            history,
            savedPlan: savedPlan ?? undefined,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong")

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          provider: data.provider,
          isPlan: data.isPlan,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I ran into an error: **${message}**`,
            error: true,
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [input, loading, user, isDemo, localData, messages, savedPlan]
  )

  const savePlan = useCallback((content: string) => {
    const now = new Date()
    setSavedPlan(content)
    setSavedAt(now)
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ content, savedAt: now.toISOString() }))
    } catch {
      // ignore
    }
  }, [])

  const saveLatestPlan = useCallback(() => {
    const latestPlan = [...messages].reverse().find((m) => m.role === "assistant" && !m.error && m.isPlan)
    if (latestPlan) {
      savePlan(latestPlan.content)
      return
    }
    const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.error && m.id !== "welcome")
    if (latestAssistant) savePlan(latestAssistant.content)
  }, [messages, savePlan])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const clearSavedPlan = useCallback(() => {
    setSavedPlan(null)
    setSavedAt(null)
    try {
      localStorage.removeItem(PLAN_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const hasSaveablePlan = messages.some((m) => m.role === "assistant" && !m.error && m.id !== "welcome")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Savings Plan</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Add records, review analytics, and build a stronger plan from your real data.
          </p>
        </div>
        <Button
          onClick={() => sendMessage(BUILD_PLAN_PROMPT)}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shrink-0 w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Build My Plan
        </Button>
      </div>

      {/* ── Quick Add Actions ── */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.type}
              onClick={() => setQuickAddOpen(action.type)}
              className="group rounded-xl border border-border/60 bg-background p-3 sm:p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-95"
            >
              <div className={cn("mb-2 sm:mb-3 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg", action.classes)}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs sm:text-sm font-bold leading-tight">{action.title}</p>
                <PlusCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* ── Financial Snapshot: 2 cols on mobile, 4 on desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            icon: TrendingUp,
            iconClasses: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            label: "Monthly Income",
            value: `₹${formatCurrency(monthlyIncome)}`,
          },
          {
            icon: Wallet,
            iconClasses: "bg-red-500/10",
            iconColor: "text-red-400",
            label: "Tracked Expenses",
            value: `₹${formatCurrency(monthlyExpenses)}`,
          },
          {
            icon: PiggyBank,
            iconClasses: "bg-violet-500/10",
            iconColor: "text-violet-400",
            label: "Total Savings",
            value: `₹${formatCurrency(totalSavings)}`,
          },
          {
            icon: Target,
            iconClasses: "bg-blue-500/10",
            iconColor: "text-blue-400",
            label: "Goals Progress",
            value: `${goalsProgress}%`,
          },
        ].map(({ icon: Icon, iconClasses, iconColor, label, value }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0", iconClasses)}>
                <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">{label}</p>
                <p className="text-base sm:text-lg font-bold truncate">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Analytics: collapsible on mobile ── */}
      <div>
        <button
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sm:hidden"
          onClick={() => setAnalyticsExpanded((v) => !v)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
          {analyticsExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </button>

        <div className={cn("grid gap-2 sm:gap-4 sm:grid-cols-3", !analyticsExpanded && "hidden sm:grid")}>
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                Cashflow Health
              </CardTitle>
              <CardDescription className="text-xs">Income after expenses and active SIPs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Monthly surplus</span>
                <span className={cn("text-lg sm:text-xl font-black", monthlySurplus >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  ₹{formatCurrency(monthlySurplus)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Savings intensity</span>
                <span className="text-sm font-bold">{savingsRate}%</span>
              </div>
              {/* Mini progress bar for savings rate */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                  style={{ width: `${Math.min(savingsRate, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Landmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                Debt Position
              </CardTitle>
              <CardDescription className="text-xs">Lend and borrow after repayments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Receivable</span>
                <span className="text-sm font-bold text-emerald-500">₹{formatCurrency(debtAnalytics.receivable)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Payable</span>
                <span className="text-sm font-bold text-rose-500">₹{formatCurrency(debtAnalytics.payable)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Net position</span>
                <span className={cn("text-xs font-bold", debtAnalytics.net >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {debtAnalytics.net >= 0 ? "+" : ""}₹{formatCurrency(debtAnalytics.net)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                Spending & SIPs
              </CardTitle>
              <CardDescription className="text-xs">Largest spend bucket and recurring investments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[55%]">{topExpenseCategory[0]}</span>
                <span className="text-sm font-bold shrink-0">₹{formatCurrency(topExpenseCategory[1])}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Active SIPs</span>
                <span className="text-sm font-bold text-primary">₹{formatCurrency(activeSIPTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Data Readiness Banner ── */}
      <Card className="border-border/60 bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-purple-700/5">
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-bold">Plan readiness: {dataReadiness.score}%</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI reads {dataReadiness.checks.filter((c) => c.ready).length} of {dataReadiness.checks.length} areas.
              {dataReadiness.missing.length > 0
                ? ` Add ${dataReadiness.missing.join(", ")} for a stronger plan.`
                : " Dataset is broad enough for a grounded plan."}
            </p>
            {/* Compact progress bar */}
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                style={{ width: `${dataReadiness.score}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:max-w-[260px]">
            {dataReadiness.checks.map((check) => (
              <Badge
                key={check.label}
                variant="outline"
                className={cn(
                  "text-[9px] sm:text-[10px] font-bold h-5",
                  check.ready
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                )}
              >
                {check.label}: {check.count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Panels: tabbed on mobile, side-by-side on desktop ── */}

      {/* Mobile: tab switcher */}
      <div className="flex gap-0 rounded-xl border border-border/60 overflow-hidden sm:hidden bg-muted/20">
        <button
          onClick={() => setActivePanelTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors",
            activePanelTab === "chat"
              ? "bg-background text-foreground shadow-sm border-r border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          Wealth Coach
        </button>
        <button
          onClick={() => setActivePanelTab("plan")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors",
            activePanelTab === "plan"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookmarkCheck className="h-3.5 w-3.5" />
          My Plan
          {savedPlan && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        </button>
      </div>

      <div className="grid sm:grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:h-[620px]">

        {/* ── Chat Panel ── */}
        <Card className={cn(
          "lg:col-span-3 border-border/60 flex flex-col overflow-hidden lg:h-full",
          activePanelTab !== "chat" && "hidden lg:flex"
        )}>
          <CardHeader className="pb-2.5 sm:pb-3 border-b border-border/40 bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-purple-700/5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Wealth Coach</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs hidden sm:block">
                  Reads expenses, savings, goals, SIPs, income, accounts, and lend/borrow data
                </CardDescription>
              </div>
              <div className="flex gap-1 shrink-0">
                {hasSaveablePlan && (
                  <Button variant="outline" size="sm" onClick={saveLatestPlan} className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3">
                    <Bookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Save Plan</span>
                  </Button>
                )}
                {messages.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={clearChat} className="h-7 w-7 sm:h-8 sm:w-8 p-0" title="Clear chat">
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0 px-3 sm:px-4 py-3 sm:py-4">
              <div className="space-y-3 sm:space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex gap-2 sm:gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-white text-xs",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-gradient-to-br from-violet-600 to-purple-700"
                      )}
                    >
                      {msg.role === "user" ? <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    </div>

                    <div className={cn("flex flex-col gap-1 max-w-[90%] sm:max-w-[88%] min-w-0", msg.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 max-w-full min-w-0 overflow-hidden",
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-tr-sm text-xs sm:text-sm"
                            : msg.error
                            ? "bg-destructive/10 border border-destructive/20 rounded-tl-sm"
                            : "bg-muted/60 border border-border/40 rounded-tl-sm"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <MarkdownContent text={msg.content} />
                        ) : (
                          <p className="text-xs sm:text-sm">{msg.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 px-1 flex-wrap">
                        {msg.isPlan && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-500">
                            Plan
                          </Badge>
                        )}
                        {msg.provider && <ProviderBadge provider={msg.provider} />}
                        {msg.role === "assistant" && !msg.error && msg.id !== "welcome" && msg.isPlan && (
                          <button
                            onClick={() => savePlan(msg.content)}
                            className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          >
                            <Bookmark className="h-2.5 w-2.5" />
                            Save
                          </button>
                        )}
                        <span className="text-[9px] text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2 sm:gap-2.5">
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700">
                      <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                    </div>
                    <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="flex gap-1 sm:gap-1.5 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {messages.length === 1 && (
              <div className="px-3 sm:px-4 pb-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border/40 mt-auto">
              <div className="flex items-end gap-2 bg-muted/40 border border-border/50 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 focus-within:border-primary/50 transition-colors">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your savings plan, goals, or wealth building..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 shadow-none resize-none outline-none min-h-0 max-h-28 text-xs sm:text-sm p-0 focus-visible:ring-0"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 bg-gradient-to-br from-blue-600 to-violet-600"
                >
                  <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 sm:mt-1.5 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Saved Plan Panel ── */}
        <Card className={cn(
          "lg:col-span-2 border-border/60 flex flex-col overflow-hidden lg:h-full",
          activePanelTab !== "plan" && "hidden lg:flex"
        )}>
          <CardHeader className="pb-2.5 sm:pb-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BookmarkCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base">My Savings Plan</CardTitle>
                  {savedAt && (
                    <CardDescription className="text-[10px] sm:text-xs truncate">
                      Saved {savedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </CardDescription>
                  )}
                </div>
              </div>
              {savedPlan && (
                <Button variant="ghost" size="sm" onClick={clearSavedPlan} className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0" title="Remove saved plan">
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
            {savedPlan ? (
              <ScrollArea className="flex-1 min-h-0 px-3 sm:px-5 py-3 sm:py-4">
                <div className="max-w-full min-w-0 overflow-hidden pr-1">
                  <MarkdownContent text={savedPlan} />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] sm:min-h-[300px] px-4 sm:px-6 text-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-foreground mb-1">No plan saved yet</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-4 max-w-[220px]">
                  Chat with the coach to build your plan, then tap Save Plan to keep it here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { sendMessage(BUILD_PLAN_PROMPT); setActivePanelTab("chat") }}
                  disabled={loading}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                  Generate Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseForm open={quickAddOpen === "expense"} onOpenChange={(open) => setQuickAddOpen(open ? "expense" : null)} />
      <SavingsForm open={quickAddOpen === "saving"} onOpenChange={(open) => setQuickAddOpen(open ? "saving" : null)} />
      <GoalForm open={quickAddOpen === "goal"} onOpenChange={(open) => setQuickAddOpen(open ? "goal" : null)} />
      <SIPForm open={quickAddOpen === "sip"} onOpenChange={(open) => setQuickAddOpen(open ? "sip" : null)} />
      <DebtForm open={quickAddOpen === "debt"} onOpenChange={(open) => setQuickAddOpen(open ? "debt" : null)} />
    </div>
  )
}