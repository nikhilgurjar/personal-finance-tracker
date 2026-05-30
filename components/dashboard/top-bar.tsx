"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell, Search } from "lucide-react"
import { NAV_ITEMS } from "@/constants/finance"

export function TopBar() {
  const path = usePathname()
  const current = NAV_ITEMS.find((n) => n.href === path)?.label ?? "Overview"

  // Format current month, e.g. "May 2026"
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border/60 bg-card px-4 gap-3">
      {/* Left */}
      <div className="flex items-center gap-2.5 min-w-0">
        <SidebarTrigger className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4 bg-border/60" />
        <span className="truncate text-[13px] font-medium text-foreground/80">
          Dashboard
        </span>
        <span className="text-muted-foreground/50 select-none">·</span>
        <span className="truncate text-[13px] font-semibold text-foreground">
          {current}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Month indicator */}
        <span className="hidden sm:inline-flex items-center rounded-full border border-border/80 bg-accent/60 px-3 py-1 font-mono text-[11px] font-medium text-accent-foreground">
          {monthLabel}
        </span>

        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
      </div>
    </header>
  )
}