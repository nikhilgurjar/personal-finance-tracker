// app/dashboard/settings/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useFinanceData } from "@/hooks/use-finance-data"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Shield, User, Cloud, HelpCircle, Key, AppWindow, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buildExportCsv, downloadCsv } from "@/lib/exportData"

export default function SettingsPage() {
  const { user, isDemo, apps, addApp, providers, addProvider, goals, savings, debts, sips, income } = useFinanceData()
  const [newAppName, setNewAppName] = useState("")
  const [newProviderName, setNewProviderName] = useState("")
  const [exportStatus, setExportStatus] = useState<"idle" | "done">("idle")

  const handleExport = () => {
    const csv = buildExportCsv({ goals, savings, debts, sips, income })
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `finio_export_${date}.csv`)
    setExportStatus("done")
    setTimeout(() => setExportStatus("idle"), 3000)
  }

  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAppName.trim()) return
    await addApp(newAppName.trim())
    setNewAppName("")
    alert(`"${newAppName}" platform app registered!`)
  }

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProviderName.trim()) return
    await addProvider(newProviderName.trim())
    setNewProviderName("")
    alert(`"${newProviderName}" fund house provider registered!`)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure profile details, global apps, and server sync keys</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Navigation / Info */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                <span>Profile Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {user ? user.displayName?.substring(0, 2).toUpperCase() : "JD"}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-foreground truncate">{user ? user.displayName : "John Doe"}</p>
                  <p className="text-[10px] truncate">{user ? user.email : "demo@finio.io"}</p>
                </div>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex items-center justify-between">
                <span>Account Role:</span>
                <span className="text-foreground font-bold">Standard Owner</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Storage Sync:</span>
                <span className={`font-bold ${isDemo ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {isDemo ? "Offline Demo" : "Cloud Active"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-primary" />
                <span>Sync Diagnostics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed space-y-2 text-muted-foreground">
              <p>Finio operates an **offline-first** cached ledger database. Reads and writes are pushed client-side instantly and queued to sync to Google servers.</p>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 p-2 rounded-lg">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Client Encryption Enabled</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Manage Fields */}
        <div className="md:col-span-2 space-y-6">

          {/* Data Export */}
          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span>Export Your Data</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Download your goals, savings, debts, SIP schedule, and income as a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Goals", count: goals.length },
                    { label: "Savings", count: savings.length },
                    { label: "Debts", count: debts.length },
                    { label: "SIP Schedules", count: sips.length },
                    { label: "Income", count: income.length },
                  ].map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-background/60 border border-border/40 px-3 py-2">
                      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                      <Badge variant="secondary" className="text-[10px] font-bold">{count} records</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  The CSV file will include all sections with headers and a net-position summary for debts.
                  It opens correctly in Microsoft Excel, Google Sheets, and any text editor.
                </p>
              </div>
              <Button
                id="export-data-btn"
                onClick={handleExport}
                className="gap-2 font-semibold"
                variant={exportStatus === "done" ? "outline" : "default"}
              >
                {exportStatus === "done" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600">Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export as CSV</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          
          {/* Apps & Providers */}
          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <AppWindow className="h-5 w-5 text-primary" />
                <span>Manage Financial Assets Registry</span>
              </CardTitle>
              <CardDescription className="text-xs">Add dynamic options for investment apps and mutual fund providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* App Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brokerage/Demat Apps</h4>
                <form onSubmit={handleAddApp} className="flex gap-2">
                  <Input
                    placeholder="e.g. IndMoney, Fi Money..."
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                  <Button type="submit" size="sm" className="font-semibold text-xs h-9">
                    Add App
                  </Button>
                </form>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {apps.map(app => (
                    <Badge key={app.value} variant="outline" className="text-[10px] font-bold py-1 bg-muted/30 border-muted">
                      📱 {app.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Providers Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fund Houses & Banks</h4>
                <form onSubmit={handleAddProvider} className="flex gap-2">
                  <Input
                    placeholder="e.g. Bandhan Mutual Fund, Tata MF..."
                    value={newProviderName}
                    onChange={(e) => setNewProviderName(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                  <Button type="submit" size="sm" className="font-semibold text-xs h-9">
                    Add Provider
                  </Button>
                </form>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {providers.map(prov => (
                    <Badge key={prov.value} variant="outline" className="text-[10px] font-bold py-1 bg-muted/30 border-muted">
                      🏦 {prov.label}
                    </Badge>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Environmental Keys Guide */}
          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <span>Configure Private Cloud Keys</span>
              </CardTitle>
              <CardDescription className="text-xs">Securely link your private Firebase instance for multi-device sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-medium leading-relaxed text-muted-foreground">
              <p>To establish your private cloud database, create a file named <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">.env.local</code> in the root directory of the project, and append your Firebase Web App credentials:</p>
              
              <pre className="bg-muted p-4 rounded-xl font-mono text-[10px] text-foreground leading-normal overflow-x-auto border border-border/80">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_SHEETS_URL=https://your-sheet-endpoint.example.com`}
              </pre>

              <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-lg border border-border/50">
                <HelpCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  **How to find these?** Go to the [Firebase Console](https://console.firebase.google.com/), create a new project, register a "Web App", and copy the <code className="bg-muted text-foreground px-1 py-0.5 rounded">firebaseConfig</code> object properties.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
