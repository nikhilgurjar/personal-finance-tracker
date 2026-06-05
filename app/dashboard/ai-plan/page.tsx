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
      description: "Capture a spend and link it to goals.",
      icon: TrendingDown,
      classes: "bg-rose-500/10 text-rose-500",
    },
    {
      type: "saving" as const,
      title: "Add Saving",
      description: "Record FD, MF, PPF, bank cash, or assets.",
      icon: PiggyBank,
      classes: "bg-violet-500/10 text-violet-500",
    },
    {
      type: "goal" as const,
      title: "Add Goal",
      description: "Create a target and track funding progress.",
      icon: Target,
      classes: "bg-blue-500/10 text-blue-500",
    },
    {
      type: "sip" as const,
      title: "Add SIP",
      description: "Track recurring investment commitments.",
      icon: BarChart3,
      classes: "bg-emerald-500/10 text-emerald-500",
    },
    {
      type: "debt" as const,
      title: "Lend / Borrow",
      description: "Record money owed to you or by you.",
      icon: ArrowLeftRight,
      classes: "bg-amber-500/10 text-amber-500",
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Savings Plan</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            A full-page AI finance command center: add records, review analytics, and build a stronger plan from your real data.
          </p>
        </div>
        <Button
          onClick={() => sendMessage(BUILD_PLAN_PROMPT)}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shrink-0"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Build My Plan
        </Button>
      </div>

      {/* Page-first capture actions */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.type}
              onClick={() => setQuickAddOpen(action.type)}
              className="group rounded-xl border border-border/60 bg-background p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", action.classes)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{action.title}</p>
                <PlusCircle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* Financial snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Monthly Income</p>
              <p className="text-lg font-bold">₹{formatCurrency(monthlyIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Tracked Expenses</p>
              <p className="text-lg font-bold">₹{formatCurrency(monthlyExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <PiggyBank className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Savings</p>
              <p className="text-lg font-bold">₹{formatCurrency(totalSavings)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Goals Progress</p>
              <p className="text-lg font-bold">{goalsProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Cashflow Health
            </CardTitle>
            <CardDescription className="text-xs">Income after expenses and active SIPs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly surplus</span>
              <span className={cn("text-xl font-black", monthlySurplus >= 0 ? "text-emerald-500" : "text-rose-500")}>
                ₹{formatCurrency(monthlySurplus)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Savings intensity</span>
              <span className="text-sm font-bold">{savingsRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-primary" />
              Debt Position
            </CardTitle>
            <CardDescription className="text-xs">Lend and borrow position after repayments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Receivable</span>
              <span className="text-sm font-bold text-emerald-500">₹{formatCurrency(debtAnalytics.receivable)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Payable</span>
              <span className="text-sm font-bold text-rose-500">₹{formatCurrency(debtAnalytics.payable)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Spending & SIPs
            </CardTitle>
            <CardDescription className="text-xs">Largest spend bucket and recurring investments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground truncate">{topExpenseCategory[0]}</span>
              <span className="text-sm font-bold">₹{formatCurrency(topExpenseCategory[1])}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active SIP commitment</span>
              <span className="text-sm font-bold text-primary">₹{formatCurrency(activeSIPTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-purple-700/5">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Plan readiness: {dataReadiness.score}%</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The AI reads {dataReadiness.checks.filter((check) => check.ready).length} of {dataReadiness.checks.length} finance areas.
              {dataReadiness.missing.length > 0
                ? ` Add ${dataReadiness.missing.join(", ")} for a stronger plan.`
                : " Your dataset is broad enough for a grounded plan."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dataReadiness.checks.map((check) => (
              <Badge
                key={check.label}
                variant="outline"
                className={cn(
                  "text-[10px] font-bold",
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

      {/* Main content */}
      <div className="grid lg:grid-cols-5 gap-4 min-h-[560px]">
        {/* Chat panel */}
        <Card className="lg:col-span-3 border-border/60 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-purple-700/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Wealth Coach</CardTitle>
                <CardDescription className="text-xs">
                  Reads expenses, savings, goals, SIPs, income, accounts, and lend/borrow data
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {hasSaveablePlan && (
                  <Button variant="outline" size="sm" onClick={saveLatestPlan} className="h-8 text-xs">
                    <Bookmark className="h-3.5 w-3.5 mr-1" />
                    Save Plan
                  </Button>
                )}
                {messages.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 w-8 p-0" title="Clear chat">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 px-4 py-4" style={{ maxHeight: "420px" }}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-gradient-to-br from-violet-600 to-purple-700"
                      )}
                    >
                      {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>

                    <div className={cn("flex flex-col gap-1 max-w-[88%]", msg.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5",
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-tr-sm text-sm"
                            : msg.error
                            ? "bg-destructive/10 border border-destructive/20 rounded-tl-sm"
                            : "bg-muted/60 border border-border/40 rounded-tl-sm"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <MarkdownContent text={msg.content} />
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 px-1 flex-wrap">
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
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
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
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-t border-border/40 mt-auto">
              <div className="flex items-end gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your savings plan, goals, or wealth building..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 shadow-none resize-none outline-none min-h-0 max-h-28 text-sm p-0 focus-visible:ring-0"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-8 w-8 shrink-0 bg-gradient-to-br from-blue-600 to-violet-600"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Saved plan panel */}
        <Card className="lg:col-span-2 border-border/60 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                <div>
                  <CardTitle className="text-base">My Savings Plan</CardTitle>
                  {savedAt && (
                    <CardDescription className="text-xs">
                      Saved {savedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </CardDescription>
                  )}
                </div>
              </div>
              {savedPlan && (
                <Button variant="ghost" size="sm" onClick={clearSavedPlan} className="h-8 w-8 p-0" title="Remove saved plan">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 min-h-0">
            {savedPlan ? (
              <ScrollArea className="h-full px-4 py-4" style={{ maxHeight: "520px" }}>
                  <MarkdownContent text={savedPlan} />
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-6 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No plan saved yet</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-[220px]">
                  Chat with the coach to build your plan, then tap Save Plan to keep it here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(BUILD_PLAN_PROMPT)}
                  disabled={loading}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
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
