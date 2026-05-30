"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Edit2, TrendingUp, Calendar, DollarSign } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid } from "recharts"
import { IncomeForm } from "@/components/forms/income-form"
import { useFinanceData, Income } from "@/hooks/use-finance-data"
import { useState } from "react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { INCOME_SOURCES, INCOME_FREQUENCY } from "@/constants/finance"

export default function IncomePage() {
  const { income, deleteIncome, accounts, isDemo } = useFinanceData()
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const totalMonthlyIncome = income
    .filter(i => i.frequency === "monthly")
    .reduce((s, i) => s + safeNumber(i.amount), 0)

  const totalIncome = income.reduce((s, i) => s + safeNumber(i.amount), 0)

  // Dynamic 5-Month Trend Calculation
  const getPastMonths = (count = 5) => {
    const list = []
    const now = new Date("2026-05-30") // Base date to align with mock data
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleString("default", { month: "short" })
      const yearMonth = d.toISOString().substring(0, 7) // "YYYY-MM"
      list.push({ month: monthStr, key: yearMonth, income: 0 })
    }
    return list
  }

  const dynamicMonthlyTrend = getPastMonths(5)
  dynamicMonthlyTrend.forEach(item => {
    const incVal = income
      .filter(i => i.date.startsWith(item.key))
      .reduce((sum, i) => sum + safeNumber(i.amount), 0)

    if (isDemo && income.length > 0) {
      if (item.key === "2026-05") {
        item.income = incVal || 145000
      } else if (item.key === "2026-04") {
        item.income = 145000
      } else if (item.key === "2026-03") {
        item.income = 95000
      } else if (item.key === "2026-02") {
        item.income = 95000
      } else if (item.key === "2026-01") {
        item.income = 95000
      } else {
        item.income = incVal
      }
    } else {
      item.income = incVal
    }
  })

  const hasIncomeTrend = dynamicMonthlyTrend.some(item => item.income > 0)

  // Build source map
  const SOURCE_MAP = INCOME_SOURCES.reduce((acc, s) => {
    acc[s.value] = s.label
    return acc
  }, {} as Record<string, string>)

  // Group by source
  const incomeBySource = income.reduce((acc, curr) => {
    acc[curr.source] = (acc[curr.source] || 0) + safeNumber(curr.amount)
    return acc
  }, {} as Record<string, number>)

  const sourceData = Object.entries(incomeBySource).map(([key, val]) => {
    const label = SOURCE_MAP[key] || `📦 ${key}`
    const icon = label.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "📊"
    return {
      name: label.replace(icon, "").trim(),
      value: val,
      icon,
    }
  })

  const COLORS = ["#3b82f6", "#0ea5e9", "#6366f1", "#06b6d4", "#14b8a6", "#a855f7", "#ec4899"]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-md border border-border/80 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{payload[0].payload.month || payload[0].payload.name}</p>
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Income</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Track all income sources and streams</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setEditingIncome(null)
            setFormOpen(true)
          }}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Income</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Monthly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(totalMonthlyIncome)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              Recurring
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(totalIncome)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/10 border-blue-500/20">
              All sources
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Income Sources</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">{income.length}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-muted-foreground bg-muted">
              sources tracked
            </Badge>
          </CardContent>
        </Card>
      </div>

      <IncomeForm open={formOpen} onOpenChange={setFormOpen} initialData={editingIncome} />

      <Tabs defaultValue="trends" className="flex flex-col lg:flex-row gap-8 items-start">
        
        <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-auto bg-transparent border-b lg:border-b-0 lg:border-r border-border/60 rounded-none p-0 items-stretch lg:pr-6 shrink-0 gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <TabsTrigger 
            value="trends" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📈</span>
            <span>Monthly Trends</span>
          </TabsTrigger>
          <TabsTrigger 
            value="distribution" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>🎯</span>
            <span>Source Distribution</span>
          </TabsTrigger>
          <TabsTrigger 
            value="ledger" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📝</span>
            <span>Income Ledger</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          
          {/* Monthly Trends */}
          <TabsContent value="trends" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Income Trends (6 Months)</CardTitle>
              </CardHeader>
              <CardContent className="pb-0">
                {!hasIncomeTrend ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No income trends recorded</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Add recurring or one-time income to view monthly trends.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dynamicMonthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                      <YAxis stroke="var(--color-muted-foreground)" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]}>
                        {dynamicMonthlyTrend.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Source Distribution */}
          <TabsContent value="distribution" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Income by Source</CardTitle>
              </CardHeader>
              <CardContent className="pb-0">
                {sourceData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No income source distribution available</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Log your income sources in the records to see category distribution.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ₹${formatCurrency(value)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ledger */}
          <TabsContent value="ledger" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Income Records</CardTitle>
                <CardDescription>All income transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {income.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No income records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {income.map((inc) => (
                      <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{SOURCE_MAP[inc.source] || inc.source}</p>
                          <p className="text-xs text-muted-foreground">{inc.date} • {inc.note || "No note"}</p>
                        </div>
                        <div className="text-right mr-3">
                          <p className="font-bold text-emerald-600">₹{formatCurrency(inc.amount)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{inc.frequency}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingIncome(inc)
                              setFormOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIncome(inc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
