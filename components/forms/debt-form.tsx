// components/forms/debt-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useFinanceData, DebtTransaction } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus, Pencil, User, ArrowUpRight, ArrowDownLeft, RefreshCw, IndianRupee, X } from "lucide-react"
import { cn } from "@/lib/utils"

const schema = z.object({
  personName:   z.string().min(1, "Person's Name is required"),
  customPerson: z.string().optional(),
  type:         z.string().min(1, "Transaction Type is required"),
  amount:       z.coerce.number().positive("Amount must be positive"),
  date:         z.string().min(1, "Date is required"),
  note:         z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DebtFormProps {
  initialPersonName?: string
  editTransaction?: DebtTransaction
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TX_TYPES = [
  {
    value: "lent",
    label: "I Lent",
    sub: "They owe me",
    icon: ArrowUpRight,
    color: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500",
    inactiveBg: "bg-muted/30 border-border/50 hover:border-border",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60",
  },
  {
    value: "borrowed",
    label: "I Borrowed",
    sub: "I owe them",
    icon: ArrowDownLeft,
    color: "text-rose-600 dark:text-rose-400",
    activeBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500",
    inactiveBg: "bg-muted/30 border-border/50 hover:border-border",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
  },
  {
    value: "lent_repayment",
    label: "They Repaid",
    sub: "Repayment to me",
    icon: RefreshCw,
    color: "text-sky-600 dark:text-sky-400",
    activeBg: "bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500",
    inactiveBg: "bg-muted/30 border-border/50 hover:border-border",
    iconBg: "bg-sky-100 dark:bg-sky-900/60",
  },
  {
    value: "borrowed_repayment",
    label: "I Repaid",
    sub: "I paid them back",
    icon: RefreshCw,
    color: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-50 dark:bg-violet-950/60 border-violet-400 dark:border-violet-500",
    inactiveBg: "bg-muted/30 border-border/50 hover:border-border",
    iconBg: "bg-violet-100 dark:bg-violet-900/60",
  },
]

export function DebtForm({
  initialPersonName,
  editTransaction,
  triggerButton,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DebtFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setLocalOpen
  const isEditMode = !!editTransaction

  const { debts, addDebtTransaction, updateDebtTransaction } = useFinanceData()
  const existingPeople = Array.from(new Set(debts.map(d => d.personName)))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      personName:   "",
      customPerson: "",
      type:         "lent",
      amount:       0,
      date:         new Date().toISOString().split("T")[0],
      note:         "",
    },
  })

  const watchPerson = form.watch("personName")

  useEffect(() => {
    if (open) {
      if (isEditMode && editTransaction) {
        form.reset({
          personName:   editTransaction.personName,
          customPerson: "",
          type:         editTransaction.type,
          amount:       editTransaction.amount,
          date:         editTransaction.date,
          note:         editTransaction.note ?? "",
        })
      } else {
        form.reset({
          personName:   initialPersonName || (existingPeople.length > 0 ? existingPeople[0] : "new"),
          customPerson: "",
          type:         "lent",
          amount:       0,
          date:         new Date().toISOString().split("T")[0],
          note:         "",
        })
      }
    }
  }, [open, initialPersonName, isEditMode, editTransaction])

  async function onSubmit(values: FormValues) {
    const finalName = values.personName === "new" ? values.customPerson : values.personName
    if (!finalName) {
      form.setError("customPerson", { message: "Please specify a name." })
      return
    }

    const formattedData = {
      personName: finalName.trim(),
      type:       values.type as DebtTransaction["type"],
      amount:     values.amount,
      date:       values.date,
      note:       values.note ?? "",
    }

    if (isEditMode && editTransaction) {
      await updateDebtTransaction(editTransaction.id, formattedData)
    } else {
      await addDebtTransaction(formattedData)
    }

    form.reset()
    setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Log Debt Record</span>
    </Button>
  )

  // ── Closed state: just the trigger button ──────────────────────────────────
  if (!open) {
    return (
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>
    )
  }

  // ── Open state: inline card, no dialog/drawer ──────────────────────────────
  return (
    <div className="w-full rounded-2xl border border-border/70 bg-background shadow-md overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-lg shrink-0",
                isEditMode
                  ? "bg-primary/10"
                  : "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40"
              )}>
                {isEditMode ? <Pencil className="h-4 w-4 text-primary" /> : "🤝"}
              </span>
              <div>
                <p className="text-base font-bold tracking-tight leading-tight">
                  {isEditMode ? "Edit Debt Entry" : "Log Debt / Repayment"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {isEditMode
                    ? "Update the details of this transaction."
                    : "Record a loan, borrowing, or repayment."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body — no height constraint, just flows naturally */}
          <div className="px-5 py-4 space-y-4">

            {/* Person selector */}
            <FormField control={form.control} name="personName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Person
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60 focus:ring-1 focus:ring-primary/40">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {existingPeople.map((person) => (
                      <SelectItem key={person} value={person}>
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-[10px] flex items-center justify-center font-bold text-primary">
                            {person[0]?.toUpperCase()}
                          </span>
                          {person}
                        </span>
                      </SelectItem>
                    ))}
                    {!isEditMode && (
                      <SelectItem value="new">
                        <span className="flex items-center gap-2 text-primary font-medium">
                          <Plus className="h-3.5 w-3.5" /> Add New Person…
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isEditMode && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50" />
                    Person cannot be changed while editing.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {/* New person name — appears inline, no height fight */}
            {watchPerson === "new" && !isEditMode && (
              <FormField control={form.control} name="customPerson" render={({ field }) => (
                <FormItem className="animate-in slide-in-from-top-1 duration-150">
                  <FormLabel className="text-xs font-semibold text-foreground/80">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      autoFocus
                      className="h-9 text-sm bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Transaction Type */}
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80">Transaction Type</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    {TX_TYPES.map((tx) => {
                      const Icon = tx.icon
                      const isActive = field.value === tx.value
                      return (
                        <button
                          key={tx.value}
                          type="button"
                          onClick={() => field.onChange(tx.value)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 cursor-pointer",
                            isActive ? tx.activeBg : tx.inactiveBg
                          )}
                        >
                          <span className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            isActive ? tx.iconBg : "bg-muted/60"
                          )}>
                            <Icon className={cn("h-3.5 w-3.5", isActive ? tx.color : "text-muted-foreground")} />
                          </span>
                          <div>
                            <p className={cn("text-[11px] font-bold leading-tight", isActive ? tx.color : "text-foreground")}>{tx.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{tx.sub}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Date + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80">Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 text-sm bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" /> Amount
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="0"
                      className="h-9 text-sm bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Note */}
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80">
                  Note <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Lent for flight tickets, partial cash repayment…"
                    rows={2}
                    className="text-sm resize-none bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Footer — always visible, just sits at bottom of card */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border/50 bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-medium truncate hidden sm:block">
              {isEditMode ? "Changes are saved immediately." : "₹ • Indian Rupees"}
            </p>
            <div className="flex gap-2 shrink-0 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-medium border-border/60"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={form.formState.isSubmitting}
                className="h-8 px-5 text-xs font-semibold gap-1.5 shadow-sm"
              >
                {form.formState.isSubmitting
                  ? (isEditMode ? "Saving…" : "Logging…")
                  : (isEditMode ? "Save Changes" : "Log Transaction")}
              </Button>
            </div>
          </div>

        </form>
      </Form>
    </div>
  )
}