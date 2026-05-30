// components/forms/account-form.tsx
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
import { useFinanceData, Account } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

const schema = z.object({
  name:         z.string().min(1, "Account Name is required"),
  bank:         z.string().min(1, "Bank/Broker is required"),
  type:         z.string().min(1, "Account Type is required"),
  last4:        z.string().length(4, "Must be exactly 4 digits").or(z.string().length(0)),
  balance:      z.coerce.number().min(0, "Balance must be positive"),
  creditLimit:  z.coerce.number().optional(),
  note:         z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AccountFormProps {
  initialData?: Account | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AccountForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AccountFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addAccount, updateAccount } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: "",
      bank: "",
      type: "Savings",
      last4: "",
      balance: 0,
      creditLimit: 0,
      note: "",
    },
  })

  // Watch type to conditionally show Credit Limit
  const watchType = form.watch("type")

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        bank: initialData.bank || "",
        type: initialData.type,
        last4: initialData.last4 === "—" ? "" : initialData.last4,
        balance: initialData.balance,
        creditLimit: initialData.creditLimit || 0,
        note: initialData.note || "",
      })
    } else if (!initialData && open) {
      form.reset({
        name: "",
        bank: "",
        type: "Savings",
        last4: "",
        balance: 0,
        creditLimit: 0,
        note: "",
      })
    }
  }, [initialData, open, form])

  async function onSubmit(values: FormValues) {
    const formattedData = {
      name: values.name,
      bank: values.bank,
      type: values.type,
      last4: values.last4 || "—",
      balance: values.balance,
      creditLimit: values.type === "Credit Card" ? values.creditLimit : undefined,
      note: values.note || "",
    }

    if (initialData) {
      await updateAccount(initialData.id, formattedData)
    } else {
      await addAccount(formattedData)
    }

    form.reset()
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Add Account</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Account" : "🏦 Link New Account"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bank" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank / Broker</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Bank, Zerodha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Savings">💰 Savings</SelectItem>
                      <SelectItem value="Current">🏢 Current</SelectItem>
                      <SelectItem value="Stocks">📈 Stocks / Demat</SelectItem>
                      <SelectItem value="Credit Card">💳 Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="last4" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last 4 Digits</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4821 (optional)" maxLength={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="balance" render={({ field }) => (
                <FormItem>
                  <FormLabel>{watchType === "Credit Card" ? "Outstanding Balance (₹)" : "Initial Balance (₹)"}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {watchType === "Credit Card" && (
                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="Specific bank branch, routing, or details" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="font-semibold px-6">
                {form.formState.isSubmitting ? "Saving..." : initialData ? "Update Account" : "Link Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
