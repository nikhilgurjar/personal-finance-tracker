// app/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFinanceData } from "@/hooks/use-finance-data"

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useFinanceData()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
