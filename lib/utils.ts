import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeNumber(value?: number | null): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  return 0
}

export function formatCurrency(value?: number | null, locale = "en-IN") {
  return safeNumber(value).toLocaleString(locale)
}
