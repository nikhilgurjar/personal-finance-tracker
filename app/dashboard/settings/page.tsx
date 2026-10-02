// app/dashboard/settings/page.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useFinanceData } from "@/hooks/use-finance-data"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Shield, User, Cloud, HelpCircle, Key, AppWindow, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buildExportCsv, downloadCsv } from "@/lib/exportData"
import { exportToExcel } from "@/lib/exportExcel"
import { backupToDrive } from "@/lib/driveClient"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AI_PROVIDERS,
  DEFAULT_AI_MODELS,
  getAISettingsStorageKeys,
  isAIProvider,
  listAvailableAIModels,
  recommendAIModel,
  type AIProvider,
  type AIModelOption,
} from "@/lib/ai/aiClient"
import {
  addSharedAIModel,
  listSharedAIModels,
  type SharedAIModel,
} from "@/lib/ai/modelRegistry"

export default function SettingsPage() {
  const { user, isDemo, apps, addApp, providers, addProvider, goals, savings, expenses, debts, sips, income } = useFinanceData()
  const [newAppName, setNewAppName] = useState("")
  const [newProviderName, setNewProviderName] = useState("")
  const [exportStatus, setExportStatus] = useState<"idle" | "done">("idle")
  const [excelExportStatus, setExcelExportStatus] = useState<"idle" | "loading" | "done">("idle")
  const [driveBackupStatus, setDriveBackupStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [driveBackupError, setDriveBackupError] = useState<string | null>(null)
  const [aiProvider, setAIProvider] = useState<AIProvider>("groq")
  const [aiApiKey, setAIApiKey] = useState("")
  const [selectedAIModel, setSelectedAIModel] = useState("")
  const [newAIModelId, setNewAIModelId] = useState("")
  const [newAIModelLabel, setNewAIModelLabel] = useState("")
  const [sharedAIModels, setSharedAIModels] = useState<SharedAIModel[]>([])
  const [discoveredAIModels, setDiscoveredAIModels] = useState<AIModelOption[]>([])
  const [aiSettingsMessage, setAISettingsMessage] = useState<string | null>(null)
  const [aiSettingsError, setAISettingsError] = useState<string | null>(null)
  const [aiModelCatalogLoading, setAIModelCatalogLoading] = useState(false)
  const [aiModelDiscoveryLoading, setAIModelDiscoveryLoading] = useState(false)
  const [aiSettingsLoadedFor, setAISettingsLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    const storageKeys = getAISettingsStorageKeys(user?.uid)
    const timer = window.setTimeout(() => {
      try {
        const savedProvider = localStorage.getItem(storageKeys.provider)?.trim().toLowerCase()
        if (savedProvider && isAIProvider(savedProvider)) setAIProvider(savedProvider)
        setAIApiKey(localStorage.getItem(storageKeys.apiKey) ?? "")
        setSelectedAIModel(localStorage.getItem(storageKeys.model) ?? "")
      } catch {
        setAISettingsError("Unable to read AI settings from this browser.")
      } finally {
        setAISettingsLoadedFor(user?.uid ?? "")
      }
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [user?.uid])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!user || isDemo) {
        setSharedAIModels([])
        setAIModelCatalogLoading(false)
        return
      }

      setAIModelCatalogLoading(true)
      setAISettingsError(null)
      listSharedAIModels()
        .then((models) => {
          if (active) setSharedAIModels(models)
        })
        .catch((error: unknown) => {
          if (active) {
            setAISettingsError(
              error instanceof Error ? error.message : "Unable to load the shared AI model catalog."
            )
          }
        })
        .finally(() => {
          if (active) setAIModelCatalogLoading(false)
        })
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [user, isDemo])

  const handleExport = () => {
    const csv = buildExportCsv({ goals, savings, expenses, debts, sips, income })
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `finio_export_${date}.csv`)
    setExportStatus("done")
    setTimeout(() => setExportStatus("idle"), 3000)
  }

  const handleExcelExport = async () => {
    try {
      setExcelExportStatus("loading")
      await exportToExcel({ goals, savings, expenses, debts, sips, income })
      setExcelExportStatus("done")
      setTimeout(() => setExcelExportStatus("idle"), 3000)
    } catch (err) {
      console.error("Excel export error:", err)
      setExcelExportStatus("idle")
    }
  }

  const handleDriveBackup = async () => {
    setDriveBackupStatus("loading")
    setDriveBackupError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("https://www.googleapis.com/auth/drive.appdata")
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const accessToken = credential?.accessToken

      if (!accessToken) {
        throw new Error("Could not retrieve Google access token for Drive backup.")
      }

      const financeData = {
        goals,
        savings,
        expenses,
        debts,
        sips,
        income,
        apps,
        providers,
        exportedAt: new Date().toISOString(),
      }

      await backupToDrive(financeData, accessToken)
      setDriveBackupStatus("done")
      setTimeout(() => setDriveBackupStatus("idle"), 3000)
    } catch (err: unknown) {
      console.error("Backup to Drive error:", err)
      setDriveBackupError(err instanceof Error ? err.message : "Failed to backup to Google Drive")
      setDriveBackupStatus("error")
    }
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

  const handleSaveAISettings = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiApiKey.trim()) {
      setAISettingsError("Enter an API key for the selected provider.")
      setAISettingsMessage(null)
      return
    }

    try {
      const storageKeys = getAISettingsStorageKeys(user?.uid)
      localStorage.setItem(storageKeys.provider, aiProvider)
      localStorage.setItem(storageKeys.apiKey, aiApiKey.trim())
      if (selectedAIModel) localStorage.setItem(storageKeys.model, selectedAIModel)
      else localStorage.removeItem(storageKeys.model)
      setAISettingsError(null)
      setAISettingsMessage("AI provider, key, and model saved in this browser.")
    } catch {
      setAISettingsError("Unable to save AI settings in this browser.")
      setAISettingsMessage(null)
    }
  }

  const handleDiscoverAIModels = async () => {
    if (!aiApiKey.trim()) {
      setAISettingsError("Enter an API key before discovering available models.")
      setAISettingsMessage(null)
      return
    }

    setAIModelDiscoveryLoading(true)
    setAISettingsError(null)
    setAISettingsMessage(null)
    try {
      const models = await listAvailableAIModels(aiProvider, aiApiKey.trim())
      setDiscoveredAIModels(models)
      const selectedIsAvailable = models.some((model) => model.modelId === selectedAIModel)
      const recommendation = selectedIsAvailable
        ? models.find((model) => model.modelId === selectedAIModel)
        : recommendAIModel(aiProvider, models)
      if (recommendation && !selectedIsAvailable) {
        setSelectedAIModel(recommendation.modelId)
      }
      setAISettingsMessage(
        recommendation
          ? `Found ${models.length} supported models. ${selectedIsAvailable ? "Your selected model is available." : `Recommended ${recommendation.label}. Save settings to use it.`}`
          : "The provider returned no models that support text generation."
      )
    } catch (error: unknown) {
      setAISettingsError(
        error instanceof Error ? error.message : "Unable to discover models for this provider."
      )
    } finally {
      setAIModelDiscoveryLoading(false)
    }
  }

  const handleAddAIModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isDemo) {
      setAISettingsError("Sign in with Firebase to add a model to the shared catalog.")
      setAISettingsMessage(null)
      return
    }

    try {
      const model = await addSharedAIModel(
        {
          provider: aiProvider,
          modelId: newAIModelId,
          label: newAIModelLabel || newAIModelId,
        }
      )
      setSharedAIModels((current) => [...current, model])
      setSelectedAIModel(model.modelId)
      setNewAIModelId("")
      setNewAIModelLabel("")
      setAISettingsError(null)
      setAISettingsMessage("Model added to the shared catalog for all users.")
    } catch (error: unknown) {
      setAISettingsError(
        error instanceof Error ? error.message : "Unable to add the model to the shared catalog."
      )
      setAISettingsMessage(null)
    }
  }

  const availableAIModels = [
    ...DEFAULT_AI_MODELS.filter((model) => model.provider === aiProvider),
    ...discoveredAIModels.filter((model) => model.provider === aiProvider),
    ...sharedAIModels.filter((model) => model.provider === aiProvider),
  ].filter(
    (model, index, models) =>
      models.findIndex((candidate) => candidate.modelId === model.modelId) === index
  )

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
                <span>Export & Backup Your Data</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Download your financial data as CSV or formatted Excel workbook, or backup to Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Goals", count: goals.length },
                    { label: "Savings", count: savings.length },
                    { label: "Expenses", count: expenses.length },
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
                  Export as raw CSV, multi-sheet Excel spreadsheet with summary metrics & formatted currency, or securely backup to your private Google Drive app folder.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
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

                <Button
                  id="export-excel-btn"
                  onClick={handleExcelExport}
                  disabled={excelExportStatus === "loading"}
                  className="gap-2 font-semibold"
                  variant={excelExportStatus === "done" ? "outline" : "secondary"}
                >
                  {excelExportStatus === "done" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600">Downloaded Excel!</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Export to Excel</span>
                    </>
                  )}
                </Button>

                <Button
                  id="drive-backup-btn"
                  onClick={handleDriveBackup}
                  disabled={driveBackupStatus === "loading"}
                  className="gap-2 font-semibold"
                  variant={driveBackupStatus === "done" ? "outline" : "outline"}
                >
                  {driveBackupStatus === "done" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600">Backed Up!</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 text-blue-500" />
                      <span>{driveBackupStatus === "loading" ? "Backing Up..." : "Backup to Google Drive"}</span>
                    </>
                  )}
                </Button>
              </div>

              {driveBackupError ? (
                <p role="alert" className="text-xs text-destructive mt-2">{driveBackupError}</p>
              ) : null}
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

          {/* AI provider and shared model catalog */}
          <Card className="border-border/70 shadow-sm bg-background/50 backdrop-blur-xs">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <span>AI Coach Provider & Models</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Your API key stays in this browser. Models you add are shared with all signed-in users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleSaveAISettings} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-medium">
                    <span>Provider</span>
                    <Select
                      value={aiProvider}
                      onValueChange={(value) => {
                        if (isAIProvider(value)) {
                          setAIProvider(value)
                          setSelectedAIModel("")
                          setDiscoveredAIModels([])
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider[0].toUpperCase() + provider.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5 text-xs font-medium">
                    <span>API key (saved only in this browser)</span>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={aiSettingsLoadedFor === (user?.uid ?? "") ? aiApiKey : ""}
                      onChange={(event) => setAIApiKey(event.target.value)}
                      placeholder="Paste your provider API key"
                      className="h-9 text-xs"
                    />
                  </label>
                </div>
                <label className="block space-y-1.5 text-xs font-medium">
                  <span>Model</span>
                  <Select
                    value={selectedAIModel || "__default"}
                    onValueChange={(value) =>
                      setSelectedAIModel(value === "__default" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Use provider default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default">Use provider default</SelectItem>
                      {availableAIModels.map((model) => (
                        <SelectItem key={model.modelId} value={model.modelId}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={aiSettingsLoadedFor !== (user?.uid ?? "")}
                  >
                    Save AI settings
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDiscoverAIModels}
                    disabled={!aiApiKey.trim() || aiModelDiscoveryLoading}
                  >
                    {aiModelDiscoveryLoading ? "Checking models…" : "Find available models"}
                  </Button>
                </div>
              </form>

              <Separator />

              <form onSubmit={handleAddAIModel} className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Add a shared model</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Add a model ID for the selected provider. It will appear in every user&apos;s model selector.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={newAIModelId}
                    onChange={(event) => setNewAIModelId(event.target.value)}
                    placeholder="Model ID (e.g. provider/model-name)"
                    className="h-9 text-xs"
                    required
                  />
                  <Input
                    value={newAIModelLabel}
                    onChange={(event) => setNewAIModelLabel(event.target.value)}
                    placeholder="Display name (optional)"
                    className="h-9 text-xs"
                  />
                </div>
                <Button type="submit" size="sm" variant="outline" disabled={!user || isDemo}>
                  Add model to shared catalog
                </Button>
                {!user || isDemo ? (
                  <p className="text-[11px] text-amber-600">
                    Sign in to Firebase to share models with other users.
                  </p>
                ) : null}
                {aiModelCatalogLoading ? (
                  <p className="text-[11px] text-muted-foreground">Loading shared models…</p>
                ) : null}
              </form>

              {aiSettingsError ? (
                <p role="alert" className="text-xs text-destructive">{aiSettingsError}</p>
              ) : null}
              {aiSettingsMessage ? (
                <p role="status" className="text-xs text-emerald-600">{aiSettingsMessage}</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                {sharedAIModels.length} shared custom {sharedAIModels.length === 1 ? "model" : "models"} available.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Metadata-only LangSmith traces are enabled when <code>LANGSMITH_API_KEY</code> is configured on the server. Prompts and answers are never sent to LangSmith.
              </p>
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
