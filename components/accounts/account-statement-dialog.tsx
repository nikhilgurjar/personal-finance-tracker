"use client"

import React, { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  useFinanceData,
  Account,
  AccountTransaction,
  Expense,
  Income,
} from "@/hooks/use-finance-data"
import { formatCurrency } from "@/lib/utils"
import {
  History,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Search,
  Edit2,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  Receipt,
  CreditCard,
} from "lucide-react"

interface AccountStatementDialogProps {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditAccount?: (account: Account) => void
}

type CombinedStatementItem =
  | {
      id: string
      date: string
      itemType: "ACCOUNT_TX"
      data: AccountTransaction
    }
  | {
      id: string
      date: string
      itemType: "EXPENSE"
      data: Expense
    }
  | {
      id: string
      date: string
      itemType: "INCOME"
      data: Income
    }

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date().getTime()
    const time = new Date(dateString).getTime()
    const diffSeconds = Math.round((now - time) / 1000)

    if (diffSeconds < 60) return "Just now"
    const diffMinutes = Math.round(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.round(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    const diffMonths = Math.round(diffDays / 30)
    return `${diffMonths}mo ago`
  } catch {
    return ""
  }
}

export function AccountStatementDialog({
  account,
  open,
  onOpenChange,
  onEditAccount,
}: AccountStatementDialogProps) {
  const {
    accountTransactions,
    expenses,
    income,
    updateAccount,
  } = useFinanceData()

  const [activeTab, setActiveTab] = useState<"updates" | "all" | "expenses" | "income">("updates")
  const [searchQuery, setSearchQuery] = useState("")
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
  const [newBalanceInput, setNewBalanceInput] = useState<string>("")
  const [updateReasonInput, setUpdateReasonInput] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter transactions for this account
  const accountTxs = useMemo(() => {
    if (!account) return []
    return accountTransactions
      .filter((tx) => tx.accountId === account.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [account, accountTransactions])

  // Filter expenses tagged to this account (by id or by name)
  const accountExpenses = useMemo(() => {
    if (!account) return []
    return expenses
      .filter((e) => e.account === account.id || e.account === account.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [account, expenses])

  // Filter income tagged to this account
  const accountIncomes = useMemo(() => {
    if (!account) return []
    return income
      .filter((i) => i.account === account.id || i.account === account.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [account, income])

  // Combined timeline
  const combinedTimeline: CombinedStatementItem[] = useMemo(() => {
    const list: CombinedStatementItem[] = [
      ...accountTxs.map((t) => ({
        id: `tx_${t.id}`,
        date: t.date,
        itemType: "ACCOUNT_TX" as const,
        data: t,
      })),
      ...accountExpenses.map((e) => ({
        id: `exp_${e.id}`,
        date: e.date,
        itemType: "EXPENSE" as const,
        data: e,
      })),
      ...accountIncomes.map((i) => ({
        id: `inc_${i.id}`,
        date: i.date,
        itemType: "INCOME" as const,
        data: i,
      })),
    ]

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [accountTxs, accountExpenses, accountIncomes])

  // Summary Metrics
  const startingRecord = useMemo(() => {
    const sortedAsc = [...accountTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return sortedAsc.find((t) => t.type === "CREATED") || sortedAsc[0]
  }, [accountTxs])

  const initialBalance = startingRecord ? startingRecord.newBalance : account?.balance ?? 0
  const netBalanceChange = (account?.balance ?? 0) - initialBalance
  const lastUpdatedTx = accountTxs[0]

  // Filter items by search query
  const filteredTxs = useMemo(() => {
    if (!searchQuery.trim()) return accountTxs
    const q = searchQuery.toLowerCase()
    return accountTxs.filter(
      (tx) =>
        tx.reason?.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q) ||
        tx.date.toLowerCase().includes(q)
    )
  }, [accountTxs, searchQuery])

  const filteredCombined = useMemo(() => {
    if (!searchQuery.trim()) return combinedTimeline
    const q = searchQuery.toLowerCase()
    return combinedTimeline.filter((item) => {
      if (item.itemType === "ACCOUNT_TX") {
        return (
          item.data.reason?.toLowerCase().includes(q) ||
          item.data.type.toLowerCase().includes(q)
        )
      } else if (item.itemType === "EXPENSE") {
        return (
          item.data.category.toLowerCase().includes(q) ||
          item.data.note?.toLowerCase().includes(q)
        )
      } else {
        return (
          item.data.source.toLowerCase().includes(q) ||
          item.data.note?.toLowerCase().includes(q)
        )
      }
    })
  }, [combinedTimeline, searchQuery])

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return accountExpenses
    const q = searchQuery.toLowerCase()
    return accountExpenses.filter(
      (e) => e.category.toLowerCase().includes(q) || e.note?.toLowerCase().includes(q)
    )
  }, [accountExpenses, searchQuery])

  const filteredIncome = useMemo(() => {
    if (!searchQuery.trim()) return accountIncomes
    const q = searchQuery.toLowerCase()
    return accountIncomes.filter(
      (i) => i.source.toLowerCase().includes(q) || i.note?.toLowerCase().includes(q)
    )
  }, [accountIncomes, searchQuery])

  // Handle Quick Balance Update
  const handleQuickUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    const parsedBalance = parseFloat(newBalanceInput)
    if (isNaN(parsedBalance) || parsedBalance < 0) return

    setIsSubmitting(true)
    try {
      await updateAccount(
        account.id,
        { balance: parsedBalance },
        updateReasonInput.trim() || undefined
      )
      setIsUpdatingBalance(false)
      setNewBalanceInput("")
      setUpdateReasonInput("")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!account) return

    const headers = ["Date", "Time", "Event Type", "Description / Reason", "Old Balance", "New Balance", "Change Amount"]
    const rows = accountTxs.map((t) => {
      const dt = new Date(t.date)
      const dateStr = dt.toLocaleDateString("en-IN")
      const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      const diffFormatted = `${t.amountChange >= 0 ? "+" : ""}${t.amountChange}`
      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${t.type}"`,
        `"${(t.reason || "").replace(/"/g, '""')}"`,
        t.oldBalance !== undefined ? t.oldBalance : "",
        t.newBalance,
        `"${diffFormatted}"`,
      ].join(",")
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${account.name.replace(/\s+/g, "_")}_statement.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold tracking-tight">{account.name}</DialogTitle>
                  <Badge variant="outline" className="font-semibold text-xs py-0.5">
                    {account.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {account.bank} {account.last4 !== "—" ? `•••• ${account.last4}` : ""}
                </p>
              </div>
            </div>

            {/* Current Balance Display & Actions */}
            <div className="flex items-center gap-2 sm:self-center">
              <div className="text-right sm:mr-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-black tracking-tight text-foreground">
                  ₹{formatCurrency(account.balance)}
                </p>
              </div>

              <Button
                variant={isUpdatingBalance ? "secondary" : "default"}
                size="sm"
                onClick={() => {
                  if (!isUpdatingBalance) {
                    setNewBalanceInput(account.balance.toString())
                    setUpdateReasonInput("")
                  }
                  setIsUpdatingBalance(!isUpdatingBalance)
                }}
                className="gap-1.5 font-semibold text-xs shadow-sm"
              >
                {isUpdatingBalance ? <RotateCcw className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                <span>{isUpdatingBalance ? "Cancel" : "Update Balance"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                title="Export statement as CSV"
                className="gap-1.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Quick Balance Update Panel (Inline Form) */}
          {isUpdatingBalance && (
            <form
              onSubmit={handleQuickUpdateBalance}
              className="mt-4 p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick Account Balance Update
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Previous: <span className="font-semibold text-foreground">₹{formatCurrency(account.balance)}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    New Balance (₹)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={newBalanceInput}
                    onChange={(e) => setNewBalanceInput(e.target.value)}
                    placeholder="Enter new balance"
                    className="bg-background text-sm font-semibold"
                    autoFocus
                    required
                  />
                  {newBalanceInput !== "" && !isNaN(parseFloat(newBalanceInput)) && (
                    <p
                      className={`text-[11px] font-semibold mt-1 ${
                        parseFloat(newBalanceInput) - account.balance >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      Difference: {parseFloat(newBalanceInput) - account.balance >= 0 ? "+" : ""}₹
                      {formatCurrency(parseFloat(newBalanceInput) - account.balance)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Update Reason / Note
                  </label>
                  <Input
                    type="text"
                    value={updateReasonInput}
                    onChange={(e) => setUpdateReasonInput(e.target.value)}
                    placeholder="e.g. Salary credited, Passbook sync, Reconciliation"
                    className="bg-background text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUpdatingBalance(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || newBalanceInput === "" || isNaN(parseFloat(newBalanceInput))}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Save Update & Log Statement"}</span>
                </Button>
              </div>
            </form>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <div className="p-3 rounded-xl border border-border/60 bg-background/60 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opening Balance</p>
              <p className="text-sm font-black text-foreground mt-0.5">₹{formatCurrency(initialBalance)}</p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/60 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Adjustments</p>
              <p className="text-sm font-black text-foreground mt-0.5">{accountTxs.length}</p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/60 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Change</p>
              <p
                className={`text-sm font-black mt-0.5 ${
                  netBalanceChange >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {netBalanceChange >= 0 ? "+" : ""}₹{formatCurrency(netBalanceChange)}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/60 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Updated</p>
              <p className="text-xs font-semibold text-foreground mt-1 truncate" title={lastUpdatedTx ? new Date(lastUpdatedTx.date).toLocaleString("en-IN") : "Never"}>
                {lastUpdatedTx ? formatRelativeTime(lastUpdatedTx.date) : "Initial"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content Tabs & Search */}
        <div className="p-6 pt-3 flex-1 flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
              <TabsList className="bg-muted/70 p-1">
                <TabsTrigger value="updates" className="text-xs font-semibold gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Balance Updates ({accountTxs.length})</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs font-semibold gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>All Activity ({combinedTimeline.length})</span>
                </TabsTrigger>
                <TabsTrigger value="expenses" className="text-xs font-semibold gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                  <span>Debits ({accountExpenses.length})</span>
                </TabsTrigger>
                <TabsTrigger value="income" className="text-xs font-semibold gap-1.5">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Credits ({accountIncomes.length})</span>
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter statement..."
                  className="pl-8 h-8 text-xs bg-muted/30"
                />
              </div>
            </div>

            {/* Tab 1: Balance Updates (Audit Trail) */}
            <TabsContent value="updates" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 max-h-[420px]">
              {filteredTxs.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
                  <History className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No balance updates recorded yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                    Whenever you update this account balance or adjust settings, each change will be logged here with date, time, and difference.
                  </p>
                </div>
              ) : (
                filteredTxs.map((tx) => {
                  const isPositive = tx.amountChange >= 0
                  const isCreation = tx.type === "CREATED"
                  const isLimit = tx.type === "CREDIT_LIMIT_UPDATE"

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-border/70 hover:border-border transition-colors bg-card/60 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                            isCreation
                              ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                              : isLimit
                              ? "bg-violet-500/10 text-violet-600 border border-violet-500/20"
                              : isPositive
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}
                        >
                          {isCreation ? (
                            <Building2 className="h-4.5 w-4.5" />
                          ) : isLimit ? (
                            <CreditCard className="h-4.5 w-4.5" />
                          ) : isPositive ? (
                            <ArrowDownLeft className="h-4.5 w-4.5" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {isCreation
                                ? "Account Initialized"
                                : isLimit
                                ? "Credit Limit Adjusted"
                                : isPositive
                                ? "Balance Increased"
                                : "Balance Decreased"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-1.5 font-semibold ${
                                isCreation
                                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                  : isPositive
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              }`}
                            >
                              {isPositive ? "+" : ""}₹{formatCurrency(Math.abs(tx.amountChange))}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {tx.reason || (isCreation ? "Account opened" : "Manual balance update")}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80 font-mono">
                            <Calendar className="h-3 w-3 inline text-muted-foreground" />
                            <span>
                              {new Date(tx.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <Clock className="h-3 w-3 inline text-muted-foreground" />
                            <span>
                              {new Date(tx.date).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>•</span>
                            <span className="font-sans text-[10px] bg-muted/60 px-1.5 py-0.2 rounded-md">
                              {formatRelativeTime(tx.date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Balance Transition */}
                      <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <div className="text-xs text-muted-foreground font-mono">
                          {tx.oldBalance !== undefined ? (
                            <span>₹{formatCurrency(tx.oldBalance)} → </span>
                          ) : null}
                          <span className="font-bold text-foreground">₹{formatCurrency(tx.newBalance)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Recorded Balance</p>
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>

            {/* Tab 2: Combined Activity Timeline */}
            <TabsContent value="all" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 max-h-[420px]">
              {filteredCombined.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
                  <History className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No account events found</p>
                </div>
              ) : (
                filteredCombined.map((item) => {
                  if (item.itemType === "ACCOUNT_TX") {
                    const tx = item.data
                    const isPositive = tx.amountChange >= 0
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                            ⚙️
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">Balance Update</span>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {isPositive ? "+" : ""}₹{formatCurrency(Math.abs(tx.amountChange))}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {tx.reason || "Manual update"} • {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold">
                          ₹{formatCurrency(tx.newBalance)}
                        </div>
                      </div>
                    )
                  } else if (item.itemType === "EXPENSE") {
                    const exp = item.data
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                            💸
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground capitalize">
                                {exp.category.replace(/_/g, " ")}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 text-rose-600 bg-rose-500/10 border-rose-500/20">
                                Expense
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {exp.note || "No note"} • {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-rose-600">
                          -₹{formatCurrency(exp.amount)}
                        </div>
                      </div>
                    )
                  } else {
                    const inc = item.data
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                            💰
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground capitalize">
                                {inc.source.replace(/_/g, " ")}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                                Income
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {inc.note || "No note"} • {new Date(inc.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-600">
                          +₹{formatCurrency(inc.amount)}
                        </div>
                      </div>
                    )
                  }
                })
              )}
            </TabsContent>

            {/* Tab 3: Expenses (Debits) */}
            <TabsContent value="expenses" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 max-h-[420px]">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
                  <ArrowUpRight className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No expenses recorded for this account</p>
                </div>
              ) : (
                filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground capitalize">{exp.category.replace(/_/g, " ")}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {exp.note || "Expense entry"} • {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold text-rose-600">
                      -₹{formatCurrency(exp.amount)}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab 4: Income (Credits) */}
            <TabsContent value="income" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 max-h-[420px]">
              {filteredIncome.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
                  <ArrowDownLeft className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No income recorded for this account</p>
                </div>
              ) : (
                filteredIncome.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground capitalize">{inc.source.replace(/_/g, " ")}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {inc.note || "Income deposit"} • {new Date(inc.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-600">
                      +₹{formatCurrency(inc.amount)}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
