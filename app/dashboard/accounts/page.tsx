// app/dashboard/accounts/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUpRight, ArrowDownLeft, Building2, Trash2, Edit2 } from "lucide-react"
import { useFinanceData, Account } from "@/hooks/use-finance-data"
import { AccountForm } from "@/components/forms/account-form"
import { useState } from "react"

const TYPE_COLORS: Record<string, string> = {
  Savings: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Current: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Stocks:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Credit Card": "bg-rose-500/10 text-rose-600 border-rose-500/20",
}

export default function AccountsPage() {
  const { accounts, deleteAccount } = useFinanceData()
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const totalLinkedBalance = accounts
    .filter(a => a.type !== "Credit Card")
    .reduce((sum, a) => sum + a.balance, 0)

  const totalOutstandingCredit = accounts
    .filter(a => a.type === "Credit Card")
    .reduce((sum, a) => sum + a.balance, 0)

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
        {accounts.map((acc) => (
          <Card key={acc.id} className="group relative overflow-hidden border-border/70 hover:border-primary/30 shadow-sm transition-all hover:shadow-md bg-background/60 backdrop-blur-md">
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
            <CardContent>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <p className="text-2xl font-black tracking-tight">₹{acc?.balance?.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Available Limit & Capital</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => {
                      setEditingAccount(acc)
                      setFormOpen(true)
                    }}
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
                    className="h-7 w-7 rounded-md"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Form Dialog */}
      <AccountForm
        initialData={editingAccount}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}