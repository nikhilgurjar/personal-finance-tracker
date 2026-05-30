import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank, LucideIcon, BarChart3
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  BarChart3,
}

interface StatCardProps {
  title: string
  value: string
  change: string
  up: boolean
  icon: string
}

export function StatCard({ title, value, change, up, icon }: StatCardProps) {
  const Icon = ICON_MAP[icon] ?? Wallet

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Badge
          variant={up ? "default" : "destructive"}
          className="mt-1 text-xs"
        >
          {change} this month
        </Badge>
      </CardContent>
    </Card>
  )
}