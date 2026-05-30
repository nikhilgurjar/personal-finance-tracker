// components/dashboard/app-sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Wallet, TrendingDown, Target, PiggyBank,
  Settings, LogOut, Sparkles, ArrowLeftRight, TrendingUp, BarChart3
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { FirebaseAuthButton } from "./firebase-auth-button"

const nav = [
  { label: "Overview",  href: "/dashboard", icon: LayoutDashboard },
  { label: "Accounts",  href: "/dashboard/accounts",  icon: Wallet },
  { label: "Income",    href: "/dashboard/income",    icon: TrendingUp },
  { label: "Expenses",  href: "/dashboard/expenses",  icon: TrendingDown },
  { label: "SIP Schedule", href: "/dashboard/sips",   icon: BarChart3 },
  { label: "Goals",     href: "/dashboard/goals",     icon: Target },
  { label: "Savings",   href: "/dashboard/savings",   icon: PiggyBank },
  { label: "Lend & Borrow", href: "/dashboard/lend-borrow", icon: ArrowLeftRight },
]

export function AppSidebar() {
  const path = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Finio</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 pb-2">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/80 p-2 gap-2">
            {nav.map(({ label, href, icon: Icon }) => (
              <SidebarMenuItem key={href} className="rounded-lg">
                <SidebarMenuButton asChild isActive={path === href}>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-5 pb-24 space-y-4 border-t border-sidebar-border/30">
        <FirebaseAuthButton />
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings" className="hover:bg-sidebar-accent rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}