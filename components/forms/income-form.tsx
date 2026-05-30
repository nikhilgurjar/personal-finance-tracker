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
import { INCOME_SOURCES, INCOME_FREQUENCY } from "@/constants/finance"
import { useFinanceData, Income } from "@/hooks/use-finance-data"
import { formatCurrency } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

const schema = z.object({
  source:    z.string().min(1, "Source is required"),
  amount:    z.coerce.number().positive("Must be positive"),
  frequency: z.string().min(1, "Frequency is required"),
  date:      z.string().min(1, "Date is required"),
  account:   z.string().min(1, "Account is required"),
  note:      z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface IncomeFormProps {
  initialData?: Income | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function IncomeForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: IncomeFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addIncome, updateIncome, accounts } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      source:    "",
      amount:    0,
      frequency: "monthly",
      date:      new Date().toISOString().split("T")[0],
      account:   "",
      note:      "",
    },
  })

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        source: initialData.source,
        amount: initialData.amount,
        frequency: initialData.frequency,
        date: initialData.date,
        account: initialData.account,
        note: initialData.note || "",
      })
    } else if (!initialData && open) {
      form.reset({
        source: "",
        amount: 0,
        frequency: "monthly",
        date: new Date().toISOString().split("T")[0],
        account: "",
        note: "",
      })
    }
  }, [initialData, open, form])

  async function onSubmit(values: FormValues) {
    const formattedData = {
      source: values.source,
      amount: values.amount,
      frequency: values.frequency,
      date: values.date,
      account: values.account,
      note: values.note || "",
    }

    if (initialData) {
      await updateIncome(initialData.id, formattedData)
    } else {
      await addIncome(formattedData)
    }

    form.reset()
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Add Income</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Income Entry" : "💰 Add Income"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="frequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Monthly" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_FREQUENCY.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Received</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control as any} name="account" render={({ field }) => (
              <FormItem>
                <FormLabel>Credited to Account</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control as any} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Monthly salary, freelance project..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full font-semibold">
              {initialData ? "Update Income" : "Add Income"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
