// app/dashboard/savings/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { SAVINGS_HISTORY, SAVINGS_TYPES } from "@/constants/finance"
import { Plus, TrendingUp, CalendarDays, Edit2, Trash2, Shield, Building, AppWindow as AppIcon, ArrowUpDown, ChevronLeft, ChevronRight, Info, PiggyBank, Target, ShieldAlert, Clock, Sparkles } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts"
import { SavingsForm } from "@/components/forms/savings-form"
import { useFinanceData, Saving, Goal } from "@/hooks/use-finance-data"
import { getGoalProgress } from "@/lib/goalProgress"
import { useState, useMemo } from "react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AI_CHAT_HANDOFF_STORAGE_KEY,
  ASSET_ALLOCATION_PROMPT,
} from "@/lib/ai/chatHandoff"

// Ledger event type styling
const TX_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  CREATED:            { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Created" },
  EXPENSE_DEDUCTION:  { color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",       label: "Deducted" },
  EXPENSE_REVERSED:   { color: "text-sky-600 dark:text-sky-400",      bg: "bg-sky-500/10 border-sky-500/20",         label: "Reversed" },
  TRANSFERRED:        { color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",     label: "Transferred" },
  MANUAL_ADJUSTMENT:  { color: "text-violet-600 dark:text-violet-400",bg: "bg-violet-500/10 border-violet-500/20",   label: "Adjusted" },
  SWAPPED_IN:         { color: "text-teal-600 dark:text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20",       label: "Swapped In" },
  SWAPPED_OUT:        { color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-500/10 border-orange-500/20",   label: "Swapped Out" },
}

const FILTER_PILLS = [
  "All",
  "High Liquidity (Bank, Cash)",
  "Locked (FD, PPF)",
  "Market (MF, Stocks)",
] as const

const PIE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
]

const TYPE_NAME_MAP: Record<string, string> = {
  fd: "FD",
  mf: "Mutual Funds",
  etf: "ETF",
  ppf: "PPF",
  pf: "PF",
  savings_account: "Bank / Savings",
  rd: "RD",
  nps: "NPS",
  stocks: "Stocks",
  gold: "Gold / SGB",
  crypto: "Crypto",
  other: "Other",
}

const matchesActiveFilter = (sav: Saving, filter: string): boolean => {
  if (filter === "All") return true
  const type = (sav.type || "").toLowerCase()
  const name = (sav.name || "").toLowerCase()

  if (filter === "High Liquidity (Bank, Cash)") {
    return (
      type === "savings_account" ||
      type === "cash" ||
      type === "bank" ||
      name.includes("cash") ||
      name.includes("bank") ||
      name.includes("savings")
    )
  }

  if (filter === "Locked (FD, PPF)") {
    return (
      type === "fd" ||
      type === "ppf" ||
      type === "pf" ||
      type === "rd" ||
      type === "nps" ||
      name.includes("fd") ||
      name.includes("fixed deposit") ||
      name.includes("ppf") ||
      name.includes("provident")
    )
  }

  if (filter === "Market (MF, Stocks)") {
    return (
      type === "mf" ||
      type === "stocks" ||
      type === "etf" ||
      type === "gold" ||
      type === "crypto" ||
      name.includes("mutual fund") ||
      name.includes("mf") ||
      name.includes("stock") ||
      name.includes("etf") ||
      name.includes("share")
    )
  }

  return true
}

export default function SavingsPage() {
  const router = useRouter()
  const { savings, deleteSaving, apps, addApp, providers, addProvider, goals, expenses, savingTransactions, isDemo } = useFinanceData()
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // Filter Pills State
  const [activeFilter, setActiveFilter] = useState<string>("All")

  // AI Optimizer State
  const [optimizerOpen, setOptimizerOpen] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Saving Assets Table State
  const [savingSearchTerm, setSavingSearchTerm] = useState("")
  const [savingOwnerFilter, setSavingOwnerFilter] = useState("all")
  const [savingSortBy, setSavingSortBy] = useState<"name" | "owner" | "amount">("name")
  const [savingSortOrder, setSavingSortOrder] = useState<"asc" | "desc">("asc")
  const [savingCurrentPage, setSavingCurrentPage] = useState(1)
  const savingRowsPerPage = 5

  // Goals Table State
  const [goalSearchTerm, setGoalSearchTerm] = useState("")
  const [goalSortBy, setGoalSortBy] = useState<"name" | "target" | "progress">("name")
  const [goalSortOrder, setGoalSortOrder] = useState<"asc" | "desc">("asc")
  const [goalCurrentPage, setGoalCurrentPage] = useState(1)
  const goalRowsPerPage = 5

  // Dialog Details States
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null)
  const [savingDetailsOpen, setSavingDetailsOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [goalDetailsOpen, setGoalDetailsOpen] = useState(false)

  // Apps & Providers Local Inputs
  const [newAppName, setNewAppName] = useState("")
  const [newProviderName, setNewProviderName] = useState("")

  const totalSaved = savings.reduce((s, m) => s + safeNumber(m.amount), 0)
  const avgMonthlySaved = Math.round(totalSaved / 6) // Dynamic estimate

  const dynamicSavingsHistory = (isDemo && savings.length > 0)
    ? SAVINGS_HISTORY 
    : (savings.length > 0 
        ? [
            { month: "Current", saved: totalSaved }
          ]
        : []
      )

  const hasSavingsTrend = dynamicSavingsHistory.length > 0

  // Find Type Label
  const TYPE_MAP = SAVINGS_TYPES.reduce((acc, t) => {
    acc[t.value] = t.label
    return acc
  }, {} as Record<string, string>)

  // Grouped savings for asset distribution PieChart
  const groupedSavings = useMemo(() => {
    const map: Record<string, number> = {}
    savings.forEach((s) => {
      const raw = (s.type || "other").toLowerCase()
      const typeLabel = TYPE_NAME_MAP[raw] || TYPE_MAP[raw]?.replace(/^[^\s]+\s+/, "") || s.type || "Other"
      map[typeLabel] = (map[typeLabel] || 0) + safeNumber(s.amount)
    })
    return Object.entries(map).map(([type, amount]) => ({
      type,
      amount,
    }))
  }, [savings, TYPE_MAP])

  const handleOptimizeAllocation = () => {
    setAiError(null)
    try {
      localStorage.setItem(AI_CHAT_HANDOFF_STORAGE_KEY, ASSET_ALLOCATION_PROMPT)
      setOptimizerOpen(false)
      router.push("/dashboard/ai-plan")
    } catch (error: unknown) {
      setAiError(
        error instanceof Error
          ? `Could not open the AI Coach: ${error.message}`
          : "Could not open the AI Coach. Please try again."
      )
      setOptimizerOpen(true)
    }
  }

  const getSavingsGoalIds = (sav: Saving) => {
    const ids = new Set<string>(sav.linkedGoals || [])
    goals.forEach((g) => {
      if (g.savings_allocations?.some((alloc) => alloc.id === sav.id)) {
        ids.add(g.id)
      }
      if (g.savings_ids?.includes(sav.id)) {
        ids.add(g.id)
      }
    })
    return Array.from(ids)
  }

  // Handle addition
  const handleAddAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAppName.trim()) return
    await addApp(newAppName.trim())
    setNewAppName("")
    alert(`"${newAppName}" registered successfully!`)
  }

  const handleAddProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProviderName.trim()) return
    await addProvider(newProviderName.trim())
    setNewProviderName("")
    alert(`"${newProviderName}" registered successfully!`)
  }

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-md border border-border/80 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{payload[0].payload.month || "Month"}</p>
          <p className="text-sm font-black text-foreground mt-1">₹{formatCurrency(payload[0]?.value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Savings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Link, audit, and project your financial security cushions</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Button 
            variant="secondary" 
            className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={handleOptimizeAllocation}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Optimize Allocation</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingSaving(null)
              setFormOpen(true)
            }}
            className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Saving</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground">Total Cumulative Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight break-all">₹{formatCurrency(totalSaved)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              Active Growth
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground">Monthly Liquidation Avg</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight break-all">₹{formatCurrency(avgMonthlySaved)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-muted-foreground bg-muted">
              per month (estimated)
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground">Diversified Products</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{savings.length}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-muted-foreground bg-muted">
              active assets
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Asset Distribution Chart */}
      <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold font-sans">Asset Distribution</CardTitle>
            <CardDescription className="text-xs">Portfolio allocation breakdown by asset type</CardDescription>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            className="gap-2 self-start sm:self-auto text-xs"
            onClick={handleOptimizeAllocation}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Optimize Allocation</span>
          </Button>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-2 min-w-0 max-w-full overflow-hidden">
          {groupedSavings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8">No savings assets recorded yet.</p>
          ) : (
            <div className="w-full h-[260px] min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupedSavings}
                    dataKey="amount"
                    nameKey="type"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                  >
                    {groupedSavings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹${formatCurrency(Number(value))}`, "Amount"]} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="w-full min-w-0 max-w-full">
        <div className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1">
          <TabsList variant="line" className="w-max sm:w-full min-w-full justify-start">
            <TabsTrigger value="list" className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs shrink-0">
              <span>🐷</span>
              <span>Savings Assets</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs shrink-0">
              <span>🎯</span>
              <span>Savings Goals</span>
            </TabsTrigger>
            <TabsTrigger value="trend" className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs shrink-0">
              <span>📈</span>
              <span>Historical Trend</span>
            </TabsTrigger>
            <TabsTrigger value="registry" className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs shrink-0">
              <span>💼</span>
              <span>Apps & Providers</span>
            </TabsTrigger>
          </TabsList>
        </div>
          
          {/* Tab 1: Savings List Table */}
          <TabsContent value="list" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 space-y-0 gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold font-sans">Active Financial Assets</CardTitle>
                  <CardDescription className="text-xs">Linked saving deposits, SIP mutual funds, and equities</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search name, app, provider..."
                    value={savingSearchTerm}
                    onChange={(e) => {
                      setSavingSearchTerm(e.target.value)
                      setSavingCurrentPage(1)
                    }}
                    className="h-8 text-xs w-full sm:w-[180px] bg-background"
                  />
                  <Select
                    value={savingOwnerFilter}
                    onValueChange={(val) => {
                      setSavingOwnerFilter(val)
                      setSavingCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-background">
                      <SelectValue placeholder="All Owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👤 All Owners</SelectItem>
                      {Array.from(new Set(savings.map((s) => s.owner).filter(Boolean))).map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full max-w-full min-w-0">
                  {FILTER_PILLS.map((pill) => {
                    const isActive = activeFilter === pill
                    return (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => {
                          setActiveFilter(pill)
                          setSavingCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                        }`}
                      >
                        {pill}
                      </button>
                    )
                  })}
                </div>

                {(() => {
                  const filteredAndSortedSavings = savings
                    .filter((sav) => {
                      const matchedApp = apps.find(a => a.value === sav.app)?.label || sav.app
                      const matchedProvider = providers.find(p => p.value === sav.provider)?.label || sav.provider
                      const matchOwner = savingOwnerFilter === "all" || sav.owner === savingOwnerFilter
                      const matchSearch =
                        sav.name.toLowerCase().includes(savingSearchTerm.toLowerCase()) ||
                        matchedApp.toLowerCase().includes(savingSearchTerm.toLowerCase()) ||
                        matchedProvider.toLowerCase().includes(savingSearchTerm.toLowerCase()) ||
                        sav.owner.toLowerCase().includes(savingSearchTerm.toLowerCase())
                      const matchFilter = matchesActiveFilter(sav, activeFilter)
                      return matchOwner && matchSearch && matchFilter
                    })
                    .sort((a, b) => {
                      let comparison = 0
                      if (savingSortBy === "name") {
                        comparison = a.name.localeCompare(b.name)
                      } else if (savingSortBy === "owner") {
                        comparison = a.owner.localeCompare(b.owner)
                      } else if (savingSortBy === "amount") {
                        comparison = safeNumber(a.amount) - safeNumber(b.amount)
                      }
                      return savingSortOrder === "asc" ? comparison : -comparison
                    })

                  const totalPages = Math.ceil(filteredAndSortedSavings.length / savingRowsPerPage)
                  const paginatedSavings = filteredAndSortedSavings.slice(
                    (savingCurrentPage - 1) * savingRowsPerPage,
                    savingCurrentPage * savingRowsPerPage
                  )

                  const handleSort = (field: "name" | "owner" | "amount") => {
                    if (savingSortBy === field) {
                      setSavingSortOrder(savingSortOrder === "asc" ? "desc" : "asc")
                    } else {
                      setSavingSortBy(field)
                      setSavingSortOrder("asc")
                    }
                    setSavingCurrentPage(1)
                  }

                  if (filteredAndSortedSavings.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground font-medium">No active assets registered. Link your savings now!</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {/* Mobile Card List (<md) */}
                      <div className="space-y-3 md:hidden">
                        {paginatedSavings.map((sav) => {
                          const matchedApp = apps.find(a => a.value === sav.app)?.label || sav.app
                          const matchedProvider = providers.find(p => p.value === sav.provider)?.label || sav.provider
                          const fullTypeLabel = TYPE_MAP[sav.type] || sav.type
                          const typeIcon = fullTypeLabel.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "💰"
                          const goalIds = getSavingsGoalIds(sav)

                          return (
                            <div key={sav.id} className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="text-xl shrink-0 mt-0.5">{typeIcon}</span>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-foreground truncate">{sav.name}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                      <span>👤 {sav.owner}</span>
                                      <span>·</span>
                                      <span>📱 {matchedApp}</span>
                                      <span>·</span>
                                      <span>🏦 {matchedProvider}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-black text-sm text-foreground">₹{formatCurrency(sav.amount)}</p>
                                  <p className="text-[10px] text-muted-foreground font-semibold">{sav.frequency || "One-time"}</p>
                                </div>
                              </div>

                              {goalIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {goalIds.map((gid) => {
                                    const goalMatch = goals.find((g) => g.id === gid)
                                    return goalMatch ? (
                                      <Badge key={gid} variant="outline" className="text-[9px] font-bold py-0.5 px-1.5 bg-primary/5 text-primary border-primary/15">
                                        🎯 {goalMatch.name}
                                      </Badge>
                                    ) : null
                                  })}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground bg-muted/60">
                                  {fullTypeLabel}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      setSelectedSaving(sav)
                                      setSavingDetailsOpen(true)
                                    }}
                                  >
                                    <Info className="h-3.5 w-3.5 mr-1" />
                                    Details
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingSaving(sav)
                                      setFormOpen(true)
                                    }}
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      if (confirm(`Delete saving asset ${sav.name}?`)) {
                                        deleteSaving(sav.id)
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop Table (md+) */}
                      <div className="rounded-xl border border-border/40 overflow-x-auto bg-background/30 w-full hidden md:block">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                                <div className="flex items-center gap-1">
                                  <span>Asset</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("owner")}>
                                <div className="flex items-center gap-1">
                                  <span>Owner</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead>Platform / Institution</TableHead>
                              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("amount")}>
                                <div className="flex items-center gap-1 justify-end">
                                  <span>Amount</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSavings.map((sav) => {
                              const matchedApp = apps.find(a => a.value === sav.app)?.label || sav.app
                              const matchedProvider = providers.find(p => p.value === sav.provider)?.label || sav.provider
                              const fullTypeLabel = TYPE_MAP[sav.type] || sav.type
                              const typeIcon = fullTypeLabel.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "💰"

                              return (
                                <TableRow key={sav.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{typeIcon}</span>
                                      <div>
                                        <p className="font-bold text-xs">{sav.name}</p>
                                        {getSavingsGoalIds(sav).length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {getSavingsGoalIds(sav).map((gid) => {
                                              const goalMatch = goals.find((g) => g.id === gid)
                                              return goalMatch ? (
                                                <Badge key={gid} variant="outline" className="text-[8px] font-bold py-0 px-1 bg-primary/5 text-primary border-primary/10">
                                                  🎯 {goalMatch.name}
                                                </Badge>
                                              ) : null
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs font-semibold text-muted-foreground">👤 {sav.owner}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    <span>📱 {matchedApp}</span>
                                    <span className="mx-1.5">·</span>
                                    <span>🏦 {matchedProvider}</span>
                                  </TableCell>
                                  <TableCell className="font-black text-xs text-foreground text-right">
                                    <p>₹{formatCurrency(sav.amount)}</p>
                                    <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{sav.frequency || "One-time"}</p>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          setSelectedSaving(sav)
                                          setSavingDetailsOpen(true)
                                        }}
                                        title="View Details"
                                      >
                                        <Info className="h-3.5 w-3.5 text-primary" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          setEditingSaving(sav)
                                          setFormOpen(true)
                                        }}
                                        title="Edit"
                                      >
                                        <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          if (confirm(`Delete saving asset ${sav.name}?`)) {
                                            deleteSaving(sav.id)
                                          }
                                        }}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-1 text-xs">
                          <p className="text-muted-foreground font-semibold text-center sm:text-left text-[11px] sm:text-xs">
                            Showing {(savingCurrentPage - 1) * savingRowsPerPage + 1}–{Math.min(savingCurrentPage * savingRowsPerPage, filteredAndSortedSavings.length)} of {filteredAndSortedSavings.length} entries
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={savingCurrentPage === 1}
                              onClick={() => setSavingCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="font-bold px-2">{savingCurrentPage} / {totalPages}</span>
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={savingCurrentPage === totalPages}
                              onClick={() => setSavingCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Savings Trend Area Chart */}
          <TabsContent value="trend" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-bold">Historical Net Reserves</CardTitle>
                <CardDescription className="text-xs">Cumulative saving allocations (Last 6 months)</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {!hasSavingsTrend ? (
                  <div className="flex flex-col items-center justify-center h-[280px] sm:h-[300px] text-center px-4">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No historical reserves recorded</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Add savings assets to display your net historical reserves curve.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-[280px] sm:h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dynamicSavingsHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.08)" vertical={false} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                        <Area
                          type="monotone"
                          dataKey="saved"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fill="url(#savingsGrad)"
                          className="transition-all duration-300"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Apps & Providers Dynamic Registry */}
          <TabsContent value="registry" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* App Registry */}
              <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <AppIcon className="h-4.5 w-4.5 text-primary" />
                    <span>Manage Platform Apps</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Register brokerage or investment apps</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddAppSubmit} className="flex gap-2">
                    <Input
                      placeholder="e.g. Kuvera, Coin..."
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      className="h-9 text-xs rounded-lg flex-1 min-w-0"
                    />
                    <Button type="submit" size="sm" className="font-semibold text-xs h-9 shrink-0">
                      Register App
                    </Button>
                  </form>
                  <Separator className="bg-border/30" />
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {apps.map(app => (
                      <div key={app.value} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40 text-xs font-semibold">
                        <span>📱 {app.label}</span>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground font-mono">
                          {app.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Provider Registry */}
              <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Building className="h-4.5 w-4.5 text-primary" />
                    <span>Manage Fund Houses</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Register asset management banks or houses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddProviderSubmit} className="flex gap-2">
                    <Input
                      placeholder="e.g. SURYODAY SFB, Motilal..."
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      className="h-9 text-xs rounded-lg flex-1 min-w-0"
                    />
                    <Button type="submit" size="sm" className="font-semibold text-xs h-9 shrink-0">
                      Register Provider
                    </Button>
                  </form>
                  <Separator className="bg-border/30" />
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {providers.map(prov => (
                      <div key={prov.value} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40 text-xs font-semibold">
                        <span>🏦 {prov.label}</span>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground font-mono">
                          {prov.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Goals list table */}
          <TabsContent value="goals" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 space-y-0 gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold font-sans">Financial Milestone backing</CardTitle>
                  <CardDescription className="text-xs">Goals list with backing asset allocations. Edits allowed on Goals page.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search goals..."
                    value={goalSearchTerm}
                    onChange={(e) => {
                      setGoalSearchTerm(e.target.value)
                      setGoalCurrentPage(1)
                    }}
                    className="h-8 text-xs w-full sm:w-[180px] bg-background"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Helper to query linked savings details for any goal
                  const getGoalSavingsBackingLocal = (g: Goal) => {
                    const allocations = (g.savings_allocations && g.savings_allocations.length > 0)
                      ? g.savings_allocations
                      : (g.savings_ids || []).map((id) => ({ id, amount: 0 }))

                    const fallbackAllocations = savings
                      .filter((s) => s.linkedGoals?.includes(g.id) && !allocations.some((alloc) => alloc.id === s.id))
                      .map((s) => ({ id: s.id, amount: 0 }))

                    const combined = [...allocations, ...fallbackAllocations]

                    return combined
                      .map((alloc) => {
                        const saving = savings.find((s) => s.id === alloc.id)
                        if (!saving) return null
                        const effectiveAmount = alloc.amount > 0 ? alloc.amount : saving.amount
                        return {
                          saving,
                          allocatedAmount: alloc.amount,
                          amount: effectiveAmount,
                        }
                      })
                      .filter((item): item is { saving: Saving; allocatedAmount: number; amount: number } => item !== null)
                  }

                  const filteredAndSortedGoals = goals
                    .filter((g) => g.name.toLowerCase().includes(goalSearchTerm.toLowerCase()))
                    .sort((a, b) => {
                      let comparison = 0
                      if (goalSortBy === "name") {
                        comparison = a.name.localeCompare(b.name)
                      } else if (goalSortBy === "target") {
                        comparison = safeNumber(a.target) - safeNumber(b.target)
                      } else if (goalSortBy === "progress") {
                        const backingA = getGoalSavingsBackingLocal(a).reduce((sum, item) => sum + safeNumber(item.amount), 0)
                        const spentA = expenses.filter(e => e.goalId === a.id).reduce((sum, e) => sum + safeNumber(e.amount), 0)
                        const progressA = safeNumber(a.current) + backingA + spentA
                        
                        const backingB = getGoalSavingsBackingLocal(b).reduce((sum, item) => sum + safeNumber(item.amount), 0)
                        const spentB = expenses.filter(e => e.goalId === b.id).reduce((sum, e) => sum + safeNumber(e.amount), 0)
                        const progressB = safeNumber(b.current) + backingB + spentB
                        
                        comparison = progressA - progressB
                      }
                      return goalSortOrder === "asc" ? comparison : -comparison
                    })

                  const totalPages = Math.ceil(filteredAndSortedGoals.length / goalRowsPerPage)
                  const paginatedGoals = filteredAndSortedGoals.slice(
                    (goalCurrentPage - 1) * goalRowsPerPage,
                    goalCurrentPage * goalRowsPerPage
                  )

                  const handleSort = (field: "name" | "target" | "progress") => {
                    if (goalSortBy === field) {
                      setGoalSortOrder(goalSortOrder === "asc" ? "desc" : "asc")
                    } else {
                      setGoalSortBy(field)
                      setGoalSortOrder("asc")
                    }
                    setGoalCurrentPage(1)
                  }

                  if (filteredAndSortedGoals.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground font-medium">No backing goals registered.</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {/* Mobile Goals Cards (<md) */}
                      <div className="space-y-3 md:hidden">
                        {paginatedGoals.map((g) => {
                          const backing = getGoalSavingsBackingLocal(g)
                          const totalBacking = backing.reduce((sum, item) => sum + safeNumber(item.amount), 0)
                          const totalSpent = expenses.filter(e => e.goalId === g.id).reduce((sum, e) => sum + safeNumber(e.amount), 0)
                          const netSaved = safeNumber(g.current) + totalBacking + totalSpent
                          const pct = safeNumber(g.target) > 0 ? Math.min(100, Math.round((netSaved / safeNumber(g.target)) * 100)) : 0
                          const done = pct === 100

                          return (
                            <div key={g.id} className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${g.color || "bg-primary"}`} />
                                  <span className="font-bold text-sm text-foreground truncate">{g.name}</span>
                                  {done && (
                                    <Badge className="bg-emerald-600/90 text-white border-none font-bold text-[8px] py-0 px-1 shrink-0">
                                      ✓ Met
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10 shrink-0"
                                  onClick={() => {
                                    setSelectedGoal(g)
                                    setGoalDetailsOpen(true)
                                  }}
                                >
                                  <Info className="h-3.5 w-3.5 mr-1" />
                                  Details
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-semibold">Total Saved</p>
                                  <p className="font-extrabold text-sm text-primary">₹{formatCurrency(netSaved)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground font-semibold">Target</p>
                                  <p className="font-bold text-sm text-foreground">₹{formatCurrency(g.target)}</p>
                                </div>
                              </div>

                              <div className="space-y-1 pt-1">
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                                  <span>Progress</span>
                                  <span>{pct}%</span>
                                </div>
                                <Progress value={pct} className="h-2" />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {g.deadline ? `Due ${g.deadline}` : "No deadline"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {backing.length} linked asset{backing.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop Goals Table (md+) */}
                      <div className="rounded-xl border border-border/40 overflow-x-auto bg-background/30 w-full hidden md:block">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                                <div className="flex items-center gap-1">
                                  <span>Goal Name</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("target")}>
                                <div className="flex items-center gap-1 justify-end">
                                  <span>Target</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("progress")}>
                                <div className="flex items-center gap-1 justify-end">
                                  <span>Total Saved</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead>Deadline</TableHead>
                              <TableHead>Progress bar</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedGoals.map((g) => {
                              const backing = getGoalSavingsBackingLocal(g)
                              const totalBacking = backing.reduce((sum, item) => sum + safeNumber(item.amount), 0)
                              const totalSpent = expenses.filter(e => e.goalId === g.id).reduce((sum, e) => sum + safeNumber(e.amount), 0)
                              const netSaved = safeNumber(g.current) + totalBacking + totalSpent
                              const pct = safeNumber(g.target) > 0 ? Math.min(100, Math.round((netSaved / safeNumber(g.target)) * 100)) : 0
                              const done = pct === 100

                              return (
                                <TableRow key={g.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${g.color || "bg-primary"}`} />
                                      <span className="font-bold text-xs">{g.name}</span>
                                      {done && (
                                        <Badge className="bg-emerald-600/90 text-white border-none font-bold text-[8px] py-0 px-1">
                                          ✓ Met
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-bold text-xs text-right">₹{formatCurrency(g.target)}</TableCell>
                                  <TableCell className="font-extrabold text-xs text-primary text-right">₹{formatCurrency(netSaved)}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground font-semibold">{g.deadline || "No deadline"}</TableCell>
                                  <TableCell className="min-w-[120px]">
                                    <div className="flex items-center gap-2">
                                      <Progress value={pct} className="h-2 flex-1" />
                                      <span className="text-[10px] font-bold text-muted-foreground shrink-0">{pct}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => {
                                        setSelectedGoal(g)
                                        setGoalDetailsOpen(true)
                                      }}
                                      title="View Details Only"
                                    >
                                      <Info className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-1 text-xs">
                          <p className="text-muted-foreground font-semibold text-center sm:text-left text-[11px] sm:text-xs">
                            Showing {(goalCurrentPage - 1) * goalRowsPerPage + 1}–{Math.min(goalCurrentPage * goalRowsPerPage, filteredAndSortedGoals.length)} of {filteredAndSortedGoals.length} entries
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={goalCurrentPage === 1}
                              onClick={() => setGoalCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="font-bold px-2">{goalCurrentPage} / {totalPages}</span>
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={goalCurrentPage === totalPages}
                              onClick={() => setGoalCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Editing dialog hookup */}
      <SavingsForm
        initialData={editingSaving}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* ─── SAVING ASSETS DETAILS DIALOG ─── */}
      <Dialog open={savingDetailsOpen} onOpenChange={setSavingDetailsOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>🐷 Saving Asset:</span>
              <span className="text-primary">{selectedSaving?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit linked details and allocations for this resource.
            </DialogDescription>
          </DialogHeader>

          {selectedSaving && (() => {
            const matchedApp = apps.find(a => a.value === selectedSaving.app)?.label || selectedSaving.app
            const matchedProvider = providers.find(p => p.value === selectedSaving.provider)?.label || selectedSaving.provider
            const fullTypeLabel = TYPE_MAP[selectedSaving.type] || selectedSaving.type

            return (
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 sm:p-4 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asset Balance</p>
                      <p className="text-lg font-black mt-0.5">₹{formatCurrency(selectedSaving.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Owner</p>
                      <p className="text-sm font-bold text-foreground mt-1">👤 {selectedSaving.owner}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product Type</p>
                      <p className="text-xs font-semibold mt-1 capitalize">{fullTypeLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Frequency</p>
                      <p className="text-xs font-semibold mt-1 capitalize">{selectedSaving.frequency || "One-time"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Platform App</p>
                      <p className="text-xs font-semibold mt-1">📱 {matchedApp}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Institution / Fund House</p>
                      <p className="text-xs font-semibold mt-1">🏦 {matchedProvider}</p>
                    </div>
                  </div>
                </div>

                {/* Ledger Timeline */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Asset Ledger Timeline</span>
                  </h4>
                  <Separator className="bg-border/30" />
                  {(() => {
                    const txs = savingTransactions
                      .filter((tx) => tx.savingId === selectedSaving.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                    if (txs.length === 0) {
                      return (
                        <div className="text-center py-5 border border-dashed rounded-lg bg-muted/10">
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                          <p className="text-xs text-muted-foreground font-semibold">No ledger events recorded yet.</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Events appear when you add, edit, or link expenses to this asset.</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {txs.map((tx) => {
                          const style = TX_TYPE_STYLES[tx.type] ?? { color: "text-muted-foreground", bg: "bg-muted/40 border-border/30", label: tx.type }
                          const isDeduction = tx.type === "EXPENSE_DEDUCTION" || tx.type === "SWAPPED_OUT"
                          return (
                            <div key={tx.id} className="flex items-start justify-between p-2.5 rounded-lg border bg-background/50 text-xs gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <Badge className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 border ${style.bg} ${style.color}`}>
                                  {style.label}
                                </Badge>
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    {new Date(tx.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                  {tx.metadata && (() => {
                                    try {
                                      const meta = JSON.parse(tx.metadata)
                                      if (meta.expenseId) return <p className="text-[9px] text-muted-foreground/70 font-medium">Expense ref: {meta.expenseId}</p>
                                      if (meta.direction) return <p className="text-[9px] text-muted-foreground/70 font-medium">{meta.direction === "in" ? "Linked to" : "Unlinked from"} goal</p>
                                      return null
                                    } catch { return <p className="text-[9px] text-muted-foreground/70">{String(tx.metadata).slice(0, 40)}</p> }
                                  })()}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`font-black text-xs ${isDeduction ? "text-rose-500" : "text-emerald-500"}`}>
                                  {isDeduction ? "-" : "+"}₹{formatCurrency(tx.amount)}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Bal: ₹{formatCurrency(tx.balanceAfter)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Backing Goals */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-primary" />
                    <span>Backing Milestones</span>
                  </h4>
                  <Separator className="bg-border/30" />
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {getSavingsGoalIds(selectedSaving).length === 0 ? (
                      <div className="text-center py-4 border border-dashed rounded-lg">
                        <p className="text-[11px] text-muted-foreground font-semibold">Not allocated to any goal.</p>
                      </div>
                    ) : (
                      getSavingsGoalIds(selectedSaving).map((gid) => {
                        const goalMatch = goals.find((g) => g.id === gid)
                        if (!goalMatch) return null
                        return (
                          <div key={gid} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/50 text-xs font-semibold">
                            <span className="font-bold text-foreground">🎯 {goalMatch.name}</span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 bg-primary/5 text-primary border-primary/10">
                              Target: ₹{formatCurrency(goalMatch.target)}
                            </Badge>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" onClick={() => setSavingDetailsOpen(false)}>
                    Close Details
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── GOAL DETAILS DIALOG ─── */}
      <Dialog open={goalDetailsOpen} onOpenChange={setGoalDetailsOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>🎯 Goal Details:</span>
              <span className="text-primary">{selectedGoal?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Granular review of allocated funding assets backing this target
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (() => {
            const { linkedSavings, totalLinkedBacking: totalBacking, totalSpent, baseCash, netSaved, target, pct, basePct, backingPct, spentPct, linkedExpenses } = getGoalProgress(selectedGoal, savings, expenses)

            return (
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3.5">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <p className="text-2xl font-black">₹{formatCurrency(netSaved)}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Total Fulfillment Value</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-muted-foreground">Target: ₹{formatCurrency(selectedGoal.target)}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                        {selectedGoal.deadline ? `📅 Due ${selectedGoal.deadline}` : "No deadline set"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress value={pct} className="h-2.5" />
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>{basePct}% Base</span>
                      <span>{backingPct}% Assets</span>
                      {spentPct > 0 && <span className="text-rose-400">{spentPct}% Spent</span>}
                    </div>
                  </div>
                  {totalSpent > 0 && (
                    <div className="text-[11px] font-bold text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-md px-2 py-1 flex items-center justify-between">
                      <span>Already Spent (Fulfilled):</span>
                      <span>₹{formatCurrency(totalSpent)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    <span>Allocated Backing Assets</span>
                  </h4>
                  <Separator className="bg-border/30" />
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {safeNumber(selectedGoal.current) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-primary/5 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span>💰</span>
                          <div>
                            <p className="font-bold text-foreground">Direct Base Cash</p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Manual ledger allocation</p>
                          </div>
                        </div>
                        <span className="font-black text-foreground">₹{formatCurrency(selectedGoal.current)}</span>
                      </div>
                    )}

                    {linkedSavings.map(({ saving, amount, allocatedAmount }) => {
                      const matchedApp = apps.find(a => a.value === saving.app)?.label || saving.app
                      const matchedProvider = providers.find(p => p.value === saving.provider)?.label || saving.provider
                      const allocAmt = safeNumber(allocatedAmount)
                      const savingAmt = safeNumber(saving.amount)
                      const detailLabel = (() => {
                        if (savingAmt === 0 && allocAmt > 0) return `Allocated ₹${formatCurrency(allocAmt)} — fully consumed`
                        if (allocAmt > 0 && allocAmt !== savingAmt) return `Allocated ₹${formatCurrency(allocAmt)} of ₹${formatCurrency(savingAmt)}`
                        return `₹${formatCurrency(savingAmt)} total`
                      })()

                      return (
                        <div key={saving.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 text-xs font-semibold hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span>🐷</span>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[130px] sm:max-w-[200px]">{saving.name}</p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate max-w-[130px] sm:max-w-[200px]">
                                {matchedApp} · {matchedProvider}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{detailLabel}</p>
                            </div>
                          </div>
                          <span className="font-black text-foreground shrink-0">₹{formatCurrency(amount)}</span>
                        </div>
                      )
                    })}

                    {selectedGoal.current === 0 && linkedSavings.length === 0 && (
                      <div className="text-center py-6 border border-dashed rounded-lg">
                        <ShieldAlert className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                        <p className="text-xs text-muted-foreground font-semibold">No assets are currently backing this goal.</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">Link assets in the Savings or Goal Forms.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" onClick={() => setGoalDetailsOpen(false)}>
                    Close Details
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── AI SAVINGS OPTIMIZER DIALOG ─── */}
      <Dialog open={optimizerOpen} onOpenChange={setOptimizerOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span>Could not open AI Coach</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your optimization request has not been submitted.
            </DialogDescription>
          </DialogHeader>
          {aiError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {aiError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOptimizerOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleOptimizeAllocation} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}