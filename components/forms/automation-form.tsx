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
import { SIP_TYPES, SIP_FREQUENCY, SIP_STATUS, SAVINGS_APPS, AUTOMATION_TYPES, EXPENSE_CATEGORIES } from "@/constants/finance"
import { useFinanceData, SIPSchedule } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

const schema = z.object({
  automationType:   z.string().min(1, "Type is required"),
  expenseCategory:  z.string().optional(),
  triggerDay:       z.coerce.number().min(1).max(31).optional(),
  savingId:         z.string().optional(),
  name:             z.string().min(1, "Name is required"),
  investmentType:   z.string().optional(),
  amount:           z.coerce.number().positive("Must be positive"),
  frequency:        z.string().min(1, "Frequency is required"),
  startDate:        z.string().min(1, "Start date is required"),
  endDate:          z.string().optional(),
  account:          z.string().min(1, "Account is required"),
  app:              z.string().optional(),
  sipStatus:        z.string().min(1, "Status is required"),
  totalInvested:    z.coerce.number().optional(),
  linkedGoal:       z.string().optional(),
  note:             z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AutomationFormProps {
  initialData?: SIPSchedule | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AutomationForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AutomationFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addSIP, updateSIP, accounts, goals, savings } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      automationType: "investment",
      expenseCategory: "",
      triggerDay: 1,
      savingId: "",
      name: "",
      investmentType: "mf",
      amount: 0,
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      account: "",
      app: "",
      sipStatus: "active",
      totalInvested: 0,
      linkedGoal: "",
      note: "",
    },
  })

  const watchAutomationType = form.watch("automationType")
  const watchSavingId = form.watch("savingId")

  // Auto-populate Name, Investment Type, and App/Broker when a saving asset is selected
  useEffect(() => {
    if (watchSavingId && watchSavingId !== "") {
      const selected = savings.find((s) => s.id === watchSavingId)
      if (selected) {
        form.setValue("name", selected.name)
        form.setValue("investmentType", selected.type)
        form.setValue("app", selected.app)
      }
    }
  }, [watchSavingId, savings, form])

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        automationType: (initialData.automationType as any) || "investment",
        expenseCategory: initialData.expenseCategory || "",
        triggerDay: initialData.triggerDay || 1,
        savingId: initialData.savingId || "",
        name: initialData.name,
        investmentType: initialData.investmentType || "mf",
        amount: initialData.amount,
        frequency: initialData.frequency,
        startDate: initialData.startDate,
        endDate: initialData.endDate || "",
        account: initialData.account,
        app: initialData.app || "",
        sipStatus: initialData.sipStatus,
        totalInvested: initialData.totalInvested || 0,
        linkedGoal: initialData.linkedGoal || "",
        note: initialData.note || "",
      })
    } else if (!initialData && open) {
      form.reset({
        automationType: "investment",
        expenseCategory: "",
        triggerDay: 1,
        savingId: "",
        name: "",
        investmentType: "mf",
        amount: 0,
        frequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        account: "",
        app: "",
        sipStatus: "active",
        totalInvested: 0,
        linkedGoal: "",
        note: "",
      })
    }
  }, [initialData, open, form])

  async function onSubmit(values: FormValues) {
    const formattedData = {
      automationType: values.automationType as "expense" | "investment",
      expenseCategory: values.automationType === "expense" ? values.expenseCategory : undefined,
      triggerDay: values.triggerDay,
      savingId: values.automationType === "investment" ? values.savingId : undefined,
      name: values.name,
      investmentType: values.automationType === "investment" ? values.investmentType! : "expense",
      amount: values.amount,
      frequency: values.frequency,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      account: values.account,
      app: values.automationType === "investment" ? values.app! : "none",
      sipStatus: values.sipStatus as "active" | "paused" | "completed",
      totalInvested: values.totalInvested,
      linkedGoal: values.linkedGoal === "none" ? undefined : (values.linkedGoal || undefined),
      note: values.note || "",
    }

    if (initialData) {
      await updateSIP(initialData.id, formattedData)
    } else {
      await addSIP(formattedData)
    }

    form.reset()
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Create SIP</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg backdrop-blur-lg bg-background/95 border-border/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Automation" : "📊 Create New Automation"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="automationType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Automation Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUTOMATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="triggerDay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Day (1-31)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" min={1} max={31} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {watchAutomationType === "investment" && (
              <FormField control={form.control as any} name="savingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Saving / Asset (Required)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select existing saving asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {savings.map((sav) => (
                        <SelectItem key={sav.id} value={sav.id}>
                          {sav.name} ({sav.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {watchAutomationType === "expense" && (
              <FormField control={form.control as any} name="expenseCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control as any} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder={watchAutomationType === "investment" ? "e.g., Axis Small Cap SIP" : "e.g., House Rent"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {watchAutomationType === "investment" && (
                <FormField control={form.control as any} name="investmentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SIP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control as any} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5000" {...field} />
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
                      {SIP_FREQUENCY.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="sipStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Active" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SIP_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="account" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
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

              {watchAutomationType === "investment" && (
                <FormField control={form.control as any} name="app" render={({ field }) => (
                  <FormItem>
                    <FormLabel>App/Broker</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select app" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SAVINGS_APPS.map((app) => (
                          <SelectItem key={app.value} value={app.value}>{app.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {watchAutomationType === "investment" && (
                <FormField control={form.control as any} name="totalInvested" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Invested (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control as any} name="linkedGoal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Goal (Optional)</FormLabel>
<Select onValueChange={field.onChange} value={field.value ?? "none"}>
                    
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
<SelectItem value="none">None</SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control as any} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Long-term wealth building..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full font-semibold">
              {initialData ? "Update Automation" : "Create Automation"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
