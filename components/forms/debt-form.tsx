// components/forms/debt-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
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
import { Plus, Pencil } from "lucide-react"

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
  editTransaction?: DebtTransaction   // if provided → edit mode
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

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
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const isEditMode = !!editTransaction

  const { debts, addDebtTransaction, updateDebtTransaction } = useFinanceData()

  // Get list of unique existing people
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
        // Pre-fill with existing transaction data
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
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Log Debt Record</span>
    </Button>
  )  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader className="p-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            {isEditMode ? <><Pencil className="h-5 w-5 text-primary" /> Edit Debt Entry</> : <>🤝 Log Debt / Repayment</>}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable Fields container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Person Name Selection */}
              <FormField control={form.control} name="personName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Person</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {existingPeople.map((person) => (
                        <SelectItem key={person} value={person}>👤 {person}</SelectItem>
                      ))}
                      {!isEditMode && <SelectItem value="new">➕ Add New Person...</SelectItem>}
                    </SelectContent>
                  </Select>
                  {isEditMode && (
                    <p className="text-[11px] text-muted-foreground mt-1">Person name cannot be changed when editing.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* Custom Name field if "new" is selected */}
              {watchPerson === "new" && !isEditMode && (
                <FormField control={form.control} name="customPerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name of lender/borrower" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Transaction Type */}
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lent">📤 I Lent Money (Lent to them)</SelectItem>
                      <SelectItem value="borrowed">📥 I Borrowed Money (Borrowed from them)</SelectItem>
                      <SelectItem value="lent_repayment">💵 Lent Repayment (They repaid to me)</SelectItem>
                      <SelectItem value="borrowed_repayment">💸 Borrowed Repayment (I repaid to them)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Note <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Lent for flight tickets, partial cash repayment" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Sticky Actions Footer */}
            <div className="flex justify-end gap-2 p-5 border-t border-border/40 bg-muted/10">
              <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="font-semibold px-6">
                {form.formState.isSubmitting
                  ? (isEditMode ? "Saving..." : "Logging...")
                  : (isEditMode ? "Save Changes" : "Log Transaction")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
  )
}
