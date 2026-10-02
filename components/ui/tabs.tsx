"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "flex gap-4 w-full",
        orientation === "horizontal" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "inline-flex items-center text-muted-foreground",
  {
    variants: {
      variant: {
        default: "h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        line: "w-full justify-start border-b border-border/60 bg-muted/20 dark:bg-card/60 px-2 h-11 gap-2 rounded-t-xl overflow-x-auto scrollbar-hide",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        // Active state text
        "data-[state=active]:text-foreground dark:data-[state=active]:text-white",
        // Active underline indicator
        "after:absolute after:-bottom-[1px] after:left-0 after:right-0 after:h-[2.5px] after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:after:scale-x-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("w-full text-sm outline-none focus-visible:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
