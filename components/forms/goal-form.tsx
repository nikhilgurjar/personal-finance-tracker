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
import { Plus } from "lucide-react"

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

  const { addGoal, updateGoal } = useFinanceData()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: "", category: "emergency_fund", target: 0, current: 0, deadline: "",
    },
  })

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        category: initialData.category,
        target: initialData.target,
        current: initialData.current,
        deadline: initialData.deadline || "",
      })
    } else if (!initialData && open) {
      form.reset({
        name: "", category: "emergency_fund", target: 0, current: 0, deadline: "",
      })
    }
  }, [initialData, open, form])

  async function onSubmit(values: FormValues) {
    const randomColors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-pink-500", "bg-amber-500"]
    const color = initialData?.color || randomColors[Math.floor(Math.random() * randomColors.length)]

    const formattedData = {
      name: values.name,
      category: values.category,
      target: values.target,
      current: values.current,
      savings_ids: initialData?.savings_ids || [],
      savings_allocations: initialData?.savings_allocations || [],
      deadline: values.deadline || "",
      color
    }

    if (initialData) {
      await updateGoal(initialData.id, formattedData)
    } else {
      await addGoal(formattedData)
    }

    form.reset()
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