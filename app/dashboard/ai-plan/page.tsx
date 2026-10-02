"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useFinanceData, type Goal, type Saving } from "@/hooks/use-finance-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownContent } from "@/components/ai-plan/markdown"
import { modelDisplayLabel } from "@/lib/ai/modelConfig"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExpenseForm } from "@/components/forms/expense-form"
import { SavingsForm } from "@/components/forms/savings-form"
import { GoalForm } from "@/components/forms/goal-form"
import { SIPForm } from "@/components/forms/sip-form"
import { DebtForm } from "@/components/forms/debt-form"
import { safeNumber, formatCurrency, cn } from "@/lib/utils"
import {
  generateAIResponse,
  getAISettingsStorageKeys,
  isAIProvider,
  type AIProvider,
} from "@/lib/ai/aiClient"
import { recordAITrace } from "@/lib/ai/aiObservability"
import { AI_CHAT_HANDOFF_STORAGE_KEY } from "@/lib/ai/chatHandoff"
import {
  Sparkles,
  Send,
  Bot,
  User,
  Target,
  TrendingUp,
  PiggyBank,
  Wallet,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Zap,
  Brain,
  ArrowLeftRight,
  TrendingDown,
  BarChart3,
  Landmark,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: AIProvider
  model?: string
  isPlan?: boolean
  error?: boolean
  timestamp: Date
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm your **Finio AI Coach** — ask me anything about your finances, or tap **Build My Plan** for a full 12-month wealth roadmap.\n\nI can read your expenses, savings, goals, SIPs, income, accounts, and lend/borrow data.",
  timestamp: new Date(),
}

const BUILD_PLAN_PROMPT =
  "Build a robust monthly finance plan from all available data. Use my actual income, expenses, savings, goals, SIPs, accounts, and lend/borrow records. If assumptions are needed, state them briefly and still give a concrete plan with analytics, priorities, monthly allocation, goal progress, SIP/debt actions, and next steps."

const SUGGESTIONS = [
  "Optimize my asset allocation",
  "What are my expenses this month?",
  "Where should I cut spending?",
  "Show my goals progress",
  "Can I afford ₹50,000 more expense?",
]

const CHAT_STORAGE_KEY = "finio-ai-plan-chat"
const PLAN_STORAGE_KEY = "finio-savings-plan"

type QuickAddType = "expense" | "saving" | "goal" | "sip" | "debt" | null
type AIConfiguration = {
  provider: AIProvider
  apiKey: string
  model?: string
  userId?: string
} | null

function Alert({
  variant,
  children,
}: {
  variant: "destructive"
  children: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive",
        variant === "destructive" && "text-destructive"
      )}
    >
      {children}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function ProviderBadge({ provider, model }: { provider?: AIProvider; model?: string }) {
  if (!provider) return null
  const config: Record<AIProvider, { label: string; classes: string }> = {
    gemini: { label: "Gemini", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    groq: { label: "Groq", classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
    openrouter: {
      label: model ? `OpenRouter · ${modelDisplayLabel(model)}` : "OpenRouter",
      classes: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    },
    mistral: { label: "Mistral", classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  }
  const { label, classes } = config[provider]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
        classes
      )}
    >
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
    const availableBalance = safeNumber(saving.amount)
    return sum + (allocation.amount > 0 ? Math.min(allocation.amount, availableBalance) : availableBalance)
  }, 0)

  const inferredBackingAmount = savings
    .filter(
      (saving) =>
        (saving.linkedGoals?.length ?? 0) === 0 &&
        !allocationIds.has(saving.id) &&
        isGoalSavingNameMatch(goal, saving)
    )
    .reduce((sum, saving) => sum + safeNumber(saving.amount), 0)

  return explicitBacking + inferredBackingAmount
}

function getGoalDeadlineStatus(deadline?: string) {
  if (!deadline) return "not set"
  const parsedDeadline = new Date(`${deadline.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(parsedDeadline.getTime())) return "unrecognized date"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parsedDeadline < today ? "past; needs confirmation" : "upcoming"
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIPlanPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [savedPlan, setSavedPlan] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [savedPlanOpen, setSavedPlanOpen] = useState(false)
  const [pendingHandoffPrompt, setPendingHandoffPrompt] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState<QuickAddType>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [activePanelTab, setActivePanelTab] = useState<"chat" | "plan">("chat")
  const [maximizedPanel, setMaximizedPanel] = useState<"chat" | "plan" | null>(null)
  const [aiConfiguration, setAIConfiguration] = useState<AIConfiguration>(null)
  const [aiConfigurationLoaded, setAIConfigurationLoaded] = useState(false)
  const [aiConfigurationError, setAIConfigurationError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingHandoffSentRef = useRef(false)

  const { accounts, expenses, goals, savings, sips, debts, income, user } = useFinanceData()

  const localData = useMemo(
    () => ({ accounts, expenses, goals, savings, sips, debts, income }),
    [accounts, expenses, goals, savings, sips, debts, income]
  )
  const activeAIConfiguration =
    aiConfiguration?.userId === user?.uid ? aiConfiguration : null

  // ── Derived analytics ─────────────────────────────────────────────────────
  const monthlyIncome = income
    .filter((i) => i.frequency === "monthly")
    .reduce((sum, i) => sum + safeNumber(i.amount), 0)

  const monthlyExpenses = expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0)
  const totalSavings = savings.reduce((sum, s) => sum + safeNumber(s.amount), 0)
  const activeSIPTotal = sips
    .filter((sip) => sip.sipStatus === "active")
    .reduce((sum, sip) => sum + safeNumber(sip.amount), 0)
  const monthlySurplus = monthlyIncome - monthlyExpenses - activeSIPTotal
  const savingsRate =
    monthlyIncome > 0
      ? Math.round(((Math.max(0, monthlyIncome - monthlyExpenses)) / monthlyIncome) * 100)
      : 0

  const debtAnalytics = useMemo(() => {
    const lent = debts.filter((d) => d.type === "lent").reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const lentRepaid = debts
      .filter((d) => d.type === "lent_repayment")
      .reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const borrowed = debts
      .filter((d) => d.type === "borrowed")
      .reduce((sum, d) => sum + safeNumber(d.amount), 0)
    const borrowedRepaid = debts
      .filter((d) => d.type === "borrowed_repayment")
      .reduce((sum, d) => sum + safeNumber(d.amount), 0)
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
    const readyCount = checks.filter((c) => c.ready).length
    return {
      checks,
      score: Math.round((readyCount / checks.length) * 100),
      missing: checks.filter((c) => !c.ready).map((c) => c.label),
    }
  }, [debts.length, expenses.length, goals.length, income.length, savings.length, sips.length])

  const goalsProgress = useMemo(() => {
    if (goals.length === 0) return 0
    const totals = goals.reduce(
      (acc, goal) => {
        acc.target += safeNumber(goal.target)
        const spent = expenses
          .filter((expense) => expense.goalId === goal.id)
          .reduce((sum, expense) => sum + safeNumber(expense.amount), 0)
        acc.backed += safeNumber(goal.current) + getGoalBackingAmount(goal, savings) + spent
        return acc
      },
      { target: 0, backed: 0 }
    )
    return totals.target > 0 ? Math.min(100, Math.round((totals.backed / totals.target) * 100)) : 0
  }, [expenses, goals, savings])

  // ── Quick add config ──────────────────────────────────────────────────────
  const quickActions = [
    { type: "expense" as const, label: "Expense", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10" },
    { type: "saving" as const, label: "Saving", icon: PiggyBank, color: "text-violet-500", bg: "bg-violet-500/10" },
    { type: "goal" as const, label: "Goal", icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
    { type: "sip" as const, label: "SIP", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { type: "debt" as const, label: "Lend/Borrow", icon: ArrowLeftRight, color: "text-amber-500", bg: "bg-amber-500/10" },
  ]

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = window.setTimeout(() => {
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
        const pendingPrompt = localStorage.getItem(AI_CHAT_HANDOFF_STORAGE_KEY)
        if (pendingPrompt) setPendingHandoffPrompt(pendingPrompt)
      } catch {
        // ignore malformed storage
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let active = true
    const storageKeys = getAISettingsStorageKeys(user?.uid)
    const timer = window.setTimeout(() => {
      try {
        const configuredProvider = localStorage.getItem(storageKeys.provider)?.trim().toLowerCase()
        const apiKey = localStorage.getItem(storageKeys.apiKey)?.trim()
        const model = localStorage.getItem(storageKeys.model)?.trim()
        if (configuredProvider && apiKey && isAIProvider(configuredProvider)) {
          setAIConfiguration({ provider: configuredProvider, apiKey, model, userId: user?.uid })
        }
      } catch {
        setAIConfigurationError("Unable to read your AI settings from this browser.")
      } finally {
        if (active) setAIConfigurationLoaded(true)
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [user?.uid])

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

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim()
      if (!question || loading) return
      if (!activeAIConfiguration) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setLoading(true)
      const requestStartedAt = Date.now()

      try {
        const history = messages
          .filter((m) => m.id !== "welcome" && !m.error)
          .slice(-10)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

        const financeContext = Object.entries(localData)
          .map(([section, records]) => `${section}: ${JSON.stringify(records.slice(0, 100))}`)
          .join("\n")
        const historyContext = history
          .slice(-10)
          .map(({ role, content }) => `${role === "user" ? "User" : "Coach"}: ${content.slice(0, 1200)}`)
          .join("\n")
        const goalLedger = goals.map((goal) => {
          const availableBacking = getGoalBackingAmount(goal, savings)
          const availableCash = safeNumber(goal.current) + availableBacking
          const spent = expenses
            .filter((expense) => expense.goalId === goal.id)
            .reduce((sum, expense) => sum + safeNumber(expense.amount), 0)
          const fulfilled = availableCash + spent
          const target = safeNumber(goal.target)
          return {
            goal: goal.name,
            target,
            availableNow: availableCash,
            alreadySpentTowardGoal: spent,
            totalFulfilled: fulfilled,
            stillNeeded: Math.max(0, target - fulfilled),
            deadline: goal.deadline ?? null,
            deadlineStatus: getGoalDeadlineStatus(goal.deadline),
          }
        })
        const prompt = [
          "You are Finio Wealth Coach, a direct and data-driven personal finance assistant for Indian users.",
          "Answer the user's question using the financial data below. Do not invent financial figures. Use Indian rupee formatting and clearly state when relevant data is missing.",
          "Keep focused answers under 400 words and full plans under 650 words. Finish every list/table and end with a complete sentence; do not add unrelated sections.",
          `Today's date: ${new Date().toLocaleDateString("en-IN")}`,
          `Financial data:\n${financeContext || "No financial records are available."}`,
          `Authoritative goal ledger (use these amounts; already-spent money is achieved toward the target but is not liquid):\n${JSON.stringify(goalLedger)}`,
          "If a goal deadline is in the past, tell me it may be outdated and ask whether it should be updated or the goal is still pending with a new date. Do not treat it as a future deadline or give date-specific allocation advice until clarified.",
          "When checking short-term liquidity, count only currently available cash/assets toward liquidity. Do not ask me to save again for expenses already linked to and paid toward a goal.",
          `Computed analytics: monthly income ₹${formatCurrency(monthlyIncome)}, tracked expenses ₹${formatCurrency(monthlyExpenses)}, active SIPs ₹${formatCurrency(activeSIPTotal)}, estimated surplus ₹${formatCurrency(monthlySurplus)}, total savings ₹${formatCurrency(totalSavings)}.`,
          historyContext ? `Conversation history:\n${historyContext}` : "",
          savedPlan ? `Previously saved plan:\n${savedPlan.slice(0, 2000)}` : "",
          `User's message: ${question}`,
        ]
          .filter(Boolean)
          .join("\n\n")
        const result = await generateAIResponse(
          prompt,
          activeAIConfiguration.provider,
          activeAIConfiguration.apiKey,
          activeAIConfiguration.model
        )

        let modelFallbackNotice = ""
        let continuationNotice = ""
        let traceNotice = ""
        if (result.fallbackFrom) {
          const storageKeys = getAISettingsStorageKeys(user?.uid)
          setAIConfiguration({ ...activeAIConfiguration, model: result.model })
          try {
            localStorage.setItem(storageKeys.model, result.model)
            modelFallbackNotice = `\n\n*The selected model "${result.fallbackFrom}" was unavailable, so I automatically switched to "${result.model}" and saved that selection.*`
          } catch {
            modelFallbackNotice = `\n\n*The selected model "${result.fallbackFrom}" was unavailable, so I automatically switched to "${result.model}". Save this model in Settings to keep using it.*`
          }
        }
        if (result.incomplete) {
          const reason = result.continuationWarning
            ? `Continuation failed: ${result.continuationWarning}`
            : "The provider still reported its output limit after three continuation attempts."
          continuationNotice = `\n\n**This answer may be incomplete.** ${reason} You can ask me to continue.`
        }
        if (user) {
          try {
            await recordAITrace(await user.getIdToken(), {
              provider: result.provider,
              model: result.model,
              status: "success",
              durationMs: Date.now() - requestStartedAt,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              finishReason: result.finishReason,
              incomplete: result.incomplete,
              fallbackFrom: result.fallbackFrom,
            })
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : "LangSmith trace could not be recorded."
            traceNotice = `\n\n*LangSmith trace not recorded: ${message}*`
          }
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${result.text}${modelFallbackNotice}${continuationNotice}${traceNotice}`,
          provider: result.provider,
          model: result.model,
          isPlan: /build|create|generate|full|complete|robust|monthly|12.month/i.test(question) &&
            /\b(plan|roadmap|strategy|wealth)\b/i.test(question),
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        let traceNotice = ""
        if (user) {
          try {
            await recordAITrace(await user.getIdToken(), {
              provider: activeAIConfiguration.provider,
              model: activeAIConfiguration.model ?? "provider-default",
              status: "error",
              durationMs: Date.now() - requestStartedAt,
              errorStatus: Number(message.match(/API error \((\d{3})\)/)?.[1]) || undefined,
            })
          } catch (traceError: unknown) {
            const traceMessage =
              traceError instanceof Error
                ? traceError.message
                : "LangSmith trace could not be recorded."
            traceNotice = `\n\nLangSmith trace not recorded: ${traceMessage}`
          }
        }
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I ran into an error: **${message}**${traceNotice}`,
            error: true,
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [
      input,
      loading,
      activeAIConfiguration,
      localData,
      messages,
      savedPlan,
      expenses,
      goals,
      savings,
      monthlyIncome,
      monthlyExpenses,
      activeSIPTotal,
      monthlySurplus,
      totalSavings,
      user,
    ]
  )

  useEffect(() => {
    if (
      !pendingHandoffPrompt ||
      !aiConfigurationLoaded ||
      !activeAIConfiguration ||
      loading ||
      pendingHandoffSentRef.current
    ) {
      return
    }

    pendingHandoffSentRef.current = true
    try {
      localStorage.removeItem(AI_CHAT_HANDOFF_STORAGE_KEY)
    } catch {
      window.setTimeout(() => {
        setAIConfigurationError(
          "The AI Coach opened, but the saved request could not be cleared from this browser."
        )
      }, 0)
    }
    void sendMessage(pendingHandoffPrompt)
  }, [
    activeAIConfiguration,
    aiConfigurationLoaded,
    loading,
    pendingHandoffPrompt,
    sendMessage,
  ])

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
    if (latestPlan) { savePlan(latestPlan.content); return }
    const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.error && m.id !== "welcome")
    if (latestAssistant) savePlan(latestAssistant.content)
  }, [messages, savePlan])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    try { localStorage.removeItem(CHAT_STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const clearSavedPlan = useCallback(() => {
    setSavedPlan(null)
    setSavedAt(null)
    setSavedPlanOpen(false)
    try { localStorage.removeItem(PLAN_STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const hasSaveablePlan = messages.some((m) => m.role === "assistant" && !m.error && m.id !== "welcome")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!aiConfigurationLoaded) {
    return <div className="mx-auto w-full max-w-7xl px-3 py-6" aria-live="polite">Loading AI settings…</div>
  }

  if (!activeAIConfiguration) {
    return (
      <div className="mx-auto w-full max-w-7xl px-3 py-6">
        <Alert variant="destructive">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {aiConfigurationError ??
                "Please configure your free AI API key in Settings to use the AI Coach."}
            </p>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/dashboard/settings">Open Settings</Link>
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[28rem] max-w-7xl mx-auto w-full px-3 sm:px-5 py-4 flex flex-col gap-3 sm:gap-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shrink-0 shadow-sm">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none">AI Coach</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              Ask anything · Build your plan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedPlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSavedPlanOpen(true)}
              className="text-xs"
            >
              <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />
              Saved plan
            </Button>
          )}
          <Button
            onClick={() => sendMessage(BUILD_PLAN_PROMPT)}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-sm text-xs sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Build My Plan
          </Button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="hidden">
        {[
          {
            label: "Income",
            value: `₹${formatCurrency(monthlyIncome)}`,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Expenses",
            value: `₹${formatCurrency(monthlyExpenses)}`,
            icon: Wallet,
            color: "text-rose-400",
            bg: "bg-rose-500/10",
          },
          {
            label: "Surplus",
            value: `₹${formatCurrency(Math.max(0, monthlySurplus))}`,
            icon: Activity,
            color: monthlySurplus >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: monthlySurplus >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
          },
          {
            label: "Goals",
            value: `${goalsProgress}%`,
            icon: Target,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 shadow-sm"
          >
            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", bg)}>
              <Icon className={cn("h-3 w-3", color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground font-medium truncate">{label}</p>
              <p className="text-xs font-bold truncate leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick-add chip row ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Add
        </span>
        {quickActions.map(({ type, label, icon: Icon, color, bg }) => (
          <button
            key={type}
            onClick={() => setQuickAddOpen(type)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold",
              "bg-background hover:bg-muted/60 transition-colors active:scale-95 shrink-0"
            )}
          >
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", bg)}>
              <Icon className={cn("h-2.5 w-2.5", color)} />
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Data readiness + analytics (collapsible) ── */}
      <div className="hidden rounded-xl border border-border/50 bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-purple-600/5 overflow-hidden shrink-0">
        {/* Summary row — always visible */}
        <button
          onClick={() => setAnalyticsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold">
                Plan readiness: {dataReadiness.score}%
              </span>
              {dataReadiness.score === 100 && (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
            </div>
            {/* Chip row */}
            <div className="flex gap-1.5 overflow-hidden">
              {dataReadiness.checks.slice(0, 4).map((check) => (
                <Badge
                  key={check.label}
                  variant="outline"
                  className={cn(
                    "text-[9px] font-bold h-4 px-1.5 hidden sm:inline-flex",
                    check.ready
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                  )}
                >
                  {check.label} {check.count > 0 ? check.count : "·"}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-1.5 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                style={{ width: `${dataReadiness.score}%` }}
              />
            </div>
            {analyticsOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </div>
        </button>

        {/* Expanded analytics */}
        {analyticsOpen && (
          <div className="border-t border-border/30 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
            {/* Cashflow */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Cashflow
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Surplus</span>
                <span className={cn("font-bold", monthlySurplus >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  ₹{formatCurrency(monthlySurplus)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Savings rate</span>
                <span className="font-bold">{savingsRate}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  style={{ width: `${Math.min(savingsRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Debt */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Landmark className="h-3 w-3" /> Debt
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Receivable</span>
                <span className="font-bold text-emerald-500">₹{formatCurrency(debtAnalytics.receivable)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Payable</span>
                <span className="font-bold text-rose-500">₹{formatCurrency(debtAnalytics.payable)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Net</span>
                <span className={cn("font-bold text-xs", debtAnalytics.net >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {debtAnalytics.net >= 0 ? "+" : ""}₹{formatCurrency(debtAnalytics.net)}
                </span>
              </div>
            </div>

            {/* Spending & SIPs */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> Spending & SIPs
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[55%]">{topExpenseCategory[0]}</span>
                <span className="font-bold shrink-0">₹{formatCurrency(topExpenseCategory[1])}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active SIPs</span>
                <span className="font-bold text-primary">₹{formatCurrency(activeSIPTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total savings</span>
                <span className="font-bold text-violet-500">₹{formatCurrency(totalSavings)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile panel tab switcher ── */}
      <div className="hidden gap-0 rounded-xl border border-border/60 overflow-hidden lg:hidden bg-muted/20 shrink-0">
        <button
          onClick={() => setActivePanelTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
            activePanelTab === "chat"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          Coach
        </button>
        <button
          onClick={() => setActivePanelTab("plan")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
            activePanelTab === "plan"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookmarkCheck className="h-3.5 w-3.5" />
          My Plan
          {savedPlan && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />}
        </button>
      </div>

      {/* ── Main panels ── */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full flex-1 min-h-0">

        {/* ── Chat panel ── */}
        <Card
          className="col-span-1 flex h-full min-h-0 flex-col overflow-hidden border-border/60"
        >
          <CardHeader className="py-3 px-4 border-b border-border/40 bg-gradient-to-r from-blue-600/5 to-violet-600/5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold">Wealth Coach</CardTitle>
                <CardDescription className="text-[10px] hidden sm:block mt-0.5">
                  Ask any finance question — or tap suggestions below
                </CardDescription>
              </div>
              <div className="flex gap-1 shrink-0">
                {hasSaveablePlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveLatestPlan}
                    className="h-7 text-[10px] px-2.5 gap-1"
                  >
                    <Bookmark className="h-3 w-3" />
                    <span className="hidden sm:inline">Save Plan</span>
                  </Button>
                )}
                {savedPlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSavedPlanOpen(true)}
                    className="h-7 text-[10px] px-2.5 gap-1"
                  >
                    <BookmarkCheck className="h-3 w-3" />
                    <span className="hidden sm:inline">View saved plan</span>
                  </Button>
                )}
                {messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-gradient-to-br from-violet-600 to-purple-700"
                      )}
                    >
                      {msg.role === "user"
                        ? <User className="h-3.5 w-3.5 text-white" />
                        : <Bot className="h-3.5 w-3.5 text-white" />
                      }
                    </div>

                    {/* Bubble */}
                    <div
                      className={cn(
                        "flex flex-col gap-1.5 max-w-[88%] min-w-0",
                        msg.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 max-w-full min-w-0 overflow-hidden text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-tr-sm"
                            : msg.error
                            ? "bg-destructive/10 border border-destructive/20 rounded-tl-sm"
                            : "bg-muted/60 border border-border/40 rounded-tl-sm"
                        )}
                      >
                        {msg.role === "assistant"
                          ? <MarkdownContent text={msg.content} />
                          : <p>{msg.content}</p>
                        }
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-1.5 px-1 flex-wrap">
                        {msg.isPlan && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/8"
                          >
                            Full Plan
                          </Badge>
                        )}
                        {msg.provider && <ProviderBadge provider={msg.provider} model={msg.model} />}
                        {msg.role === "assistant" && !msg.error && msg.id !== "welcome" && msg.isPlan && (
                          <button
                            onClick={() => savePlan(msg.content)}
                            className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                          >
                            <Bookmark className="h-2.5 w-2.5" />
                            Save
                          </button>
                        )}
                        <span className="text-[9px] text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
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
                            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Suggestion chips — only when chat is fresh */}
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
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-border/40 mt-auto">
              <div className="flex items-end gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about expenses, goals, savings, or build a plan…"
                  rows={1}
                  className="flex-1 bg-transparent border-0 shadow-none resize-none outline-none min-h-0 max-h-28 text-sm p-0 focus-visible:ring-0"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-8 w-8 shrink-0 bg-gradient-to-br from-blue-600 to-violet-600 shadow-sm"
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

        {/* ── Saved Plan panel ── */}
        <Card
          className="hidden"
        >
          <CardHeader className="py-3 px-4 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BookmarkCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-sm font-bold">My Savings Plan</CardTitle>
                  {savedAt && (
                    <CardDescription className="text-[10px] truncate mt-0.5">
                      Saved{" "}
                      {savedAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </CardDescription>
                  )}
                </div>
              </div>
              {savedPlan && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSavedPlan}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  title="Remove saved plan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMaximizedPanel(p => p === "plan" ? null : "plan")}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hidden lg:flex"
                title={maximizedPanel === "plan" ? "Restore" : "Maximize"}
              >
                {maximizedPanel === "plan" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
            {savedPlan ? (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 w-full">
                <div className="max-w-full min-w-0 pr-1">
                  <MarkdownContent text={savedPlan} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[280px] px-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 shadow-sm">
                  <BookmarkCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1.5">No plan saved yet</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-[200px] leading-relaxed">
                  Generate a plan from the coach, then tap <strong>Save Plan</strong> to keep it here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sendMessage(BUILD_PLAN_PROMPT)
                    setActivePanelTab("chat")
                  }}
                  disabled={loading}
                  className="text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Full Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Form dialogs ── */}
      <ExpenseForm
        open={quickAddOpen === "expense"}
        onOpenChange={(open) => setQuickAddOpen(open ? "expense" : null)}
      />
      <SavingsForm
        open={quickAddOpen === "saving"}
        onOpenChange={(open) => setQuickAddOpen(open ? "saving" : null)}
      />
      <GoalForm
        open={quickAddOpen === "goal"}
        onOpenChange={(open) => setQuickAddOpen(open ? "goal" : null)}
      />
      <SIPForm
        open={quickAddOpen === "sip"}
        onOpenChange={(open) => setQuickAddOpen(open ? "sip" : null)}
      />
      <DebtForm
        open={quickAddOpen === "debt"}
        onOpenChange={(open) => setQuickAddOpen(open ? "debt" : null)}
      />
      <Dialog open={savedPlanOpen} onOpenChange={setSavedPlanOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>My Savings Plan</DialogTitle>
            <DialogDescription>
              {savedAt
                ? `Saved ${savedAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Your saved plan"}
            </DialogDescription>
          </DialogHeader>
          {savedPlan && <MarkdownContent text={savedPlan} />}
          <div className="flex justify-end">
            <Button variant="outline" onClick={clearSavedPlan}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove saved plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}