"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { NAV_ITEMS } from "@/constants/finance"

export function TopBar() {
  const path = usePathname()
  const current = NAV_ITEMS.find((n) => n.href === path)?.label ?? "Dashboard"
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 gap-2">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">{current}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </Button>
      </div>
    </header>
  )
}