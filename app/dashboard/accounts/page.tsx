// app/dashboard/accounts/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Trash2,
  Edit2,
  Receipt,
  History,
  Clock,
  Calendar,
  Search,
  CreditCard,
  ExternalLink,
} from "lucide-react"
import { useFinanceData, Account, AccountTransaction } from "@/hooks/use-finance-data"
import { AccountForm } from "@/components/forms/account-form"
import { AccountStatementDialog } from "@/components/accounts/account-statement-dialog"
import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

const TYPE_COLORS: Record<string, string> = {
  Savings: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Current: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Stocks:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Credit Card": "bg-rose-500/10 text-rose-600 border-rose-500/20",
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

export default function AccountsPage() {
  const { accounts, deleteAccount, accountTransactions } = useFinanceData()
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null)
  const [statementOpen, setStatementOpen] = useState(false)

  // Audit filter state
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all")
  const [searchAuditQuery, setSearchAuditQuery] = useState<string>("")

  const totalLinkedBalance = accounts
    .filter(a => a.type !== "Credit Card")
    .reduce((sum, a) => sum + a.balance, 0)

  const totalOutstandingCredit = accounts
    .filter(a => a.type === "Credit Card")
    .reduce((sum, a) => sum + a.balance, 0)

  // Map of accountId -> Account for fast lookups
  const accountMap = useMemo(() => {
    const map = new Map<string, Account>()
    accounts.forEach((acc) => map.set(acc.id, acc))
    return map
  }, [accounts])

  // Filtered audit list for the bottom section
  const filteredAuditTxs = useMemo(() => {
    let list = [...accountTransactions]

    if (selectedAccountFilter !== "all") {
      list = list.filter((t) => t.accountId === selectedAccountFilter)
    }

    if (searchAuditQuery.trim()) {
      const q = searchAuditQuery.toLowerCase()
      list = list.filter((t) => {
        const acc = accountMap.get(t.accountId)
        return (
          t.reason?.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          acc?.name.toLowerCase().includes(q) ||
          acc?.bank.toLowerCase().includes(q)
        )
      })
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [accountTransactions, selectedAccountFilter, searchAuditQuery, accountMap])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Manage and audit all linked banking assets & liabilities</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setEditingAccount(null)
            setFormOpen(true)
          }}
          className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Account</span>
        </Button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Liquid Assets — green */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md"
          style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", border: "1px solid #6ee7b7" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#065f46" }}>Total Liquid Assets</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#047857" }}>Savings + Demat valuation</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#059669" }}>
              <ArrowDownLeft className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#064e3b" }}>₹{totalLinkedBalance.toLocaleString("en-IN")}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#059669" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#047857" }}>Savings, current & demat</span>
          </div>
        </div>

        {/* Outstanding Credit — red */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md"
          style={{ background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)", border: "1px solid #fda4af" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#881337" }}>Outstanding Credit</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#be123c" }}>Credit card due amounts</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#e11d48" }}>
              <ArrowUpRight className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#4c0519" }}>₹{totalOutstandingCredit.toLocaleString("en-IN")}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#e11d48" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#be123c" }}>Due billing amounts</span>
          </div>
        </div>

        {/* Active Accounts — indigo */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md sm:col-span-2 lg:col-span-1"
          style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", border: "1px solid #a5b4fc" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#3730a3" }}>Active Accounts</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#4338ca" }}>Linked institutions</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: "#4f46e5" }}>
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-black mt-4 tracking-tight" style={{ color: "#1e1b4b" }}>{accounts.length}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#4f46e5" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#4338ca" }}>Banks, cards & demat</span>
          </div>
        </div>

      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const txsForAcc = accountTransactions.filter(t => t.accountId === acc.id)
          const lastUpdate = txsForAcc.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

          return (
            <Card key={acc.id} className="group relative overflow-hidden border-border/70 hover:border-primary/30 shadow-sm transition-all hover:shadow-md bg-background/60 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Building2 className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold tracking-tight">{acc.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{acc.bank} {acc.last4 !== "—" ? `•••• ${acc.last4}` : ""}</p>
                    </div>
                  </div>
                  <Badge className={`${TYPE_COLORS[acc.type] || "bg-muted text-muted-foreground"} font-medium`} variant="outline">
                    {acc.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <p className="text-2xl font-black tracking-tight">₹{acc?.balance?.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Available Limit & Capital</p>
                  </div>
                  
                  {/* Quick Card Edit/Delete Actions */}
                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => {
                        setEditingAccount(acc)
                        setFormOpen(true)
                      }}
                      title="Edit account details"
                      className="h-7 w-7 rounded-md border-border/60 hover:bg-muted"
                    >
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${acc.name}?`)) {
                          deleteAccount(acc.id)
                        }
                      }}
                      title="Delete account"
                      className="h-7 w-7 rounded-md"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Card Footer: Statement View Button & Update Status */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mr-2" title={lastUpdate ? `Last updated: ${new Date(lastUpdate.date).toLocaleString("en-IN")}` : "No updates recorded"}>
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {lastUpdate ? `Updated ${formatRelativeTime(lastUpdate.date)}` : `${txsForAcc.length} updates`}
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      setSelectedStatementAccount(acc)
                      setStatementOpen(true)
                    }}
                    className="font-semibold text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all shadow-2xs shrink-0"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Statement</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Account Balance Statements & Audit Trail Section */}
      <div className="mt-8 space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-primary" />
              <span>Account Statements & Audit Trail</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chronological log of what updates and when they were made to all account balances
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchAuditQuery}
                onChange={(e) => setSearchAuditQuery(e.target.value)}
                placeholder="Search audit trail..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter}>
              <SelectTrigger className="w-full sm:w-44 h-8 text-xs bg-background">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🏦 All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audit Trail Feed */}
        <div className="rounded-2xl border border-border/70 bg-card/50 backdrop-blur-md overflow-hidden shadow-xs">
          {filteredAuditTxs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <History className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No account updates match your criteria</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                Any balance updates, additions, or edits you make will automatically be logged here with exact timestamps.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredAuditTxs.map((tx) => {
                const acc = accountMap.get(tx.accountId)
                const isPositive = tx.amountChange >= 0
                const isCreation = tx.type === "CREATED"
                const isLimit = tx.type === "CREDIT_LIMIT_UPDATE"

                return (
                  <div
                    key={tx.id}
                    className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3.5">
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
                          <span className="font-bold text-foreground text-sm">
                            {acc?.name || "Deleted Account"}
                          </span>
                          {acc?.type && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                              {acc.type}
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] py-0 px-1.5 font-semibold ${
                              isCreation
                                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                : isPositive
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                            variant="outline"
                          >
                            {isPositive ? "+" : ""}₹{formatCurrency(Math.abs(tx.amountChange))}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                          {tx.reason || (isCreation ? "Account initial balance" : "Balance adjusted")}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80 font-mono flex-wrap">
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

                    {/* Right side balance transition & statement launcher */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-muted-foreground font-mono">
                          {tx.oldBalance !== undefined ? (
                            <span>₹{formatCurrency(tx.oldBalance)} → </span>
                          ) : null}
                          <span className="font-bold text-foreground">₹{formatCurrency(tx.newBalance)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Balance After Update</p>
                      </div>

                      {acc && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setSelectedStatementAccount(acc)
                            setStatementOpen(true)
                          }}
                          className="text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <span>Full Statement</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Account Form Dialog */}
      <AccountForm
        initialData={editingAccount}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* Account Statement Dialog */}
      <AccountStatementDialog
        account={selectedStatementAccount}
        open={statementOpen}
        onOpenChange={setStatementOpen}
        onEditAccount={(acc) => {
          setEditingAccount(acc)
          setFormOpen(true)
        }}
      />
    </div>
  )
}