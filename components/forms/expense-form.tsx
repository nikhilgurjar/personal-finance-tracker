// components/forms/expense-form.tsx
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
import { EXPENSE_CATEGORIES } from "@/constants/finance"
import { useFinanceData, Expense } from "@/hooks/use-finance-data"
import { formatCurrency } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

const schema = z.object({
  date:     z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  amount:   z.coerce.number().positive("Must be positive"),
  account:  z.string().min(1, "Account is required"),
  note:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ExpenseFormProps {
  initialData?: Expense | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExpenseForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ExpenseFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addExpense, updateExpense, accounts } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      date:     new Date().toISOString().split("T")[0],
      category: "",
      amount:   0,
      account:  "",
      note:     "",
    },
  })

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        date: initialData.date,
        category: initialData.category,
        amount: initialData.amount,
        account: initialData.account,
        note: initialData.note || "",
      })
    } else if (!initialData && open) {
      form.reset({
        date:     new Date().toISOString().split("T")[0],
        category: "",
        amount:   0,
        account:  "",
        note:     "",
      })
    }
  }, [initialData, open, form])

  async function onSubmit(values: FormValues) {
    const formattedData = {
      date: values.date,
      category: values.category,
      amount: values.amount,
      account: values.account,
      note: values.note ?? "",
    }

    if (initialData) {
      await updateExpense(initialData.id, formattedData)
    } else {
      await addExpense(formattedData)
    }

    form.reset()
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Add Expense</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Expense Record" : "💸 Add Expense"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

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

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="account" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Used</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>🏦 {a.name} (₹{formatCurrency(a.balance)})</SelectItem>
                    ))}
                    {accounts.length === 0 && (
                      <SelectItem value="none" disabled>No linked accounts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant / Note <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g. Amazon, Swiggy order, Rent payment" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="font-semibold px-6">
                {form.formState.isSubmitting ? "Saving..." : initialData ? "Update Expense" : "Save Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}