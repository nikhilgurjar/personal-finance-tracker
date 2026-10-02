// components/dashboard/app-sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  Wallet,
  TrendingDown,
  Target,
  PiggyBank,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  BarChart3,
  Sparkles,
  Brain,
  X,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FirebaseAuthButton } from "./firebase-auth-button"

const PRIMARY_NAV = [
  { label: "Overview",      href: "/dashboard",              icon: LayoutDashboard },
  { label: "Accounts",      href: "/dashboard/accounts",     icon: Wallet },
  { label: "Income",        href: "/dashboard/income",       icon: TrendingUp },
  { label: "Expenses",      href: "/dashboard/expenses",     icon: TrendingDown },
  { label: "SIP Schedule",  href: "/dashboard/sips",         icon: BarChart3 },
  { label: "Goals",         href: "/dashboard/goals",        icon: Target },
  { label: "Savings",       href: "/dashboard/savings",      icon: PiggyBank },
  { label: "AI Coach",      href: "/dashboard/ai-plan",      icon: Brain },
  { label: "Lend & Borrow", href: "/dashboard/lend-borrow",  icon: ArrowLeftRight },
]

export function AppSidebar() {
  const path = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleNavClick = useCallback(() => {
    setOpenMobile(false)
  }, [setOpenMobile])

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setOpenMobile(false)
  }, [path, setOpenMobile])

  return (
    <Sidebar className="border-r border-sidebar-border/60 bg-sidebar">
      {/* ── Logo & Mobile Close ── */}
      <SidebarHeader className="px-4 py-3 border-b border-sidebar-border/60">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight text-[15px] text-sidebar-foreground">
              Finio
            </span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
              Pro
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleNavClick}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* ── Primary nav ── */}
      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu
          </SidebarGroupLabel>

          <SidebarMenu className="gap-0.5">
            {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
              const active = path === href
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={cn(
                      "group h-9 gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Link href={href} onClick={handleNavClick}>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                        )}
                      />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border/60 px-3 py-3 space-y-2">
        {/* Settings link */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-9 gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
            >
              <Link href="/dashboard/settings" onClick={handleNavClick}>
                <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Auth / user card */}
        <FirebaseAuthButton />
      </SidebarFooter>
    </Sidebar>
  )
}
