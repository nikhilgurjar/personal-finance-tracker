"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Edit2, TrendingUp, BarChart3, Calendar, History, RotateCcw, ChevronDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts"
import { SIPForm } from "@/components/forms/sip-form"
import { useFinanceData, SIPSchedule } from "@/hooks/use-finance-data"
import { useState } from "react"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { SIP_TYPES, SIP_STATUS } from "@/constants/finance"

const SIP_PROJECTION = [
  { month: "Month 1", invested: 5000, projected: 5200 },
  { month: "Month 3", invested: 15000, projected: 15950 },
  { month: "Month 6", invested: 30000, projected: 32500 },
  { month: "Month 12", invested: 60000, projected: 68000 },
  { month: "Month 24", invested: 120000, projected: 145000 },
  { month: "Month 36", invested: 180000, projected: 230000 },
]

export default function SIPsPage() {
  const { sips, deleteSIP, goals, isDemo, triggerMonthSIPs, triggerHistory, undoLastTrigger } = useFinanceData()
  const [editingSIP, setEditingSIP] = useState<SIPSchedule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [triggeringMonth, setTriggeringMonth] = useState(false)
  const [undoingTrigger, setUndoingTrigger] = useState(false)
  const [triggerMessage, setTriggerMessage] = useState<{ type: "success" | "info"; text: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const activeSIPs = sips.filter(s => s.sipStatus === "active")
  const pausedSIPs = sips.filter(s => s.sipStatus === "paused")
  const completedSIPs = sips.filter(s => s.sipStatus === "completed")

  const totalMonthlySIP = activeSIPs.reduce((s, sip) => s + safeNumber(sip.amount), 0)
  const totalInvested = sips.reduce((s, sip) => s + safeNumber(sip.totalInvested || 0), 0)

  // Dynamic SIP Growth Projection
  const getSIPProjection = () => {
    if (activeSIPs.length === 0) {
      return []
    }
    const rate = 0.12 / 12 // 12% annual interest compounded monthly
    const monthlyAmt = totalMonthlySIP
    const intervals = [1, 3, 6, 12, 24, 36]
    return intervals.map(months => {
      const invested = monthlyAmt * months
      const projected = Math.round(monthlyAmt * (((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate)))
      return {
        month: `Month ${months}`,
        invested,
        projected
      }
    })
  }

  const dynamicProjection = (isDemo && activeSIPs.length === 0) ? SIP_PROJECTION : getSIPProjection()
  const hasSIPProjection = dynamicProjection.length > 0

  // Build type map
  const TYPE_MAP = SIP_TYPES.reduce((acc, t) => {
    acc[t.value] = t.label
    return acc
  }, {} as Record<string, string>)

  const STATUS_MAP = SIP_STATUS.reduce((acc, s) => {
    acc[s.value] = s.label
    return acc
  }, {} as Record<string, string>)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-md border border-border/80 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{payload[0].payload.month}</p>
          <p className="text-sm font-black text-blue-500 mt-1">Invested: ₹{formatCurrency(payload[0]?.value)}</p>
          {payload[1] && <p className="text-sm font-black text-emerald-500">Projected: ₹{formatCurrency(payload[1]?.value)}</p>}
        </div>
      )
    }
    return null
  }

  const handleTriggerMonthSIP = async () => {
    setTriggeringMonth(true)
    setTriggerMessage(null)
    try {
      const result = await triggerMonthSIPs()
      if (result.triggered > 0) {
        setTriggerMessage({
          type: "success",
          text: `Triggered ${result.triggered} SIP${result.triggered > 1 ? "s" : ""} and updated savings!`
        })
      } else {
        setTriggerMessage({
          type: "info",
          text: (result as any).message || "All SIPs already triggered for this month"
        })
      }
    } catch (error) {
      setTriggerMessage({
        type: "info",
        text: "Error triggering SIPs"
      })
    } finally {
      setTriggeringMonth(false)
      setTimeout(() => setTriggerMessage(null), 5000)
    }
  }

  const handleUndoLastTrigger = async () => {
    setUndoingTrigger(true)
    try {
      const success = await undoLastTrigger()
      if (success) {
        setTriggerMessage({
          type: "success",
          text: "Last trigger undone successfully!"
        })
      } else {
        setTriggerMessage({
          type: "info",
          text: "Failed to undo trigger"
        })
      }
    } catch (error) {
      setTriggerMessage({
        type: "info",
        text: "Error undoing trigger"
      })
    } finally {
      setUndoingTrigger(false)
      setTimeout(() => setTriggerMessage(null), 5000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">SIP Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Manage systematic investment plans and automate wealth building</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button 
            size="sm"
            variant="outline"
            onClick={handleTriggerMonthSIP}
            disabled={triggeringMonth || activeSIPs.length === 0}
            className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform"
            title={activeSIPs.length === 0 ? "No active SIPs to trigger" : "Trigger monthly SIPs"}
          >
            <Calendar className="h-4 w-4" />
            <span>{triggeringMonth ? "Triggering..." : "Trigger Month"}</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingSIP(null)
              setFormOpen(true)
            }}
            className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform"
          >
            <Plus className="h-4 w-4" />
            <span>Create SIP</span>
          </Button>
        </div>
      </div>

      {/* Trigger Message */}
      {triggerMessage && (
        <div className={`p-3 rounded-lg border text-sm font-medium ${
          triggerMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
            : 'bg-blue-500/10 border-blue-500/20 text-blue-700'
        }`}>
          {triggerMessage.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Monthly SIP</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(totalMonthlySIP)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              {activeSIPs.length} active SIPs
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Invested</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">₹{formatCurrency(totalInvested)}</p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/10 border-blue-500/20">
              Cumulative
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">SIPs Status</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">{sips.length}</p>
            <div className="flex gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10">{activeSIPs.length} Active</Badge>
              <Badge variant="secondary" className="text-[10px] font-bold text-orange-600 bg-orange-500/10">{pausedSIPs.length} Paused</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <SIPForm open={formOpen} onOpenChange={setFormOpen} initialData={editingSIP} />

      <Tabs defaultValue="active" className="flex flex-col lg:flex-row gap-8 items-start">
        
        <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-auto bg-transparent border-b lg:border-b-0 lg:border-r border-border/60 rounded-none p-0 items-stretch lg:pr-6 shrink-0 gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <TabsTrigger 
            value="active" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>✅</span>
            <span>Active SIPs</span>
          </TabsTrigger>
          <TabsTrigger 
            value="projection" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📊</span>
            <span>Projections</span>
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary/8 data-[state=active]:text-primary justify-start px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all gap-2 text-muted-foreground hover:bg-muted/50 border border-transparent data-[state=active]:border-primary/10"
          >
            <span>📋</span>
            <span>All SIPs</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          
          {/* Active SIPs */}
          <TabsContent value="active" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 gap-4">
              {activeSIPs.length === 0 ? (
                <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No active SIPs</p>
                  </CardContent>
                </Card>
              ) : (
                activeSIPs.map((sip) => (
                  <Card key={sip.id} className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs hover:bg-background/60 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{sip.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{TYPE_MAP[sip.investmentType] || sip.investmentType}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px]">₹{formatCurrency(sip.amount)}/{sip.frequency}</Badge>
                            <Badge variant="secondary" className="text-[10px]">Started: {sip.startDate}</Badge>
                            {sip.linkedGoal && <Badge variant="secondary" className="text-[10px]">Goal Linked</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">₹{formatCurrency(sip.totalInvested || 0)}</p>
                          <p className="text-xs text-muted-foreground">Invested</p>
                          <div className="flex gap-1 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSIP(sip)
                                setFormOpen(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSIP(sip.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Projections */}
          <TabsContent value="projection" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">SIP Growth Projection</CardTitle>
                <CardDescription>3-year investment growth estimate compounded at 12% annually</CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                {!hasSIPProjection ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">No active SIP projections</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                      Create an active SIP schedule to calculate dynamic compounding projections.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dynamicProjection}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                      <YAxis stroke="var(--color-muted-foreground)" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="invested" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                      <Line type="monotone" dataKey="projected" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#10b981", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All SIPs */}
          <TabsContent value="all" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">All SIP Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                {sips.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No SIPs created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sips.map((sip) => (
                      <div key={sip.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{sip.name}</p>
                          <p className="text-xs text-muted-foreground">{TYPE_MAP[sip.investmentType] || sip.investmentType} • {sip.frequency}</p>
                        </div>
                        <div className="text-right mr-3">
                          <p className="font-bold">₹{formatCurrency(sip.amount)}</p>
                          <Badge variant="outline" className="text-xs mt-1">{STATUS_MAP[sip.sipStatus] || sip.sipStatus}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSIP(sip)
                              setFormOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSIP(sip.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
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

      {/* Trigger History Section */}
      {triggerHistory.length > 0 && (
        <Card className="border-border/40 mt-8">
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg">Trigger History</CardTitle>
                <Badge variant="outline" className="ml-2">{triggerHistory.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          
          {showHistory && (
            <CardContent className="space-y-4 border-t border-border/40 pt-4">
              {triggerHistory.map((history, idx) => (
                <div key={history.id} className="border border-border/40 rounded-lg p-4 bg-muted/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Month: {history.month}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Triggered on: {new Date(history.date).toLocaleDateString()} {new Date(history.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {idx === 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleUndoLastTrigger}
                        disabled={undoingTrigger}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{undoingTrigger ? "Undoing..." : "Undo"}</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {history.triggeredSIPs.length} SIP{history.triggeredSIPs.length !== 1 ? "s" : ""} Triggered
                    </p>
                    {history.triggeredSIPs.map((triggered) => (
                      <div key={triggered.sipId} className="text-xs bg-background/50 p-2 rounded border border-border/20">
                        <p className="font-semibold text-foreground">{triggered.sipName}</p>
                        <p className="text-muted-foreground mt-0.5">
                          <span>₹{formatCurrency(triggered.amount)}</span>
                          <span className="mx-2">→</span>
                          <span>{triggered.savingName}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
