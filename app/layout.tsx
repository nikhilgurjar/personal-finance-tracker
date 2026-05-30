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

export const metadata = {
  title: "Finio — Personal Finance",
  description: "Track income, expenses, goals and investments in one place.",
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