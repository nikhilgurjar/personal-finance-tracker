import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, LucideIcon } from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  BarChart3,
}

const COLOR_MAP: Record<
  string,
  { stripe: string; icon: string; badge: string; badgeText: string }
> = {
  green: {
    stripe: "bg-primary",
    icon: "bg-accent text-primary",
    badge: "bg-primary/10 text-primary",
    badgeText: "text-primary",
  },
  teal: {
    stripe: "bg-secondary",
    icon: "bg-secondary/10 text-secondary",
    badge: "bg-secondary/10 text-secondary",
    badgeText: "text-secondary",
  },
  red: {
    stripe: "bg-destructive",
    icon: "bg-destructive/10 text-destructive",
    badge: "bg-destructive/10 text-destructive",
    badgeText: "text-destructive",
  },
  amber: {
    stripe: "bg-amber-500",
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
}

interface StatCardProps {
  title: string
  value: string
  change: string
  up: boolean
  icon: string
  /** Optional color key: "green" | "teal" | "red" | "amber" (defaults to "green") */
  color?: string
}

export function StatCard({
  title,
  value,
  change,
  up,
  icon,
  color = "green",
}: StatCardProps) {
  const Icon = ICON_MAP[icon] ?? Wallet
  const ChangeIcon = up ? TrendingUp : TrendingDown
  const colors = COLOR_MAP[color] ?? COLOR_MAP.green

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      {/* Accent stripe */}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] rounded-t-xl",
          colors.stripe
        )}
      />

      {/* Icon + title */}
      <div className="flex items-start justify-between pt-1">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
            colors.icon
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {title}
        </span>
      </div>

      {/* Value */}
      <div className="font-mono text-[22px] font-semibold tracking-tight text-foreground leading-none">
        {value}
      </div>

      {/* Change badge */}
      <div
        className={cn(
          "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
          up
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "bg-destructive/10 text-destructive dark:bg-destructive/20"
        )}
      >
        <ChangeIcon className="h-3 w-3 shrink-0" />
        <span>{change} this month</span>
      </div>
    </div>
  )
}