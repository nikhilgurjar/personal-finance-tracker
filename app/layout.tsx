import { DM_Sans, DM_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FinanceDataProvider } from "@/hooks/use-finance-data"

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
})

const dmMono = DM_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

import type { Metadata, Viewport } from "next"

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zooming on form inputs in iOS
}

export const metadata: Metadata = {
 title: "Finio — Personal Finance",
  description: "Track income, expenses, goals and investments in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true, // Enables "Add to Home Screen" standalone mode
    title: "Finance", // The name under the icon on the home screen
    statusBarStyle: "default", // Can be "default", "black", or "black-translucent"
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", dmSans.variable, dmMono.variable)}
    >
      <body>
        <ThemeProvider>
          <FinanceDataProvider>{children}</FinanceDataProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}