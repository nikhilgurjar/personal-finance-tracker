// app/dashboard/goals/[id]/allocate/page.tsx
"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useFinanceData, Goal, Saving, SavingAllocation } from "@/hooks/use-finance-data"
import { safeNumber, formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  ArrowLeft,
  Plus,
  Trash2,
  PiggyBank,
  CheckCircle2,
  Search,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react"

export default function AllocateSavingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { goals, savings, apps, providers, updateGoal } = useFinanceData()

  const goal = goals.find((g) => g.id === id)

  // Local editable allocations: list of { id, amount }
  const [allocations, setAllocations] = useState<SavingAllocation[]>([])
  const [hasSeeded, setHasSeeded] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-focus search input element ref
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Seed local state from goal once loaded
  useEffect(() => {
    if (goal && !hasSeeded) {
      const existing: SavingAllocation[] =
        goal.savings_allocations && goal.savings_allocations.length > 0
          ? goal.savings_allocations.map((a) => ({ id: a.id, amount: a.amount }))
          : (goal.savings_ids || []).map((sid) => {
              const s = savings.find((sv) => sv.id === sid)
              return { id: sid, amount: s?.amount ?? 0 }
            })
            
      // Also pull in any fallback allocations (savings linked directly to the goal but not in existing)
      const fallbackAllocations = savings
        .filter((s) => s.linkedGoals?.includes(goal.id) && !existing.some((alloc) => alloc.id === s.id))
        .map((s) => ({ id: s.id, amount: s.amount }))

      setAllocations([...existing, ...fallbackAllocations])
      if (savings.length > 0) setHasSeeded(true)
    }
  }, [goal?.id, savings, hasSeeded])

  // Focus search input on sheet entry
  useEffect(() => {
    if (addSheetOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 150)
    }
  }, [addSheetOpen])

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground font-semibold">Goal not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/goals")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Goals
        </Button>
      </div>
    )
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const allocatedSavingIds = new Set(allocations.map((a) => a.id))
  const unallocatedSavings = savings.filter((s) => !allocatedSavingIds.has(s.id))

  // Autocomplete Match Engine: Filters against Title, Application context, or Provider tags
  const filteredUnallocated = unallocatedSavings.filter((s) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const matchedApp = apps.find((a) => a.value === s.app)?.label || s.app
    const matchedProvider = providers.find((p) => p.value === s.provider)?.label || s.provider
    
    return (
      s.name.toLowerCase().includes(query) ||
      matchedApp.toLowerCase().includes(query) ||
      matchedProvider.toLowerCase().includes(query)
    )
  })

  // To prevent visual crowding when search is empty, slice list to top 4 recommendations
  const dynamicRenderedSavings = searchQuery.trim() === "" 
    ? filteredUnallocated.slice(0, 4) 
    : filteredUnallocated

  const allocatedSavings = allocations
    .map((alloc) => {
      const s = savings.find((sv) => sv.id === alloc.id)
      return { saving: s, alloc }
    })

  const totalAllocated = allocations.reduce((sum, a) => sum + safeNumber(a.amount), 0)
  const netSaved = safeNumber(goal.current) + totalAllocated
  const pct = Math.min(100, Math.round((netSaved / safeNumber(goal.target)) * 100))
  const done = pct >= 100

  const remainingToTarget = Math.max(0, safeNumber(goal.target) - netSaved)
  const avgAllocationPerSaving = allocations.length > 0 ? Math.round(totalAllocated / allocations.length) : 0

  // ── Handlers ────────────────────────────────────────────────────────────────

  function updateAmount(id: string, amount: number) {
    setAllocations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, amount: Math.max(0, amount) } : a))
    )
  }

  function removeAllocation(id: string) {
    setAllocations((prev) => prev.filter((a) => a.id !== id))
  }

  function addSaving(savingId: string) {
    const s = savings.find((sv) => sv.id === savingId)
    if (!s) return
    setAllocations((prev) => [...prev, { id: savingId, amount: s.amount }])
    setSaved(false)
  }

  async function handleSave() {
    if (!goal) return
    setSaving(true)
    const validAllocations = allocations.filter((a) => safeNumber(a.amount) > 0)
    await updateGoal(goal.id, {
      savings_ids: allocations.map((a) => a.id),
      savings_allocations: validAllocations,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function getSavingMeta(s: Saving) {
    const matchedApp = apps.find((a) => a.value === s.app)?.label || s.app
    const matchedProvider = providers.find((p) => p.value === s.provider)?.label || s.provider
    return { matchedApp, matchedProvider }
  }

  return (
    <div className="space-y-6 max-w-[760px] mx-auto p-1">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/goals"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full shrink-0 ${goal.color || "bg-primary"}`} />
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                {goal.name}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium ml-5">
              Savings Allocation Management
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setAddSheetOpen(true)}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Saving
        </Button>
      </div>

      {/* ── Goal Progress Summary ── */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 shadow-md border ${
          done
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
            : "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-3xl font-black tracking-tight">₹{formatCurrency(netSaved)}</p>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Total allocated towards goal
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-muted-foreground">
              Target: ₹{formatCurrency(goal.target)}
            </p>
            {goal.deadline && (
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                📅 Due {goal.deadline}
              </p>
            )}
            <Badge
              variant={done ? "default" : "outline"}
              className={`mt-1.5 ${
                done
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white border-none"
                  : "text-[10px] font-bold text-muted-foreground bg-muted/40 border-muted"
              }`}
            >
              {done ? "✓ Complete" : `${pct}%`}
            </Badge>
          </div>
        </div>
        <Progress value={pct} className="h-2.5" />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5">
          <span>Base cash: ₹{formatCurrency(goal.current)}</span>
          <span>Savings backing: ₹{formatCurrency(totalAllocated)}</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-background border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Remaining</div>
          <div className="text-lg font-extrabold tracking-tight">₹{formatCurrency(remainingToTarget)}</div>
          <div className="text-[10px] text-muted-foreground font-medium mt-0.5">to reach target</div>
        </div>
        <div className="bg-background border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Savings Linked</div>
          <div className="text-lg font-extrabold tracking-tight text-primary">{allocations.length}</div>
          <div className="text-[10px] text-muted-foreground font-medium mt-0.5">active buckets</div>
        </div>
        <div className="bg-background border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg. per Saving</div>
          <div className="text-lg font-extrabold tracking-tight text-teal-600">₹{formatCurrency(avgAllocationPerSaving)}</div>
          <div className="text-[10px] text-muted-foreground font-medium mt-0.5">per bucket</div>
        </div>
      </div>

      {/* ── Allocation List ── */}
      <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                Allocated Savings
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {allocations.length === 0
                  ? "No savings linked yet — tap \"Add Saving\" to allocate one"
                  : `${allocations.length} saving${allocations.length !== 1 ? "s" : ""} backing this goal`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {allocations.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-semibold">No savings allocated yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px] mx-auto">
                Click <span className="font-bold">+ Add Saving</span> to link a saving to this goal
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allocatedSavings.map(({ saving: s, alloc }) => {
                if (!s) {
                  return (
                    <div
                      key={alloc.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 transition-all group animate-in fade-in slide-in-from-bottom-1"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0 text-destructive">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-destructive truncate">Deleted/Missing Saving</p>
                          <p className="text-[10px] text-destructive/70 mt-0.5">
                            This saving account could not be found. It may have been deleted.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-[140px] text-right text-sm font-bold text-muted-foreground line-through">
                          ₹{formatCurrency(alloc.amount)}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                          onClick={() => removeAllocation(alloc.id)}
                          title="Remove from this goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                }
                
                const { matchedApp, matchedProvider } = getSavingMeta(s)
                const assetUtilizationPct = s.amount > 0 ? Math.min(100, Math.round((safeNumber(alloc.amount) / s.amount) * 100)) : 0

                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/60 hover:border-primary/20 transition-all group animate-in fade-in slide-in-from-bottom-1"
                  >
                    {/* Icon + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0 text-lg">
                        🐷
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {matchedApp} · {matchedProvider}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Full balance: ₹{formatCurrency(s.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Amount input */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={s.amount}
                            step={100}
                            value={alloc.amount}
                            onChange={(e) => updateAmount(s.id, Number(e.target.value))}
                            className="pl-7 w-[140px] h-9 text-sm font-bold"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-[140px] h-0.5 bg-muted mt-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-teal-600 transition-all duration-300"
                            style={{ width: `${assetUtilizationPct}%` }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        onClick={() => removeAllocation(s.id)}
                        title="Remove from this goal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Persistent Save Bar ── */}
          <div>
            <Separator className="bg-border/30 my-2" />
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Allocated</p>
                <p className="text-lg font-black tracking-tight text-foreground">₹{formatCurrency(totalAllocated)}</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || saved}
                size="sm"
                className={`font-semibold gap-1.5 transition-all ${
                  saved ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Allocations"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Autocomplete Search Sheet ── */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-lg border-l border-border/80 p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Link Savings Account
            </SheetTitle>
            <SheetDescription className="text-xs">
              Type to autocomplete. Search across your asset names, application labels, or investment providers.
            </SheetDescription>
          </SheetHeader>

          {/* Search Box Sticky Context */}
          <div className="p-4 bg-muted/30 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, app (e.g. Kuvera) or asset type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:ring-primary/20 font-medium"
              />
            </div>
          </div>

          {/* Autocomplete Content List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {searchQuery.trim() === "" && filteredUnallocated.length > 0 && (
              <div className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest pl-1 mb-1">
                Suggested Buckets ({Math.min(4, filteredUnallocated.length)} of {filteredUnallocated.length})
              </div>
            )}

            {filteredUnallocated.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-muted/10">
                <p className="text-sm font-semibold text-muted-foreground">No matches found</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px] mx-auto">
                  {unallocatedSavings.length === 0 
                    ? "Every savings instance is already tied to this goal parameters."
                    : "Try searching for alternative keyword terms."}
                </p>
              </div>
            ) : (
              dynamicRenderedSavings.map((s) => {
                const { matchedApp, matchedProvider } = getSavingMeta(s)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      addSaving(s.id)
                      setAddSheetOpen(false)
                      setSearchQuery("")
                    }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-xs transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-base group-hover:scale-105 transition-transform">
                      🐷
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {matchedApp} · {matchedProvider}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-foreground">₹{formatCurrency(s.amount)}</p>
                      <p className="text-[10px] text-primary font-bold mt-0.5 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all">
                        Select →
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}