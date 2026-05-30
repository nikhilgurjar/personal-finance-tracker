// components/forms/savings-form.tsx
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SAVINGS_TYPES } from "@/constants/finance"
import { useFinanceData, Saving } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"

const schema = z.object({
  name:         z.string().min(1, "Name is required"),
  owner:        z.string().min(1, "Owner is required"),
  type:         z.string().min(1, "Type is required"),
  app:          z.string().min(1, "App is required"),
  custom_app:   z.string().optional(),
  provider:     z.string().min(1, "Provider is required"),
  custom_provider: z.string().optional(),
  amount:       z.coerce.number().positive("Must be positive"),
  frequency:    z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SavingsFormProps {
  initialData?: Saving | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SavingsForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: SavingsFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addSaving, updateSaving, goals, apps, providers, addApp, addProvider } = useFinanceData()
  const [linkedGoals, setLinkedGoals] = useState<string[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: "", owner: "John Doe", type: "mf", app: "",
      provider: "", amount: 0, frequency: "Monthly",
    },
  })

  const watchApp      = form.watch("app")
  const watchProvider = form.watch("provider")

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        owner: initialData.owner,
        type: initialData.type,
        app: apps.some(a => a.value === initialData.app) ? initialData.app : "other",
        custom_app: apps.some(a => a.value === initialData.app) ? "" : initialData.app,
        provider: providers.some(p => p.value === initialData.provider) ? initialData.provider : "other",
        custom_provider: providers.some(p => p.value === initialData.provider) ? "" : initialData.provider,
        amount: initialData.amount,
        frequency: initialData.frequency || "Monthly",
      })
      setLinkedGoals(initialData.linkedGoals || [])
    } else if (!initialData && open) {
      form.reset({
        name: "",
        owner: "John Doe",
        type: "mf",
        app: "",
        custom_app: "",
        provider: "",
        custom_provider: "",
        amount: 0,
        frequency: "Monthly",
      })
      setLinkedGoals([])
    }
  }, [initialData, open, form, apps, providers])

  function toggleGoal(id: string) {
    setLinkedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  async function onSubmit(values: FormValues) {
    let finalApp = values.app
    let finalProvider = values.provider

    if (values.app === "other" && values.custom_app) {
      await addApp(values.custom_app)
      finalApp = values.custom_app.toLowerCase().replace(/[^a-z0-9]/g, "_")
    }

    if (values.provider === "other" && values.custom_provider) {
      await addProvider(values.custom_provider)
      finalProvider = values.custom_provider.toLowerCase().replace(/[^a-z0-9]/g, "_")
    }

    const formattedData = {
      name: values.name,
      owner: values.owner,
      type: values.type,
      app: finalApp,
      provider: finalProvider,
      amount: values.amount,
      linkedGoals: linkedGoals,
      frequency: values.frequency || "Monthly",
      active: true
    }

    if (initialData) {
      await updateSaving(initialData.id, formattedData)
    } else {
      await addSaving(formattedData)
    }

    form.reset()
    setLinkedGoals([])
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>Add Saving</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg backdrop-blur-lg bg-background/95 border-border/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Saving Entry" : "🐷 Add New Saving"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Axis Small Cap SIP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="owner" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Owner</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John / Priya" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="FD, MF, ETF..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SAVINGS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Allocated Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* App */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="app" render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment App</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform app" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {apps.filter((a) => a.value !== "other").map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                      <SelectItem value="other">➕ Custom (Type Manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="frequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="One-time">📅 One-time / Lumpsum</SelectItem>
                      <SelectItem value="Monthly">🔄 Monthly SIP</SelectItem>
                      <SelectItem value="Quarterly">🔄 Quarterly</SelectItem>
                      <SelectItem value="Yearly">🔄 Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {watchApp === "other" && (
              <FormField control={form.control as any} name="custom_app" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform App Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter custom app name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Provider */}
            <FormField control={form.control as any} name="provider" render={({ field }) => (
              <FormItem>
                <FormLabel>Fund House / Provider</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider/bank" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {providers.filter((p) => p.value !== "other").map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                    <SelectItem value="other">➕ Custom (Type Manually)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchProvider === "other" && (
              <FormField control={form.control as any} name="custom_provider" render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Provider Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter custom provider name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Link to Goals — dynamic goals from state */}
            <div className="space-y-2.5 pt-1">
              <FormLabel className="text-sm font-semibold">Link to Financial Goals <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => {
                  const active = linkedGoals.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs border font-medium transition-all select-none flex items-center gap-1.5 cursor-pointer
                        ${active
                          ? "bg-primary/10 text-primary border-primary/20 shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-border/60 hover:border-muted-foreground/30 hover:bg-muted"
                        }`}
                    >
                      <span>🎯 {g.name}</span>
                      {active && <X className="h-3 w-3 shrink-0 text-primary hover:text-primary/75" />}
                    </button>
                  )
                })}
                {goals.length === 0 && (
                  <p className="text-xs text-muted-foreground font-medium py-1">No active goals created to link. Create goals on the Goals tab first!</p>
                )}
              </div>
              {linkedGoals.length > 0 && (
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Linked to {linkedGoals.length} goal{linkedGoals.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/30">
              <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="font-semibold px-6">
                {form.formState.isSubmitting ? "Saving..." : initialData ? "Update Asset" : "Save Saving"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}