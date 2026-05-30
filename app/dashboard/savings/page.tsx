// app/dashboard/savings/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { SAVINGS_HISTORY, SAVINGS_TYPES } from "@/constants/finance"
import { Plus, TrendingUp, CalendarDays, Edit2, Trash2, Shield, Building, AppWindow as AppIcon } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { SavingsForm } from "@/components/forms/savings-form"
import { useFinanceData, Saving } from "@/hooks/use-finance-data"
import { useState } from "react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export default function SavingsPage() {
  const { savings, deleteSaving, apps, addApp, providers, addProvider, goals, isDemo } = useFinanceData()
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Savings</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Link, audit, and project your financial security cushions</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setEditingSaving(null)
            setFormOpen(true)
          }}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Saving</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Cumulative Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(totalSaved)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              Active Growth
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Monthly Liquidation Avg</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(avgMonthlySaved)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-muted-foreground bg-muted">
              per month (estimated)
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Diversified Products</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">{savings.length}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-muted-foreground bg-muted">
              active assets
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* premium Vertical Tab Triggers */}
        <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-auto bg-transparent border-b lg:border-b-0 lg:border-r border-border/60 rounded-none p-0 items-stretch lg:pr-6 shrink-0 gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>🐷</span>
            <span>Savings Assets</span>
          </TabsTrigger>
          <TabsTrigger 
            value="trend" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📈</span>
            <span>Historical Trend</span>
          </TabsTrigger>
          <TabsTrigger 
            value="registry" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>💼</span>
            <span>Apps & Providers</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          
          {/* Tab 1: Savings List Table */}
          <TabsContent value="list" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-sans">Active Financial Assets</CardTitle>
                <CardDescription className="text-xs">Linked saving deposits, SIP mutual funds, and equities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {savings.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground font-medium">No active assets registered. Link your savings now!</p>
                    </div>
                  ) : (
                    savings.map((sav, i) => {
                      const matchedApp = apps.find(a => a.value === sav.app)?.label || sav.app
                      const matchedProvider = providers.find(p => p.value === sav.provider)?.label || sav.provider
                      const fullTypeLabel = TYPE_MAP[sav.type] || sav.type
                      const typeIcon = fullTypeLabel.match(/[\p{Emoji}\u200d]+/gu)?.[0] || "💰"
                      
                      return (
                        <div key={sav.id}>
                          <div className="flex items-center justify-between py-4 px-2 hover:bg-muted/15 rounded-xl transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-lg">
                                {typeIcon}
                              </div>
                              <div>
                                <p className="text-sm font-bold tracking-tight text-foreground">{sav.name}</p>
                                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5 font-medium">
                                  <span>👤 {sav.owner}</span>
                                  <span>·</span>
                                  <span>📱 {matchedApp}</span>
                                  <span>·</span>
                                  <span>🏦 {matchedProvider}</span>
                                </div>
                                {/* Linked Goals */}
                                {getSavingsGoalIds(sav).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {getSavingsGoalIds(sav).map((gid) => {
                                      const goalMatch = goals.find((g) => g.id === gid)
                                      return goalMatch ? (
                                        <Badge key={gid} variant="outline" className="text-[9px] font-bold py-0 bg-primary/5 text-primary border-primary/10">
                                          🎯 {goalMatch.name}
                                        </Badge>
                                      ) : null
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-black tracking-tight text-foreground">₹{formatCurrency(sav.amount)}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{sav.frequency || "One-time"}</p>
                              </div>
                              
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onClick={() => {
                                    setEditingSaving(sav)
                                    setFormOpen(true)
                                  }}
                                  className="h-7 w-7 rounded-md border-border/60"
                                >
                                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon-xs"
                                  onClick={() => {
                                    if (confirm(`Delete saving asset ${sav.name}?`)) {
                                      deleteSaving(sav.id)
                                    }
                                  }}
                                  className="h-7 w-7 rounded-md"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {i < savings.length - 1 && <Separator className="bg-border/30" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Savings Trend Area Chart */}
          <TabsContent value="trend" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Historical Net Reserves</CardTitle>
                <CardDescription className="text-xs">Cumulative saving allocations (Last 6 months)</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {!hasSavingsTrend ? (
                  <div className="flex flex-col items-center justify-center h-[290px] text-center px-4">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No historical reserves recorded</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Add savings assets to display your net historical reserves curve.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={290}>
                    <AreaChart data={dynamicSavingsHistory}>
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
                      className="h-9 text-xs rounded-lg"
                    />
                    <Button type="submit" size="sm" className="font-semibold text-xs h-9">
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
                      className="h-9 text-xs rounded-lg"
                    />
                    <Button type="submit" size="sm" className="font-semibold text-xs h-9">
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

        </div>
      </Tabs>

      {/* Editing dialog hookup */}
      <SavingsForm
        initialData={editingSaving}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}