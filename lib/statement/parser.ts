import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ColumnMapping, ParseResult, SourceType } from "./types";

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  date: [/date/i, /txn.*date/i, /transaction.*date/i, /posting.*date/i, /value.*date/i],
  amount: [/amount/i, /debit/i, /withdrawal/i, /txn.*amount/i],
  credit: [/credit/i, /deposit/i],
  description: [/narration/i, /description/i, /particulars/i, /details/i, /remarks/i, /merchant/i],
  reference: [/ref.*no/i, /utr/i, /reference/i, /txn.*id/i, /rrn/i],
  balance: [/balance/i, /closing.*balance/i],
};

function detectSourceType(headers: string[]): SourceType {
  const headerString = headers.join(" ").toLowerCase();
  if (headerString.includes("phonepe")) return "phonepe";
  if (headerString.includes("utr") && headerString.includes("narration")) return "hdfc_bank";
  return "unknown";
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    amount: null,
    credit: null,
    description: null,
    reference: null,
    balance: null
  };

  const used = new Set<string>();

  for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const header of headers) {
      if (used.has(header)) continue;
      if (patterns.some(p => p.test(header))) {
        mapping[key as keyof ColumnMapping] = header;
        used.add(header);
        break;
      }
    }
  }

  return mapping;
}

export async function parseFile(file: File, password?: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<Record<string, string>>) => {
          if (!results.meta.fields) {
            return reject(new Error("No headers found in CSV"));
          }
          const headers = results.meta.fields;
          const mapping = autoMapColumns(headers);
          resolve({
            fileName: file.name,
            sourceType: detectSourceType(headers),
            rawRows: results.data,
            mapping,
            headers
          });
        },
        error: (error: Error) => {
          reject(error);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            password: password
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
          
          if (json.length === 0) throw new Error("Empty spreadsheet");
          
          const headers = Object.keys(json[0]);
          const mapping = autoMapColumns(headers);
          
          resolve({
            fileName: file.name,
            sourceType: detectSourceType(headers),
            rawRows: json,
            mapping,
            headers
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("Password")) {
            reject(new Error("ENCRYPTED"));
          } else {
            reject(err);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
}
