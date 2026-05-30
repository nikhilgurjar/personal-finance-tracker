// app/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Sparkles } from "lucide-react"

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useFinanceData()

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/dashboard" : "/login")
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
      {/* Logo mark */}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-md">
        <Sparkles className="h-5 w-5 text-primary-foreground" />
      </div>

      {/* Spinner */}
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />

      {/* Label */}
      <p className="text-[13px] font-medium text-muted-foreground tracking-wide">
        Loading Finio…
      </p>
    </div>
  )
}