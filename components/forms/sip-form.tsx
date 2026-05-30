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
import { SIP_TYPES, SIP_FREQUENCY, SIP_STATUS, SAVINGS_APPS } from "@/constants/finance"
import { useFinanceData, SIPSchedule } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

const schema = z.object({
  name:             z.string().min(1, "Name is required"),
  investmentType:   z.string().min(1, "Type is required"),
  amount:           z.coerce.number().positive("Must be positive"),
  frequency:        z.string().min(1, "Frequency is required"),
  startDate:        z.string().min(1, "Start date is required"),
  endDate:          z.string().optional(),
  account:          z.string().min(1, "Account is required"),
  app:              z.string().min(1, "App is required"),
  sipStatus:        z.string().min(1, "Status is required"),
  totalInvested:    z.coerce.number().optional(),
  linkedGoal:       z.string().optional(),
  note:             z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SIPFormProps {
  initialData?: SIPSchedule | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SIPForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: SIPFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addSIP, updateSIP, accounts, goals } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
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

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        investmentType: initialData.investmentType,
        amount: initialData.amount,
        frequency: initialData.frequency,
        startDate: initialData.startDate,
        endDate: initialData.endDate || "",
        account: initialData.account,
        app: initialData.app,
        sipStatus: initialData.sipStatus,
        totalInvested: initialData.totalInvested || 0,
        linkedGoal: initialData.linkedGoal || "",
        note: initialData.note || "",
      })
    } else if (!initialData && open) {
      form.reset({
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
      name: values.name,
      investmentType: values.investmentType,
      amount: values.amount,
      frequency: values.frequency,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      account: values.account,
      app: values.app,
      sipStatus: values.sipStatus as "active" | "paused" | "completed",
      totalInvested: values.totalInvested,
      linkedGoal: values.linkedGoal || undefined,
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
            {initialData ? "✏️ Edit SIP Schedule" : "📊 Create New SIP"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <FormField control={form.control as any} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>SIP Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Axis Small Cap SIP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="totalInvested" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Invested (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="linkedGoal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Goal (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
              {initialData ? "Update SIP" : "Create SIP"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
