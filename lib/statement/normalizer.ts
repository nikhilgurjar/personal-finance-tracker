import { NormalizedTransaction } from "./types";

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

export function cleanAmount(raw: string | number): number {
  if (!raw) return 0;
  if (typeof raw === "number") return Math.abs(raw);
  const cleaned = raw.toString().replace(/[^\d.-]/g, "");
  return Math.abs(parseFloat(cleaned)) || 0;
}

export function detectDirection(
  amountStr: string | number,
  creditStr?: string | number,
): "debit" | "credit" {
  if (creditStr && cleanAmount(creditStr) > 0) return "credit";

  const str = String(amountStr).toUpperCase();
  if (str.includes("CR")) return "credit";
  if (str.includes("DR")) return "debit";

  if (typeof amountStr === "number" && amountStr < 0) return "debit";
  if (typeof amountStr === "string" && amountStr.trim().startsWith("-")) return "debit";

  return "debit";
}

export function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

    const parts = raw.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (year > 2000 && year < 2100 && day <= 31 && month <= 11) {
        const d2 = new Date(year, month, day);
        if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
      }
    }
  } catch {
    // fall through to default
  }

  return new Date().toISOString().split("T")[0];
}

export function extractUpiId(desc: string): string | null {
  const match = desc.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/);
  return match ? match[0] : null;
}

export function extractReference(desc: string): string | null {
  const utrMatch = desc.match(/\b\d{12}\b/);
  if (utrMatch) return utrMatch[0];
  return null;
}

import { ColumnMapping, SourceType } from "./types";

export function normalizeRows(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
  fileName: string,
  sourceType: SourceType
): NormalizedTransaction[] {
  return rawRows.map(row => {
    const rawDate = mapping.date ? String(row[mapping.date] ?? "") : "";
    const rawAmount = mapping.amount ? row[mapping.amount] : 0;
    const rawCredit = mapping.credit ? row[mapping.credit] : undefined;
    const rawDesc = mapping.description ? row[mapping.description] : "";

    const rawRefFallback = mapping.reference ? row[mapping.reference] : "";

    const amount = cleanAmount(rawCredit && cleanAmount(String(rawCredit)) > 0 ? String(rawCredit) : String(rawAmount ?? 0));
    const direction = detectDirection(String(rawAmount ?? ""), rawCredit !== undefined ? String(rawCredit) : undefined);
    const date = parseDate(rawDate);
    const desc = String(rawDesc ?? "").trim();

    const upiId = extractUpiId(desc);
    const reference = String(rawRefFallback ?? extractReference(desc) ?? "").trim() || null;

    return {
      id: generateId(),
      sourceFile: fileName,
      sourceType,
      date,
      originalDate: rawDate,
      amount,
      direction,
      rawDescription: desc,
      merchantName: desc.substring(0, 50),
      upiId,
      reference,
      category: null,
      userLabel: null,
      userDescription: null,
      flags: [],
      confidence: 0,
      duplicateOf: null,
      excluded: direction === "credit",
      excludeReason: direction === "credit" ? "Credit transaction" : null
    };
  }).filter(t => t.amount > 0);
}
