// components/forms/goal-form.tsx
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
import { GOAL_CATEGORIES } from "@/constants/finance"
import { useFinanceData, Goal } from "@/hooks/use-finance-data"
import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { formatCurrency, safeNumber } from "@/lib/utils"

const schema = z.object({
  name:     z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  target:   z.coerce.number().positive("Must be positive"),
  current:  z.coerce.number().min(0),
  deadline: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GoalFormProps {
  initialData?: Goal | null
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function GoalForm({ initialData, triggerButton, open: controlledOpen, onOpenChange: controlledOnOpenChange }: GoalFormProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const { addGoal, updateGoal, savings } = useFinanceData()
  const [savingAllocations, setSavingAllocations] = useState<Record<string, number>>({})

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: "", category: "emergency_fund", target: 0, current: 0, deadline: "",
    },
  })

  useEffect(() => {
    if (initialData && open) {
      const allocations: Record<string, number> = {}
      if (initialData.savings_allocations?.length) {
        initialData.savings_allocations.forEach((alloc) => {
          allocations[alloc.id] = alloc.amount
        })
      } else if (initialData.savings_ids?.length) {
        initialData.savings_ids.forEach((id) => {
          const savingsItem = savings.find((s) => s.id === id)
          allocations[id] = savingsItem?.amount ?? 0
        })
      }

      form.reset({
        name: initialData.name,
        category: initialData.category,
        target: initialData.target,
        current: initialData.current,
        deadline: initialData.deadline || "",
      })
      setSavingAllocations(allocations)
    } else if (!initialData && open) {
      form.reset({
        name: "", category: "emergency_fund", target: 0, current: 0, deadline: "",
      })
      setSavingAllocations({})
    }
  }, [initialData, open, form, savings])

  function toggleSaving(id: string) {
    setSavingAllocations((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      const selectedSaving = savings.find((s) => s.id === id)
      return {
        ...prev,
        [id]: selectedSaving?.amount ?? 0,
      }
    })
  }

  function setAllocation(id: string, amount: number) {
    setSavingAllocations((prev) => {
      const next = { ...prev }
      if (amount <= 0) {
        delete next[id]
      } else {
        next[id] = amount
      }
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    const randomColors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-pink-500", "bg-amber-500"]
    const color = initialData?.color || randomColors[Math.floor(Math.random() * randomColors.length)]

    const savingsAllocations = Object.entries(savingAllocations)
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => ({ id, amount }))

    const formattedData = {
      name: values.name,
      category: values.category,
      target: values.target,
      current: values.current,
      savings_ids: Object.keys(savingAllocations),
      savings_allocations: savingsAllocations,
      deadline: values.deadline || "",
      color
    }

    if (initialData) {
      await updateGoal(initialData.id, formattedData)
    } else {
      await addGoal(formattedData)
    }

    form.reset()
    setSavingAllocations({})
    if (setOpen) setOpen(false)
  }

  const trigger = triggerButton || (
    <Button size="sm" className="font-semibold gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
      <Plus className="h-4 w-4" />
      <span>New Goal</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "✏️ Edit Financial Goal" : "🎯 Create New Goal"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Vacation to Japan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="target" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="current" render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Saved so far (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="deadline" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Deadline <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Link to Savings — dynamically from useFinanceData savings */}
            <div className="space-y-2 pt-1">
              <FormLabel className="text-sm font-semibold">Allocate Savings to this Goal <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <div className="space-y-2">
                {savings.map((s) => {
                  const active = savingAllocations[s.id] !== undefined
                  const allocation = savingAllocations[s.id] ?? 0
                  return (
                    <div key={s.id} className="rounded-2xl border border-border/60 bg-muted/50 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSaving(s.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all select-none ${active ? "bg-primary/10 text-primary border border-primary/20" : "bg-white/80 text-muted-foreground border border-border/60 hover:bg-muted"}`}
                        >
                          {active ? "Linked" : "Link"}
                        </button>
                        <div className="text-xs font-semibold text-muted-foreground">₹{formatCurrency(s.amount)} total</div>
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-bold text-foreground">🐷 {s.name}</div>
                        {active ? (
                          <Input
                            type="number"
                            min={0}
                            max={safeNumber(s.amount)}
                            step={100}
                            value={allocation}
                            onChange={(e) => setAllocation(s.id, Number(e.target.value))}
                            placeholder={`Allocate up to ₹${formatCurrency(s.amount)}`}
                            className="max-w-[220px]"
                          />
                        ) : (
                          <div className="text-[10px] text-muted-foreground">Tap Link to allocate part of this asset</div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {savings.length === 0 && (
                  <p className="text-xs text-muted-foreground font-medium py-1">No active savings assets logged yet. Create some in the Savings tab!</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/30">
              <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="font-semibold px-6">
                {form.formState.isSubmitting ? "Saving..." : initialData ? "Update Goal" : "Save Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}