"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { ParseResult, NormalizedTransaction } from "@/lib/statement/types";
import { parseFile } from "@/lib/statement/parser";
import { normalizeRows } from "@/lib/statement/normalizer";
import { fetchUserMerchantMemory, MerchantMemoryDoc, generateMerchantKey, saveMerchantMemories } from "@/lib/statement/merchant-memory";
import { enrichTransactions } from "@/lib/statement/categorizer";
import { flagNonExpenses } from "@/lib/statement/non-expense-filter";
import { findDuplicates } from "@/lib/statement/deduplicator";
import { EXPENSE_CATEGORIES } from "@/constants/finance";
import { useFinanceData } from "@/hooks/use-finance-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function StatementImportWizard() {
  const { accounts, expenses, addExpense } = useFinanceData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [memoryMap, setMemoryMap] = useState<Record<string, MerchantMemoryDoc>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Load merchant memory when dialog opens
  useEffect(() => {
    if (open) {
      fetchUserMerchantMemory().then(setMemoryMap).catch(e => {
        console.error("Failed to load merchant memory:", e);
      });
    }
  }, [open]);

  // Compute effective account ID (selected or first account as default)
  const effectiveAccountId = selectedAccountId || (accounts.length > 0 ? accounts[0].id : "");

  const processFile = async (file: File, pass?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await parseFile(file, pass);
      setParseResult(result);
      setStep(2);
      setNeedsPassword(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ENCRYPTED") {
        setNeedsPassword(true);
        setError("This file is password protected. Please enter the password.");
      } else {
        setError(msg || "Failed to parse file");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCurrentFile(file);
    processFile(file);
  };

  const handlePasswordSubmit = () => {
    if (currentFile && password) {
      processFile(currentFile, password);
    }
  };

  const handleApproveMapping = () => {
    if (!parseResult) return;
    setLoading(true);
    
    // Parse and normalize
    const normalized = normalizeRows(
      parseResult.rawRows,
      parseResult.mapping,
      parseResult.fileName,
      parseResult.sourceType
    );
    
    // Phase B: Smart Enrich
    const enriched = enrichTransactions(normalized, memoryMap);
    setTransactions(enriched);
    
    setLoading(false);
    setStep(3); // Move to Enrich step
  };

  const updateTransaction = (id: string, updates: Partial<NormalizedTransaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const applyToAllSameMerchant = (rawDescription: string, category: string, cleanName?: string | null) => {
    setTransactions(prev => prev.map(t => {
      if (t.rawDescription === rawDescription) {
        return {
          ...t,
          category,
          userLabel: cleanName || t.userLabel,
          confidence: 1.0,
        };
      }
      return t;
    }));
  };

  const handleFinishEnrichment = async () => {
    setLoading(true);
    try {
      // 1. Save Merchant Memory
      const newMemories: MerchantMemoryDoc[] = [];
      const now = new Date().toISOString();

      transactions.forEach(t => {
        if (!t.category || !t.userLabel || t.excluded) return;
        
        const key = generateMerchantKey(t.rawDescription);
        const existing = memoryMap[key];
        
        const upiIds = new Set(existing?.upiIds || []);
        if (t.upiId) upiIds.add(t.upiId);

        const nameVariants = new Set(existing?.nameVariants || []);
        nameVariants.add(t.rawDescription);

        newMemories.push({
          key,
          displayName: t.userLabel,
          category: t.category,
          lastDescription: t.userDescription || "",
          upiIds: Array.from(upiIds),
          nameVariants: Array.from(nameVariants),
          frequency: (existing?.frequency || 0) + 1,
          lastSeen: now,
        });
      });

      const uniqueMemoriesMap = new Map<string, MerchantMemoryDoc>();
      newMemories.forEach(m => uniqueMemoriesMap.set(m.key, m));
      
      await saveMerchantMemories(Array.from(uniqueMemoriesMap.values()));
      
      // 2. Phase C: Deduplication & Non-Expense Filter
      let processed = flagNonExpenses(transactions, accounts);
      processed = findDuplicates(processed, expenses);
      
      setTransactions(processed);
      setStep(4); // Move to Dedup step
    } catch (err: unknown) {
      setError("Failed to save merchant memory: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const toAdd = transactions.filter(t => !t.excluded);
      for (const t of toAdd) {
        await addExpense({
          date: t.date,
          amount: t.amount,
          category: t.category || "other",
          account: effectiveAccountId,
          note: `${t.userLabel || t.merchantName} - ${t.userDescription || ""}`.trim(),
        });
      }
      setStep(6);
    } catch (err: unknown) {
      setError("Failed to import expenses: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep(1);
      setParseResult(null);
      setTransactions([]);
      setError(null);
      setNeedsPassword(false);
      setPassword("");
      setCurrentFile(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="font-semibold gap-1.5 shadow-sm">
          <FileUp className="h-4 w-4" />
          <span>Import Statement</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-5xl backdrop-blur-lg bg-background/95 border-border/80">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Import Statement — Step 1 of 5: Upload"}
            {step === 2 && "Import Statement — Step 2 of 5: Verify Columns"}
            {step === 3 && "Import Statement — Step 3 of 5: Enrich & Categorize"}
            {step === 4 && "Import Statement — Step 4 of 5: Review Duplicates"}
            {step === 5 && "Import Statement — Step 5 of 5: Final Confirm"}
            {step === 6 && "Import Statement — Complete!"}
          </DialogTitle>
        </DialogHeader>

        {/* Step progress */}
        {step < 6 && (
          <div className="flex items-center gap-1 px-1 pt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s < step ? "bg-primary" : s === step ? "bg-primary/60" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        <div className="py-2 min-h-[400px]">
          {error && (
            <div className="p-3 mb-4 text-sm bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center space-y-4 h-64 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5 mt-4">
              {!needsPassword ? (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload Bank or UPI Statement</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx files</p>
                  </div>
                  <Button asChild variant="secondary" size="sm" disabled={loading}>
                    <label className="cursor-pointer">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Browse File
                      <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </label>
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-3 w-full max-w-sm px-4">
                  <p className="text-sm font-medium">Enter Document Password</p>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Usually your DOB or PAN"
                  />
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="w-full" onClick={() => setNeedsPassword(false)}>Cancel</Button>
                    <Button className="w-full" onClick={handlePasswordSubmit} disabled={loading || !password}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Unlock"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Verify Mapping */}
          {step === 2 && parseResult && (
            <div className="space-y-4 mt-2">
              <div className="bg-primary/10 text-primary p-3 rounded-lg text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Auto-detected {parseResult.rawRows.length} rows as <strong>{parseResult.sourceType}</strong> format.
              </div>
              
              <h3 className="font-semibold text-sm">Column Mapping Preview</h3>
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/20 p-4 rounded-xl border border-border/50">
                <div><strong>Date:</strong> {parseResult.mapping.date || <span className="text-destructive">Missing</span>}</div>
                <div><strong>Amount:</strong> {parseResult.mapping.amount || <span className="text-destructive">Missing</span>}</div>
                <div><strong>Description:</strong> {parseResult.mapping.description || <span className="text-destructive">Missing</span>}</div>
                <div><strong>Reference:</strong> {parseResult.mapping.reference || "None"}</div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleApproveMapping} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Looks Good, Continue"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Smart Enrich */}
          {step === 3 && transactions.length > 0 && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-semibold text-base">Enrich & Categorize</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {transactions.filter(t => t.confidence >= 0.9).length} auto-categorized from memory. Review and fill in missing details.
                  </p>
                </div>
              </div>
              
              <div className="flex-1 max-h-[400px] overflow-y-auto rounded-xl border shadow-sm text-sm bg-background">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase">Date</th>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase">Raw Merchant</th>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase text-right w-24">Amount</th>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase w-48">Category</th>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase w-48">Clean Name</th>
                      <th className="p-3 font-semibold text-xs text-muted-foreground uppercase">Notes / What it was</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map(t => {
                      if (t.excluded) return null; // Skip excluded for now (like credits)
                      
                      return (
                        <tr key={t.id} className={t.confidence < 0.5 ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-muted/30"}>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{t.date}</td>
                          <td className="p-3 text-xs font-medium truncate max-w-[150px]" title={t.rawDescription}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{t.rawDescription}</span>
                              {t.flags.includes("subscription") && (
                                <span className="inline-flex items-center rounded-sm bg-purple-500/10 px-1 py-0.2 text-[9px] font-semibold text-purple-600 dark:text-purple-400">
                                  🔁 Sub
                                </span>
                              )}
                              {t.confidence >= 0.9 && (
                                <span className="inline-flex items-center rounded-sm bg-emerald-500/10 px-1 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  🧠 Memory
                                </span>
                              )}
                            </div>
                            {t.upiId && <span className="block text-[10px] text-muted-foreground font-normal">{t.upiId}</span>}
                          </td>
                          <td className="p-3 text-right text-rose-500 font-bold whitespace-nowrap">₹{t.amount.toLocaleString()}</td>
                          
                          {/* Category Select */}
                          <td className="p-2">
                            <div className="space-y-1">
                              <Select 
                                value={t.category || "unknown"} 
                                onValueChange={(val) => updateTransaction(t.id, { category: val, confidence: 1.0 })}
                              >
                                <SelectTrigger className={`h-8 text-xs ${!t.category ? "border-amber-500/50" : ""}`}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[250px]">
                                  <SelectItem value="unknown" disabled>❓ Select...</SelectItem>
                                  {EXPENSE_CATEGORIES.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {t.category && transactions.filter(other => !other.excluded && other.rawDescription === t.rawDescription).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => applyToAllSameMerchant(t.rawDescription, t.category!, t.userLabel)}
                                  className="text-[10px] text-primary hover:underline font-medium block"
                                >
                                  Apply to all ({transactions.filter(other => !other.excluded && other.rawDescription === t.rawDescription).length})
                                </button>
                              )}
                            </div>
                          </td>
                          
                          {/* Clean Name Input */}
                          <td className="p-2">
                            <Input 
                              value={t.userLabel || ""} 
                              onChange={(e) => updateTransaction(t.id, { userLabel: e.target.value })}
                              className="h-8 text-xs font-medium"
                              placeholder="e.g. Swiggy"
                            />
                          </td>
                          
                          {/* Description/Notes Input */}
                          <td className="p-2">
                            <Input 
                              value={t.userDescription || ""} 
                              onChange={(e) => updateTransaction(t.id, { userDescription: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="e.g. Lunch with team"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="text-xs text-muted-foreground">
                  Your choices will be remembered for future imports! 🧠
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleFinishEnrichment} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Memory & Continue"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Dedup & Non-Expense Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Review: Duplicates & Non-Expenses</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We auto-excluded the items below. Toggle any row to include it if the detection was wrong.
                </p>
              </div>

              {/* Excluded items */}
              {transactions.filter(t => t.excluded).length > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                  <div className="px-4 py-2 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    🚫 Auto-excluded ({transactions.filter(t => t.excluded).length})
                  </div>
                  <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
                    {transactions.filter(t => t.excluded).map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{t.rawDescription}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.date} · ₹{t.amount.toLocaleString()} · <span className="text-amber-600 dark:text-amber-400">{t.excludeReason}</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-7 text-xs"
                          onClick={() => updateTransaction(t.id, { excluded: false, excludeReason: null })}
                        >
                          Include
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 border rounded-xl text-center">
                  ✅ No duplicates or non-expenses detected
                </div>
              )}

              {/* Will-be-imported summary */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ✅ {transactions.filter(t => !t.excluded).length} transactions will be imported
                  · ₹{transactions.filter(t => !t.excluded).reduce((s, t) => s + t.amount, 0).toLocaleString()} total
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={() => setStep(5)}>
                  Looks Good, Final Review →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Final Confirm */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Final Confirm & Import</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose which account to associate these expenses with, then confirm.
                </p>
              </div>

              {/* Account selector */}
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
                <span className="text-sm font-medium whitespace-nowrap">Charge to Account:</span>
                <Select value={effectiveAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-9 text-sm max-w-xs">
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>🏦 {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Final preview table */}
              <div className="max-h-[300px] overflow-y-auto rounded-xl border shadow-sm text-sm bg-background">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Notes</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.filter(t => !t.excluded).map(t => (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="p-3 text-xs text-muted-foreground">{t.date}</td>
                        <td className="p-3 text-xs font-medium">{t.userLabel || t.merchantName}</td>
                        <td className="p-3 text-xs text-muted-foreground">{t.category || "other"}</td>
                        <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">{t.userDescription || "—"}</td>
                        <td className="p-3 text-right text-rose-500 font-bold text-xs">₹{t.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={loading || !effectiveAccountId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                    : `✅ Import ${transactions.filter(t => !t.excluded).length} Expenses`
                  }
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Success */}
          {step === 6 && (
            <div className="flex flex-col items-center justify-center space-y-4 py-10">
              <div className="h-16 w-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold">Import Complete!</h2>
              <div className="text-center space-y-1 text-sm text-muted-foreground max-w-md">
                <p>✅ <strong>{transactions.filter(t => !t.excluded).length}</strong> expenses imported</p>
                <p>🚫 <strong>{transactions.filter(t => t.excluded).length}</strong> duplicates/non-expenses skipped</p>
                <p>🧠 Merchant memory updated for future imports</p>
              </div>
              <Button onClick={handleClose} className="mt-4">Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
