// components/dashboard/firebase-auth-button.tsx
"use client"

import { useFinanceData } from "@/hooks/use-finance-data"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, Cloud, ShieldAlert } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { isConfigured } from "@/lib/firebase"

export function FirebaseAuthButton() {
  const { user, isDemo, loginWithGoogle, logout } = useFinanceData()

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3.5">
        <div className="flex items-center gap-2 text-warning">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider">Demo Offline Mode</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Configure Firebase environmental keys in <code className="bg-muted px-1 py-0.5 rounded text-[10px]">.env.local</code> to activate real-time cloud backup.
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <AvatarImage src={user.photoURL ?? ""} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {user.displayName?.split(" ").map(n => n[0]).join("").substring(0, 2) ?? "JD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-foreground">{user.displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={logout}
            className="hover:bg-destructive/10 hover:text-destructive shrink-0"
            title="Disconnect Sync"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 justify-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded py-1">
          <Cloud className="h-3 w-3 animate-pulse" />
          <span>Real-time Cloud Sync Active</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-muted bg-muted/20 p-3.5">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cloud Sync</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Sync your financial data across multiple devices in real-time.
      </p>
      <Button
        size="sm"
        className="w-full flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold rounded-lg shadow-sm"
        onClick={loginWithGoogle}
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Connect Google</span>
      </Button>
    </div>
  )
}
