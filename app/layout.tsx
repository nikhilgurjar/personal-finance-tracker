import { Inter, Source_Serif_4, IBM_Plex_Mono, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FinanceDataProvider } from "@/hooks/use-finance-data";

const jetbrainsMonoJetbrainsMono = JetBrains_Mono({subsets:['latin','latin-ext','cyrillic','cyrillic-ext','greek','vietnamese'],weight:['100','200','300','400','500','600','700','800'],variable:'--font-jetbrains-mono'});

const interInter = Inter({subsets:['latin','latin-ext','cyrillic','cyrillic-ext','greek','greek-ext','vietnamese'],weight:['100','200','300','400','500','600','700','800','900'],variable:'--font-inter'});

const sourceSerif4SourceSerif4 = Source_Serif_4({subsets:['latin','latin-ext','cyrillic','cyrillic-ext','greek','vietnamese'],weight:['200','300','400','500','600','700','800','900'],variable:'--font-source-serif-4'});

const iBMPlexMono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'], weight: ['100', '200', '300', '400', '500', '600', '700'], variable: '--font-ibm-plex-mono' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", iBMPlexMono.variable, interInter.variable, sourceSerif4SourceSerif4.variable, jetbrainsMonoJetbrainsMono.variable)}
    >
      <body>
        <ThemeProvider>
          <FinanceDataProvider>
            {children}
          </FinanceDataProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
