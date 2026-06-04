// app/dashboard/goals/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Target, CheckCircle2, Clock, Trash2, Edit2, Info, 
  PiggyBank, ShieldAlert, Plus, ArrowRight, CalendarDays, 
  LayoutGrid, BarChart3, Filter
} from "lucide-react"
import { GoalForm } from "@/components/forms/goal-form"
import { useFinanceData, Goal, Saving } from "@/hooks/use-finance-data"
import { useState } from "react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export default function GoalsPage() {
  const { goals, deleteGoal, savings, apps, providers, expenses } = useFinanceData()
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // Goal Details state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  
  // Category Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // ─── HELPER: Savings Backing ───
  const getGoalSavingsBacking = (goal: Goal) => {
    const allocations = (goal.savings_allocations && goal.savings_allocations.length > 0)
      ? goal.savings_allocations
      : (goal.savings_ids || []).map((id) => ({ id, amount: 0 }))

    const fallbackAllocations = savings
      .filter((s) => s.linkedGoals?.includes(goal.id) && !allocations.some((alloc) => alloc.id === s.id))
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

  // ─── STATS & ANALYSIS CALCULATIONS ───
  const activeGoalsCount = goals.length
  
  let totalTargetAmount = 0
  let totalAllocatedAmount = 0

  const completedGoalsCount = goals.filter(g => {
    const linkedSavings = getGoalSavingsBacking(g)
    const totalLinkedBacking = linkedSavings.reduce((sum, s) => sum + safeNumber(s.amount), 0)
    const netSaved = safeNumber(g.current) + totalLinkedBacking
    
    totalTargetAmount += safeNumber(g.target)
    totalAllocatedAmount += netSaved

    return netSaved >= safeNumber(g.target)
  }).length
  
  const inProgressGoalsCount = activeGoalsCount - completedGoalsCount
  const overallProgress = totalTargetAmount > 0 ? Math.min(100, Math.round((totalAllocatedAmount / totalTargetAmount) * 100)) : 0

  // Categories extraction & filtering
  const allCategories = Array.from(new Set(goals.map(g => (g as any).category || "Uncategorized")))
  const filteredGoals = selectedCategory === "All" 
    ? goals 
    : goals.filter(g => ((g as any).category || "Uncategorized") === selectedCategory)

  // ─── REUSABLE CARD RENDERER ───
  const renderGoalCard = (g: Goal) => {
    const linkedSavings = getGoalSavingsBacking(g)
    const totalLinkedBacking = linkedSavings.reduce((sum, item) => sum + safeNumber(item.amount), 0)
    const netSaved = safeNumber(g.current) + totalLinkedBacking

    const pct = Math.min(100, Math.round((netSaved / safeNumber(g.target)) * 100))
    const done = pct === 100

    const linkedExpenses = expenses.filter((e) => e.goalId === g.id)
    const totalSpent = linkedExpenses.reduce((sum, e) => sum + safeNumber(e.amount), 0)

    return (
      <Card
        key={g.id}
        className={`group border-border/70 shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-background/60 backdrop-blur-md
          ${done ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30" : "hover:border-primary/20"}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2.5">
                <div className={`h-3 w-3 rounded-full shrink-0 ${g.color || "bg-primary"}`} />
                <CardTitle className="text-base font-extrabold truncate tracking-tight">{g.name}</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mt-1.5 pl-5">
                <CalendarDays className="h-3 w-3" />
                {g.deadline ? <span>Due {g.deadline}</span> : <span>No deadline set</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={done ? "default" : "outline"} className={done ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold border-none" : "text-[10px] font-bold text-muted-foreground bg-muted/40 border-muted"}>
                {done ? "✓ Complete" : `${pct}%`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              Allocated: <span className="text-foreground font-black">₹{formatCurrency(netSaved)}</span>
            </span>
            <span className="text-muted-foreground">
              Target: <span className="text-foreground font-black">₹{formatCurrency(g.target)}</span>
            </span>
          </div>

          {totalSpent > 0 && (
            <div className="text-[11px] font-bold text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-md px-2 py-1 flex items-center justify-between">
              <span>Spent on this goal:</span>
              <span>-₹{formatCurrency(totalSpent)}</span>
            </div>
          )}

          <Separator className="bg-border/30" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {linkedSavings.length} linked asset{linkedSavings.length !== 1 ? "s" : ""}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => {
                  setSelectedGoal(g)
                  setDetailsOpen(true)
                }}
                className="h-7 w-7 rounded-md border-border/60"
                title="Goal Details"
              >
                <Info className="h-3.5 w-3.5 text-primary" />
              </Button>

              <Link href={`/dashboard/goals/${g.id}/allocate`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 rounded-md border-border/60 gap-1 text-[10px] font-bold text-primary hover:bg-primary/5 hover:border-primary/30"
                  title="Allocate Savings"
                >
                  <PiggyBank className="h-3 w-3" />
                  Allocate
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Track long-term target indices and back them with assets</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingGoal(null)
            setFormOpen(true)
          }}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Goal</span>
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", border: "1px solid #a5b4fc" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#3730a3" }}>Total Targets</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#4338ca" }}>All active goals</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#4f46e5" }}>
              <Target className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#1e1b4b" }}>{activeGoalsCount}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", border: "1px solid #6ee7b7" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#065f46" }}>Completed</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#047857" }}>Fully achieved</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#059669" }}>
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#064e3b" }}>{completedGoalsCount}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)", border: "1px solid #fcd34d" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#713f12" }}>In Progress</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#92400e" }}>Still working on it</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#d97706" }}>
              <Clock className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#451a03" }}>{inProgressGoalsCount}</p>
        </div>
      </div>

      {/* TABS INTEGRATION - Vertical Tab Triggers, Horizontal Content Layout */}
      <Tabs defaultValue="all" className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sleek Vertical Tab Triggers */}
        <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-auto bg-transparent border-b lg:border-b-0 lg:border-r border-border/60 rounded-none p-0 items-stretch lg:pr-6 shrink-0 gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📊</span>
            <span>All Goals</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analysis" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📈</span>
            <span>Analysis</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          
          {/* TAB 1: ALL GOALS */}
          <TabsContent value="all" className="mt-0 focus-visible:outline-none">
          {/* Filter Header Row */}
          <div className="flex items-center justify-between mb-5 bg-muted/20 p-3 rounded-xl border border-border/40">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {selectedCategory === "All" ? "All Active Goals" : `${selectedCategory} Goals`}
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-8 text-xs font-semibold bg-background">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs font-semibold">All Categories</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs font-medium">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredGoals.map(g => renderGoalCard(g))}
            {filteredGoals.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed rounded-xl border-border/60 bg-muted/10">
                <Target className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-bold text-foreground">No goals found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCategory === "All" 
                    ? "Create your first goal to start tracking progress." 
                    : `No goals found in the ${selectedCategory} category.`}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: ANALYSIS OVERVIEW */}
        <TabsContent value="analysis" className="mt-0 outline-none">
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm bg-background/50">
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
                <CardDescription>Aggregate metrics across all your financial goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Total Portfolio Target</p>
                    <p className="text-3xl font-black">₹{formatCurrency(totalTargetAmount)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Total Backing Secured</p>
                    <p className="text-3xl font-black text-primary">₹{formatCurrency(totalAllocatedAmount)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Overall Goal Completion</span>
                    <span className="text-primary">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allCategories.map(category => {
                const catGoals = goals.filter(g => ((g as any).category || "Uncategorized") === category)
                const catTarget = catGoals.reduce((sum, g) => sum + safeNumber(g.target), 0)
                const catAllocated = catGoals.reduce((sum, g) => {
                  const linked = getGoalSavingsBacking(g)
                  const backing = linked.reduce((s, item) => s + safeNumber(item.amount), 0)
                  return sum + safeNumber(g.current) + backing
                }, 0)
                const catPct = catTarget > 0 ? Math.min(100, Math.round((catAllocated / catTarget) * 100)) : 0

                return (
                  <Card key={category} className="border-border/40 bg-muted/10 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-lg font-black">₹{formatCurrency(catAllocated)}</span>
                        <span className="text-xs font-semibold text-muted-foreground">of ₹{formatCurrency(catTarget)}</span>
                      </div>
                      <Progress value={catPct} className="h-1.5" />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
        </div>
      </Tabs>

      <GoalForm
        initialData={editingGoal}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* ─── GOAL DETAILS DIALOG ─── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
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
            const linkedSavings = getGoalSavingsBacking(selectedGoal)
            const totalBacking = linkedSavings.reduce((sum, item) => sum + safeNumber(item.amount), 0)
            const netSaved = safeNumber(selectedGoal.current) + totalBacking
            const backingPct = Math.min(100, Math.round((totalBacking / safeNumber(selectedGoal.target)) * 100))
            const basePct = Math.round((safeNumber(selectedGoal.current) / safeNumber(selectedGoal.target)) * 100)
            const linkedExpenses = expenses.filter((e) => e.goalId === selectedGoal.id)

            return (
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3.5">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <p className="text-2xl font-black">₹{formatCurrency(netSaved)}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Total Backing Secured</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-muted-foreground">Target: ₹{formatCurrency(selectedGoal.target)}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                        <CalendarDays className="h-3 w-3" />
                        {selectedGoal.deadline ? `Due ${selectedGoal.deadline}` : "No deadline"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress value={Math.round((netSaved / selectedGoal.target) * 100)} className="h-2.5" />
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>{basePct}% Base Cash</span>
                      <span>{backingPct}% Asset Backing</span>
                    </div>
                  </div>
                </div>

                {/* Backing Assets List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    <span>Allocated Backing Assets</span>
                  </h4>

                  <Separator className="bg-border/30" />

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
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
                      const detailLabel = safeNumber(allocatedAmount) > 0 && allocatedAmount !== saving.amount
                        ? `Allocated ₹${formatCurrency(allocatedAmount)} of ₹${formatCurrency(saving.amount)}`
                        : `₹${formatCurrency(saving.amount)} total`

                      return (
                        <div key={saving.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 text-xs font-semibold hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span>🐷</span>
                            <div>
                              <p className="font-bold text-foreground truncate max-w-[170px]">{saving.name}</p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate max-w-[170px]">
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
                      <div className="text-center py-5 border border-dashed rounded-lg">
                        <ShieldAlert className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                        <p className="text-xs text-muted-foreground font-semibold">No assets are currently backing this goal.</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">Use Allocate Savings to link assets.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked Expenses Section */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-rose-500">
                    <span>💸 Linked Expenses ({linkedExpenses.length})</span>
                  </h4>

                  <Separator className="bg-border/30" />

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {linkedExpenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/50 text-xs font-semibold">
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[170px]">{exp.note || exp.category}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{exp.date}</p>
                        </div>
                        <span className="font-black text-rose-500">-₹{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}

                    {linkedExpenses.length === 0 && (
                      <div className="text-center py-4 border border-dashed rounded-lg bg-muted/10">
                        <p className="text-xs text-muted-foreground font-semibold">No expenses linked to this goal yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/30" />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        setDetailsOpen(false)
                        setEditingGoal(selectedGoal)
                        setFormOpen(true)
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Goal
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        if (confirm(`Delete financial goal "${selectedGoal.name}"?`)) {
                          deleteGoal(selectedGoal.id)
                          setDetailsOpen(false)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}