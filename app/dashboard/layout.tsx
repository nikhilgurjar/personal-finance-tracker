// app/dashboard/layout.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFinanceData } from "@/hooks/use-finance-data"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import "../globals.css"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useFinanceData()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // If loading finished and user is still null, hold rendering layout to prevent flash of content
  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-h-screen bg-background text-foreground min-w-0 max-w-full overflow-x-hidden">
        <TopBar />
        <div className="flex-1 p-3.5 sm:p-5 md:p-6 min-w-0 max-w-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
