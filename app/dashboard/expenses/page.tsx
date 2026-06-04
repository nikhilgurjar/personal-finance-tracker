// app/dashboard/expenses/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { EXPENSE_CATEGORIES } from "@/constants/finance"
import { ExpenseForm } from "@/components/forms/expense-form"
import { useFinanceData, Expense } from "@/hooks/use-finance-data"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { useState } from "react"
import { Trash2, Edit2, Wallet, Calendar, Plus, ChevronDown, TrendingDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

const COLORS = ["#3b82f6", "#0ea5e9", "#6366f1", "#06b6d4", "#14b8a6", "#a855f7", "#ec4899"]

export default function ExpensesPage() {
  const { expenses, accounts, deleteExpense, isDemo } = useFinanceData()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [accountFilter, setAccountFilter] = useState("all")

  // Sorting, Filtering, Pagination State
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "category" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 5

  // Dynamic calculations
  const totalExpenses = expenses.reduce((s, e) => s + safeNumber(e.amount), 0)

  // Find Label/Icon from Constants
  const EXPENSE_MAP = EXPENSE_CATEGORIES.reduce((acc, item) => {
    acc[item.value] = item.label
    return acc
  }, {} as Record<string, string>)

  // Filtered Expenses for ledger listing
  const filteredExpenses = expenses.filter(e => {
    if (accountFilter === "all") return true
    return e.account === accountFilter
  })

  // Dynamic Category-wise Aggregation computed from current active expenses
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + safeNumber(curr.amount)
    return acc
  }, {} as Record<string, number>)

  const aggregatedCategories = Object.entries(categoryTotals).map(([key, val]) => {
    const fullLabel = EXPENSE_MAP[key] || `📦 ${key}`
    const icon = fullLabel.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "📦"
    const name = fullLabel.replace(icon, "").trim()
    const percent = totalExpenses > 0 ? Math.round((val / totalExpenses) * 100) : 0
    return {
      category: name,
      icon,
      amount: val,
      percent,
      key
    }
  }).sort((a, b) => b.amount - a.amount)

  // Dynamic 5-Month Income vs Expense Trend Calculation
  const getPastMonths = (count = 5) => {
    const list = []
    const now = new Date("2026-05-30") // Base date to align with mock data
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleString("default", { month: "short" })
      const yearMonth = d.toISOString().substring(0, 7) // "YYYY-MM"
      list.push({ month: monthStr, key: yearMonth, total: 0 })
    }
    return list
  }

  const dynamicMonthlyTrend = getPastMonths(5)
  dynamicMonthlyTrend.forEach(item => {
    const expVal = expenses
      .filter(e => e.date.startsWith(item.key))
      .reduce((sum, e) => sum + safeNumber(e.amount), 0)

    if (isDemo && expenses.length > 0) {
      if (item.key === "2026-05") {
        item.total = expVal || 18340
      } else if (item.key === "2026-04") {
        item.total = 19200
      } else if (item.key === "2026-03") {
        item.total = 13500
      } else if (item.key === "2026-02") {
        item.total = 16800
      } else if (item.key === "2026-01") {
        item.total = 14200
      } else {
        item.total = expVal
      }
    } else {
      item.total = expVal
    }
  })

  const hasExpensesTrend = dynamicMonthlyTrend.some(item => item.total > 0)

  // Recharts Glassmorphic Tooltip
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Analyze distributions and log transaction records</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setEditingExpense(null)
            setFormOpen(true)
          }}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      <Tabs defaultValue="breakdown" className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sleek Vertical Tab Triggers */}
        <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-auto bg-transparent border-b lg:border-b-0 lg:border-r border-border/60 rounded-none p-0 items-stretch lg:pr-6 shrink-0 gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <TabsTrigger 
            value="breakdown" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📊</span>
            <span>Category Breakdown</span>
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📈</span>
            <span>Monthly Trends</span>
          </TabsTrigger>
          <TabsTrigger 
            value="ledger" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📝</span>
            <span>Ledger Records</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          
          {/* Tab 1: Breakdown */}
          <TabsContent value="breakdown" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Category Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Total spent: <span className="font-extrabold text-foreground text-sm">₹{formatCurrency(totalExpenses)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {aggregatedCategories.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground font-medium">No recorded expenses logged. Click "Add Expense" to get started.</p>
                  </div>
                ) : (
                  aggregatedCategories.map((exp, i) => (
                    <div key={exp.key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg bg-muted h-7 w-7 rounded-lg flex items-center justify-center">{exp.icon}</span>
                          <span className="font-semibold text-foreground">{exp.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground bg-muted/30 border-muted">
                            {exp.percent}%
                          </Badge>
                          <span className="font-extrabold text-foreground">₹{formatCurrency(exp.amount)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${exp.percent}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Monthly Trends */}
          <TabsContent value="monthly" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Monthly Burn Rate</CardTitle>
                <CardDescription className="text-xs">Consolidated spending index (Last 5 months)</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {!hasExpensesTrend ? (
                  <div className="flex flex-col items-center justify-center h-[290px] text-center px-4">
                    <TrendingDown className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No historical expenses recorded</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Add expense transactions to populate the monthly burn rate trend graph.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={dynamicMonthlyTrend} barSize={34}>
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
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(100, 116, 139, 0.05)", radius: 6 }} />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {dynamicMonthlyTrend.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === dynamicMonthlyTrend.length - 1 ? "#3b82f6" : "rgba(100, 116, 139, 0.15)"}
                            className="transition-all duration-300 hover:opacity-80"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Ledger List (WITH THE ACCOUNT TRANSACTION FILTER AS REQUESTED!) */}
          <TabsContent value="ledger" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0 flex-wrap gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Individual Transactions</CardTitle>
                  <CardDescription className="text-xs">Comprehensive log of all outgoing payments</CardDescription>
                </div>
                
                {/* TRANSACTION FILTER FOR EXPENSES */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    placeholder="Search note or details..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-8 text-xs w-[160px] bg-background"
                  />
                  <Select
                    value={categoryFilter}
                    onValueChange={(val) => {
                      setCategoryFilter(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📦 All Categories</SelectItem>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={accountFilter}
                    onValueChange={(val) => {
                      setAccountFilter(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">💳 All Accounts</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          🏦 {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredAndSortedExpenses = expenses
                    .filter((exp) => {
                      const matchAccount = accountFilter === "all" || exp.account === accountFilter
                      const matchCategory = categoryFilter === "all" || exp.category === categoryFilter
                      const matchedAccountName = accounts.find((a) => a.id === exp.account)?.name || ""
                      const fullCategory = EXPENSE_MAP[exp.category] || exp.category
                      const matchSearch =
                        exp.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        fullCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        matchedAccountName.toLowerCase().includes(searchTerm.toLowerCase())
                      return matchAccount && matchCategory && matchSearch
                    })
                    .sort((a, b) => {
                      let comparison = 0
                      if (sortBy === "date") {
                        comparison = a.date.localeCompare(b.date)
                      } else if (sortBy === "category") {
                        const catA = EXPENSE_MAP[a.category] || a.category
                        const catB = EXPENSE_MAP[b.category] || b.category
                        comparison = catA.localeCompare(catB)
                      } else if (sortBy === "amount") {
                        comparison = safeNumber(a.amount) - safeNumber(b.amount)
                      }
                      return sortOrder === "asc" ? comparison : -comparison
                    })

                  const totalPages = Math.ceil(filteredAndSortedExpenses.length / rowsPerPage)
                  const paginatedExpenses = filteredAndSortedExpenses.slice(
                    (currentPage - 1) * rowsPerPage,
                    currentPage * rowsPerPage
                  )

                  const handleSort = (field: "date" | "category" | "amount") => {
                    if (sortBy === field) {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    } else {
                      setSortBy(field)
                      setSortOrder("desc")
                    }
                    setCurrentPage(1)
                  }

                  if (filteredAndSortedExpenses.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <p className="text-sm text-slate-400 font-medium">No transactions match the filters.</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border/40 overflow-hidden bg-background/30">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                                <div className="flex items-center gap-1">
                                  <span>Date</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                                <div className="flex items-center gap-1">
                                  <span>Category</span>
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead>Note / Source</TableHead>
                              <TableHead>Account</TableHead>
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
                            {paginatedExpenses.map((exp) => {
                              const matchedAccount = accounts.find(a => a.id === exp.account)
                              const fullCategory = EXPENSE_MAP[exp.category] || exp.category
                              const icon = fullCategory.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "📦"

                              return (
                                <TableRow key={exp.id}>
                                  <TableCell className="font-semibold text-xs text-muted-foreground">{exp.date}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{icon}</span>
                                      <span className="font-bold text-xs">{fullCategory.replace(icon, "").trim()}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                                    <div className="flex flex-col gap-1">
                                      <span>{exp.note || "—"}</span>
                                      {exp.goalName && (
                                        <div className="inline-flex">
                                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-none font-bold">
                                            🎯 {exp.goalName}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {matchedAccount ? matchedAccount.name : "Cash/Other"}
                                  </TableCell>
                                  <TableCell className="font-black text-xs text-rose-500 text-right">
                                    -₹{formatCurrency(exp.amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          setEditingExpense(exp)
                                          setFormOpen(true)
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          if (confirm(`Delete this expense record for ₹${formatCurrency(exp.amount)}?`)) {
                                            deleteExpense(exp.id)
                                          }
                                        }}
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
                        <div className="flex items-center justify-between px-2 py-1 text-xs">
                          <p className="text-muted-foreground font-semibold">
                            Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredAndSortedExpenses.length)} of {filteredAndSortedExpenses.length} entries
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="font-bold px-2">{currentPage} / {totalPages}</span>
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

        </div>
      </Tabs>

      {/* Editing & Adding Form Hookup */}
      <ExpenseForm
        initialData={editingExpense}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}