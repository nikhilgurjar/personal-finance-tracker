export type SourceType = "phonepe" | "gpay" | "hdfc_bank" | "hdfc_cc" | "icici_bank" | "sbi_bank" | "unknown";

export interface NormalizedTransaction {
  id: string;
  sourceFile: string;
  sourceType: SourceType;
  date: string;
  originalDate: string;
  amount: number;
  direction: "debit" | "credit";
  rawDescription: string;
  merchantName: string;
  upiId: string | null;
  reference: string | null;
  category: string | null;
  userLabel: string | null;
  userDescription: string | null;
  flags: string[];
  confidence: number;
  duplicateOf: string | null;
  excluded: boolean;
  excludeReason: string | null;
}

export interface ColumnMapping {
  date: string | null;
  amount: string | null;
  credit: string | null;
  description: string | null;
  reference: string | null;
  balance: string | null;
}

export interface ParseResult {
  fileName: string;
  sourceType: SourceType;
  rawRows: Record<string, unknown>[];
  mapping: ColumnMapping;
  headers: string[];
}
