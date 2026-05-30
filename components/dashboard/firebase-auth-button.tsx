// components/dashboard/firebase-auth-button.tsx
"use client"

import { useFinanceData } from "@/hooks/use-finance-data"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogIn, LogOut, Cloud, ShieldAlert } from "lucide-react"
import { isConfigured } from "@/lib/firebase"

export function FirebaseAuthButton() {
  const { user, isDemo, loginWithGoogle, logout } = useFinanceData()

  /* ── Offline / unconfigured ── */
  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Demo Offline Mode
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Add Firebase keys to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            .env.local
          </code>{" "}
          to enable cloud sync.
        </p>
      </div>
    )
  }

  /* ── Logged in ── */
  if (user) {
    return (
      <div className="rounded-xl border border-primary/20 bg-accent/60 p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 ring-offset-1 ring-offset-sidebar shrink-0">
            <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? "User"} />
            <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
              {user.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2) ?? "??"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {user.displayName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user.email}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
            className="h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>

        {/* Sync status */}
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1 text-[10px] font-medium text-primary dark:text-green-400">
          <Cloud className="h-3 w-3 animate-pulse" />
          <span>Cloud sync active</span>
        </div>
      </div>
    )
  }

  /* ── Logged out ── */
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Cloud className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cloud Sync
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Sync your data across devices in real-time.
      </p>
      <Button
        size="sm"
        onClick={loginWithGoogle}
        className="w-full h-8 gap-2 rounded-lg bg-foreground text-background text-[12px] font-semibold hover:bg-foreground/90 transition-all shadow-xs"
      >
        <LogIn className="h-3.5 w-3.5" />
        Connect Google
      </Button>
    </div>
  )
}