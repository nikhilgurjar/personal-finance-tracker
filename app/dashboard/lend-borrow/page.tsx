// app/dashboard/lend-borrow/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
  ArrowLeftRight, TrendingUp, TrendingDown, Trash2,
  Calendar, Info, Plus, HelpCircle, Pencil, ChevronDown
} from "lucide-react"
import { useFinanceData, DebtTransaction } from "@/hooks/use-finance-data"
import { useState } from "react"

// ─── Inline Debt Form (accordion) ─────────────────────────────────────────────
function InlineDebtForm({
  existingPeople,
  editTransaction,
  onSubmit,
  onCancel,
}: {
  existingPeople: string[]
  editTransaction?: DebtTransaction
  onSubmit: (data: Omit<DebtTransaction, "id">) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!editTransaction

  const [personName, setPersonName]   = useState(editTransaction?.personName ?? (existingPeople[0] ?? "new"))
  const [customPerson, setCustomPerson] = useState("")
  const [type, setType]               = useState<DebtTransaction["type"]>(editTransaction?.type ?? "lent")
  const [amount, setAmount]           = useState(editTransaction?.amount?.toString() ?? "")
  const [date, setDate]               = useState(editTransaction?.date ?? new Date().toISOString().split("T")[0])
  const [note, setNote]               = useState(editTransaction?.note ?? "")
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState("")

  const finalName = personName === "new" ? customPerson.trim() : personName

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!finalName) { setError("Please enter a person's name."); return }
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid positive amount."); return }
    if (!date) { setError("Please pick a date."); return }

    setSaving(true)
    try {
      await onSubmit({ personName: finalName, type, amount: amt, date, note })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-destructive font-semibold bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Person */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Person</Label>
        <Select value={personName} onValueChange={setPersonName} disabled={isEdit}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select person" />
          </SelectTrigger>
          <SelectContent>
            {existingPeople.map(p => (
              <SelectItem key={p} value={p}>👤 {p}</SelectItem>
            ))}
            <SelectItem value="new">➕ New Person…</SelectItem>
          </SelectContent>
        </Select>
        {isEdit && (
          <p className="text-[10px] text-muted-foreground">Person cannot be changed while editing.</p>
        )}
      </div>

      {/* Custom name input — only when "new" */}
      {personName === "new" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Person's Full Name</Label>
          <Input
            placeholder="e.g. Rahul Sharma"
            value={customPerson}
            onChange={e => setCustomPerson(e.target.value)}
            className="h-9 text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Type */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Transaction Type</Label>
        <Select value={type} onValueChange={v => setType(v as DebtTransaction["type"])}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lent">📤 I Lent Money (they owe me)</SelectItem>
            <SelectItem value="borrowed">📥 I Borrowed Money (I owe them)</SelectItem>
            <SelectItem value="lent_repayment">💵 Lent Repayment (they repaid me)</SelectItem>
            <SelectItem value="borrowed_repayment">💸 Borrowed Repayment (I repaid them)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Amount (₹)</Label>
          <Input
            type="number"
            min="1"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">
          Note <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="e.g. Lent for rent, partial repayment by cash…"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1 border-t border-border/30">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving} className="font-semibold px-5">
          {saving ? (isEdit ? "Saving…" : "Logging…") : (isEdit ? "Save Changes" : "Log Transaction")}
        </Button>
      </div>
    </form>
  )
}

// ─── Type label helper ─────────────────────────────────────────────────────────
function txMeta(type: string) {
  if (type === "lent")               return {
    label: "You Lent",
    sub: "Money sent out",
    amtColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600",
    emoji: "📤",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    badgeLabel: "Lent",
  }
  if (type === "borrowed")           return {
    label: "You Borrowed",
    sub: "Money received",
    amtColor: "text-rose-700 dark:text-rose-400",
    borderColor: "border-l-rose-500",
    bg: "bg-rose-50/60 dark:bg-rose-950/30",
    iconBg: "bg-rose-100 dark:bg-rose-900",
    iconColor: "text-rose-600",
    emoji: "📥",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    badgeLabel: "Borrowed",
  }
  if (type === "lent_repayment")     return {
    label: "They Repaid",
    sub: "Received back",
    amtColor: "text-sky-700 dark:text-sky-400",
    borderColor: "border-l-sky-400",
    bg: "bg-sky-50/60 dark:bg-sky-950/30",
    iconBg: "bg-sky-100 dark:bg-sky-900",
    iconColor: "text-sky-600",
    emoji: "💵",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
    badgeLabel: "Repaid to you",
  }
  if (type === "borrowed_repayment") return {
    label: "You Repaid",
    sub: "Money returned",
    amtColor: "text-violet-700 dark:text-violet-400",
    borderColor: "border-l-violet-500",
    bg: "bg-violet-50/60 dark:bg-violet-950/30",
    iconBg: "bg-violet-100 dark:bg-violet-900",
    iconColor: "text-violet-600",
    emoji: "💸",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
    badgeLabel: "You repaid",
  }
  return { label: type, sub: "", amtColor: "", borderColor: "", bg: "", iconBg: "", iconColor: "", emoji: "💰", badge: "", badgeLabel: "" }
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LendBorrowPage() {
  const { debts, addDebtTransaction, updateDebtTransaction, deleteDebtTransaction } = useFinanceData()

  // Accordion open state — "add" or "" (closed)
  const [accordionValue, setAccordionValue] = useState("")

  // Ledger dialog
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Edit state
  const [editingTx, setEditingTx] = useState<DebtTransaction | undefined>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Pre-fill person when "Log Repayment" is clicked from inside a ledger
  const [prefillPerson, setPrefillPerson] = useState<string>("")

  // Group by person
  const peopleMap = debts.reduce((acc, curr) => {
    if (!acc[curr.personName]) acc[curr.personName] = []
    acc[curr.personName].push(curr)
    return acc
  }, {} as Record<string, DebtTransaction[]>)

  const existingPeople = Object.keys(peopleMap)

  const aggregatedPeople = Object.entries(peopleMap).map(([name, transactions]) => {
    let lent = 0, borrowed = 0, lentRepaid = 0, borrowedRepaid = 0
    transactions.forEach(t => {
      if (t.type === "lent") lent += t.amount
      else if (t.type === "borrowed") borrowed += t.amount
      else if (t.type === "lent_repayment") lentRepaid += t.amount
      else if (t.type === "borrowed_repayment") borrowedRepaid += t.amount
    })
    const netBalance = (lent + borrowedRepaid) - (borrowed + lentRepaid)
    return {
      name, netBalance, lent, borrowed, lentRepaid, borrowedRepaid,
      transactions: [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  }).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))

  const totalLent     = aggregatedPeople.filter(p => p.netBalance > 0).reduce((s, p) => s + p.netBalance, 0)
  const totalBorrowed = aggregatedPeople.filter(p => p.netBalance < 0).reduce((s, p) => s + Math.abs(p.netBalance), 0)
  const netPosition   = totalLent - totalBorrowed

  const selectedPersonData = aggregatedPeople.find(p => p.name === selectedPerson)

  // Handlers
  const handleAddSubmit = async (data: Omit<DebtTransaction, "id">) => {
    await addDebtTransaction(data)
    setAccordionValue("")
    setPrefillPerson("")
  }

  const handleEditSubmit = async (data: Omit<DebtTransaction, "id">) => {
    if (editingTx) await updateDebtTransaction(editingTx.id, data)
    setEditingTx(undefined)
    setEditDialogOpen(false)
  }

  const handleDelete = (tx: DebtTransaction) => {
    if (confirm(`Delete ₹${tx.amount.toLocaleString("en-IN")} entry permanently?`)) {
      deleteDebtTransaction(tx.id)
    }
  }

  const openAddWithPerson = (name: string) => {
    setPrefillPerson(name)
    setDetailsOpen(false)
    setAccordionValue("add")
    // scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Lend &amp; Borrow
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Log loans, borrowings, and repayments
          </p>
        </div>
        <Button
          size="sm"
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
          onClick={() => setAccordionValue(v => v === "add" ? "" : "add")}
        >
          <Plus className="h-4 w-4" />
          Log Debt Record
        </Button>
      </div>

      {/* ── Add Form (plain div toggle — no Accordion height constraints) ── */}
      <div className="border border-border/70 rounded-xl shadow-sm bg-background/60 backdrop-blur-md">
        {/* Header row — click to toggle */}
        <button
          type="button"
          onClick={() => setAccordionValue(v => v === "add" ? "" : "add")}
          className="w-full flex items-center gap-2.5 px-5 py-4 hover:bg-muted/40 transition-colors rounded-xl text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Log New Debt / Repayment</p>
            <p className="text-[11px] text-muted-foreground font-medium">Click to expand the entry form</p>
          </div>
          <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 ${accordionValue === "add" ? "rotate-180" : ""}`} />
        </button>

        {/* Form — no overflow-hidden, grows freely with content */}
        {accordionValue === "add" && (
          <div className="px-5 pb-5 pt-2 border-t border-border/40">
            <InlineDebtForm
              existingPeople={existingPeople}
              onSubmit={handleAddSubmit}
              onCancel={() => { setAccordionValue(""); setPrefillPerson("") }}
              key={prefillPerson + accordionValue}
            />
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Lent Card — green */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md"
          style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", border: "1px solid #6ee7b7" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#065f46" }}>Total Lent</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#047857" }}>Money owed to you</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#059669" }}>
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#064e3b" }}>
            ₹{totalLent.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#059669" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#047857" }}>Receivable from others</span>
          </div>
        </div>

        {/* Borrowed Card — red */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md"
          style={{ background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)", border: "1px solid #fda4af" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#881337" }}>Total Borrowed</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#be123c" }}>Money you owe others</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#e11d48" }}>
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#4c0519" }}>
            ₹{totalBorrowed.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#e11d48" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#be123c" }}>Payable to others</span>
          </div>
        </div>

        {/* Net Card — primary/blue */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md sm:col-span-2 lg:col-span-1"
          style={{
            background: netPosition >= 0
              ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              : "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
            border: netPosition >= 0 ? "1px solid #86efac" : "1px solid #fda4af"
          }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider"
                style={{ color: netPosition >= 0 ? "#14532d" : "#881337" }}>Net Position</p>
              <p className="text-xs font-medium mt-0.5"
                style={{ color: netPosition >= 0 ? "#15803d" : "#be123c" }}>
                {netPosition >= 0 ? "You're in profit" : "You're in deficit"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
              style={{ background: netPosition >= 0 ? "#16a34a" : "#e11d48" }}>
              <ArrowLeftRight className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight"
            style={{ color: netPosition >= 0 ? "#052e16" : "#4c0519" }}>
            {netPosition < 0 ? "-" : "+"}₹{Math.abs(netPosition).toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full"
              style={{ background: netPosition >= 0 ? "#16a34a" : "#e11d48" }} />
            <span className="text-[11px] font-semibold"
              style={{ color: netPosition >= 0 ? "#15803d" : "#be123c" }}>
              {netPosition >= 0 ? "Net receivable" : "Net payable"}
            </span>
          </div>
        </div>

      </div>

      {/* ── People Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {aggregatedPeople.length === 0 ? (
          <Card className="border-border/70 border-dashed col-span-full py-14 flex flex-col items-center justify-center bg-background/50">
            <HelpCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No lend or borrow records yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs text-center">
              Use the form above to log your first entry.
            </p>
          </Card>
        ) : (
          aggregatedPeople.map(person => {
            const pos = person.netBalance > 0
            const neg = person.netBalance < 0
            const settled = person.netBalance === 0
            return (
              <Card
                key={person.name}
                className={`border-border/70 shadow-sm hover:shadow-md transition-all bg-background/60 backdrop-blur-md
                  ${pos ? "border-emerald-500/20" : neg ? "border-rose-500/20" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-extrabold tracking-tight">👤 {person.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                        {person.transactions.length} log{person.transactions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`font-bold border-none text-xs ${
                      pos ? "text-emerald-600 bg-emerald-500/10" : neg ? "text-rose-600 bg-rose-500/10" : "bg-muted text-muted-foreground"
                    }`}>
                      {settled ? "✓ Settled" : pos ? "Owes You" : "You Owe"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className={`text-2xl font-black tracking-tight ${
                      pos ? "text-emerald-600 dark:text-emerald-500" : neg ? "text-rose-600 dark:text-rose-500" : "text-muted-foreground"
                    }`}>
                      ₹{Math.abs(person.netBalance).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Net balance</p>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-muted-foreground leading-normal">
                      <p>Lent: ₹{person.lent.toLocaleString("en-IN")}</p>
                      <p className="mt-0.5">Borrowed: ₹{person.borrowed.toLocaleString("en-IN")}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedPerson(person.name); setDetailsOpen(true) }}
                      className="h-8 rounded-lg text-xs font-bold gap-1 border-border/60 hover:bg-muted shrink-0"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Ledger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ── Ledger Detail Dialog ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg backdrop-blur-lg bg-background/95 border-border/80 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>👤 Ledger:</span>
              <span className="text-primary">{selectedPerson}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Full transaction history · hover a row to edit or delete
            </DialogDescription>
          </DialogHeader>

          {selectedPersonData && (
            <div className="space-y-5 pt-2">
              {/* Balance summary */}
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <p className={`text-2xl font-black ${
                    selectedPersonData.netBalance > 0 ? "text-emerald-600 dark:text-emerald-500"
                      : selectedPersonData.netBalance < 0 ? "text-rose-600 dark:text-rose-500"
                      : "text-muted-foreground"
                  }`}>
                    ₹{Math.abs(selectedPersonData.netBalance).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    {selectedPersonData.netBalance > 0 ? "Owed to you" : selectedPersonData.netBalance < 0 ? "You owe them" : "Fully settled"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openAddWithPerson(selectedPersonData.name)}
                  className="font-semibold text-xs gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Log Entry
                </Button>
              </div>

              {/* Transactions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</h4>
                <Separator className="bg-border/30" />
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {selectedPersonData.transactions.map(tx => {
                    const m = txMeta(tx.type)
                    return (
                      <div
                        key={tx.id}
                        className={`group relative flex items-center justify-between pl-4 pr-3 py-3 rounded-xl border-l-[3px] border border-border/30 transition-all hover:shadow-sm ${m.borderColor} ${m.bg}`}
                      >
                        {/* Left: emoji icon + text */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${m.iconBg}`}>
                            {m.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-foreground">{m.label}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${m.badge}`}>{m.badgeLabel}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5 shrink-0" />
                              <span>{tx.date}</span>
                              {tx.note && (
                                <><span>·</span><span className="italic truncate max-w-[100px] text-foreground/60">{tx.note}</span></>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: amount + actions */}
                        <div className="flex items-center gap-1 shrink-0 ml-3">
                          <span className={`font-black text-sm tabular-nums ${m.amtColor}`}>
                            ₹{tx.amount.toLocaleString("en-IN")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => { setEditingTx(tx); setEditDialogOpen(true) }}
                            className="h-7 w-7 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDelete(tx)}
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/30">
                <Button size="sm" variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={o => { setEditDialogOpen(o); if (!o) setEditingTx(undefined) }}>
        <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit Transaction
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update the details of this debt entry.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <InlineDebtForm
              key={editingTx.id}
              existingPeople={existingPeople}
              editTransaction={editingTx}
              onSubmit={handleEditSubmit}
              onCancel={() => { setEditDialogOpen(false); setEditingTx(undefined) }}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}