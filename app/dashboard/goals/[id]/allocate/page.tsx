// app/dashboard/goals/[id]/allocate/page.tsx
"use client"

import { use, useState, useEffect } from "react"
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
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Seed local state from goal once loaded
  useEffect(() => {
    if (goal) {
      const existing: SavingAllocation[] =
        goal.savings_allocations && goal.savings_allocations.length > 0
          ? goal.savings_allocations.map((a) => ({ id: a.id, amount: a.amount }))
          : (goal.savings_ids || []).map((sid) => {
              const s = savings.find((sv) => sv.id === sid)
              return { id: sid, amount: s?.amount ?? 0 }
            })
      setAllocations(existing)
    }
  }, [goal?.id]) // only re-seed when goal id changes

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

  const allocatedSavings = allocations
    .map((alloc) => {
      const s = savings.find((sv) => sv.id === alloc.id)
      return s ? { saving: s, alloc } : null
    })
    .filter((x): x is { saving: Saving; alloc: SavingAllocation } => x !== null)

  const unallocatedSavings = savings.filter((s) => !allocatedSavingIds.has(s.id))

  const filteredUnallocated = unallocatedSavings.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalAllocated = allocations.reduce((sum, a) => sum + safeNumber(a.amount), 0)
  const netSaved = safeNumber(goal.current) + totalAllocated
  const pct = Math.min(100, Math.round((netSaved / safeNumber(goal.target)) * 100))
  const done = pct >= 100

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
    if (!goal) return          // ← add this
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getSavingMeta(s: Saving) {
    const matchedApp = apps.find((a) => a.value === s.app)?.label || s.app
    const matchedProvider = providers.find((p) => p.value === s.provider)?.label || s.provider
    return { matchedApp, matchedProvider }
  }

  return (
    <div className="space-y-6">
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

        <CardContent className="space-y-2">
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
                const { matchedApp, matchedProvider } = getSavingMeta(s)
                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/60 hover:border-primary/20 transition-all group"
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
                      <Button
                        variant="destructive"
                        size="icon-xs"
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

          {/* Save button */}
          {allocations.length > 0 && (
            <>
              <Separator className="bg-border/30 my-2" />
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Total: <span className="text-foreground font-black">₹{formatCurrency(totalAllocated)}</span>
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  size="sm"
                  className={`font-semibold gap-1.5 transition-all ${
                    saved
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                      : ""
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
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Add Saving Sheet ── */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-lg border-border/80">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Add a Saving</SheetTitle>
            <SheetDescription className="text-xs">
              Pick a saving to link to <span className="font-semibold text-foreground">{goal.name}</span>.
              It will be added with its full balance — adjust the amount on the main screen.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search savings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Separator className="bg-border/30" />

            {/* List */}
            <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              {filteredUnallocated.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground font-semibold">
                    {unallocatedSavings.length === 0
                      ? "All savings are already linked to this goal"
                      : "No results for your search"}
                  </p>
                </div>
              ) : (
                filteredUnallocated.map((s) => {
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
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/60 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-base">
                        🐷
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {matchedApp} · {matchedProvider}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-foreground">₹{formatCurrency(s.amount)}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          + Add
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
