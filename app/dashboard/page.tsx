// app/dashboard/page.tsx
"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Sparkles, Wallet, TrendingDown, PiggyBank, Target, TrendingUp, BarChart3 } from "lucide-react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts"

export default function OverviewPage() {
  const { accounts, expenses, goals, savings, user, income, sips, isDemo } = useFinanceData()

  // Calculate dynamic stats
  const totalBalance = accounts
    .filter(a => a.type !== "Credit Card")
    .reduce((sum, a) => sum + safeNumber(a.balance), 0) - 
    accounts
    .filter(a => a.type === "Credit Card")
    .reduce((sum, a) => sum + safeNumber(a.balance), 0)

  const monthlySpend = expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0)
  const totalSavingsVal = savings.reduce((sum, s) => sum + safeNumber(s.amount), 0)
  const monthlyIncome = income
    .filter(i => i.frequency === "monthly")
    .reduce((sum, i) => sum + safeNumber(i.amount), 0)
  const monthlySIP = sips
    .filter(s => s.sipStatus === "active")
    .reduce((sum, s) => sum + safeNumber(s.amount), 0)

  // 5-Month Income vs Expense Trend Calculation
  const getPastMonths = (count = 5) => {
    const list = []
    const now = new Date("2026-05-30") // Base date to align with mock data
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleString("default", { month: "short" })
      const yearMonth = d.toISOString().substring(0, 7) // "YYYY-MM"
      list.push({ month: monthStr, key: yearMonth, Income: 0, Expense: 0, Investments: 0 })
    }
    return list
  }

  const monthlyTrends = getPastMonths(5)
  monthlyTrends.forEach(item => {
    // Current month dynamic calculations
    const incVal = income
      .filter(i => i.date.startsWith(item.key))
      .reduce((sum, i) => sum + safeNumber(i.amount), 0)
    const expVal = expenses
      .filter(e => e.date.startsWith(item.key))
      .reduce((sum, e) => sum + safeNumber(e.amount), 0)
    const sipVal = sips
      .filter(s => s.sipStatus === "active" && s.startDate <= `${item.key}-31`)
      .reduce((sum, s) => sum + safeNumber(s.amount), 0)

    if (isDemo && (income.length > 0 || expenses.length > 0 || sips.length > 0)) {
      // For historical mock completeness if no user logs exist for previous months in demo mode
      if (item.key === "2026-05") {
        item.Income = incVal || 145000
        item.Expense = expVal || 18340
        item.Investments = sipVal || 15000
      } else if (item.key === "2026-04") {
        item.Income = 95000
        item.Expense = 16200
        item.Investments = 15000
      } else if (item.key === "2026-03") {
        item.Income = 95000
        item.Expense = 15400
        item.Investments = 15000
      } else if (item.key === "2026-02") {
        item.Income = 95000
        item.Expense = 21000
        item.Investments = 15000
      } else if (item.key === "2026-01") {
        item.Income = 95000
        item.Expense = 14800
        item.Investments = 5000
      } else {
        item.Income = incVal
        item.Expense = expVal
        item.Investments = sipVal
      }
    } else {
      // Live cloud/user mode: use actual data only
      item.Income = incVal
      item.Expense = expVal
      item.Investments = sipVal
    }
  })

  const hasTrendData = monthlyTrends.some(item => item.Income > 0 || item.Expense > 0 || item.Investments > 0)

  const dynamicStats = [
    {
      title: "Total Balance",
      value: `₹${formatCurrency(totalBalance)}`,
      change: "Net Worth",
      up: totalBalance >= 0,
      icon: "Wallet"
    },
    {
      title: "Monthly Income",
      value: `₹${formatCurrency(monthlyIncome)}`,
      change: `${income.length} sources`,
      up: true,
      icon: "TrendingUp"
    },
    {
      title: "Monthly Spend",
      value: `₹${formatCurrency(monthlySpend)}`,
      change: `${expenses.length} transactions`,
      up: false,
      icon: "TrendingDown"
    },
    {
      title: "Monthly SIP",
      value: `₹${formatCurrency(monthlySIP)}`,
      change: `${sips.filter(s => s.sipStatus === "active").length} active`,
      up: true,
      icon: "BarChart3"
    }
  ]

  const displayName = user ? user.displayName?.split(" ")[0] : "John"

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-md border border-border/80 p-3 rounded-xl shadow-xl space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: ₹{formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Good morning, {displayName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Here's your live personal finance snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense breakdown Chart */}
        <Card className="lg:col-span-2 border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Income vs Expense Breakdown</CardTitle>
            <CardDescription className="text-xs">Comparison of monthly income, expenses, and systematic investments</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {!hasTrendData ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No transaction data available</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                  Add records in the Income or Expenses tab to populate this trend breakdown.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Investments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Goals Snapshot */}
        <Card className="lg:col-span-1 border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Goals Snapshot</CardTitle>
            <CardDescription className="text-xs">Dynamic tracking of your top active savings targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {goals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No active targets defined. Create goal targets on the Goals tab!</p>
              </div>
            ) : (
              goals.slice(0, 3).map((g) => {
                const backingSavings = savings.filter(s => g.savings_ids?.includes(s.id) || s.linkedGoals?.includes(g.id))
                const totalBacking = backingSavings.reduce((sum, s) => sum + s.amount, 0)
                const netSaved = g.current + totalBacking
                const pct = Math.min(100, Math.round((netSaved / g.target) * 100))
                
                return (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="flex items-center gap-2 text-foreground font-bold">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${g.color || "bg-primary"}`} />
                        <span>{g.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        ₹{formatCurrency(netSaved)} / ₹{formatCurrency(g?.target)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                    <p className="text-xs text-muted-foreground text-right font-semibold">{pct}% complete</p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}