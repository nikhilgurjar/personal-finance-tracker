// lib/ai/firestoreSlice.ts
// Fetches only the relevant data slice from Firestore based on the router result.
// In demo mode (no Firebase), it trims the already-loaded in-memory data instead.

import { collection, getDocs, query, limit as fsLimit, orderBy } from "firebase/firestore"
import { db, isConfigured } from "@/lib/firebase"
import type { RouterResult } from "./contextRouter"

// ─── Types mirrored from use-finance-data (avoid circular imports) ────────────

interface LocalDataBag {
  accounts?: any[]
  expenses?: any[]
  income?: any[]
  goals?: any[]
  savings?: any[]
  sips?: any[]
  debts?: any[]
}

interface SliceResult {
  [collection: string]: any[]
}

// ─── Firestore fetcher (cloud mode) ──────────────────────────────────────────

async function fetchFromFirestore(
  uid: string,
  collectionName: string,
  rowLimit: number
): Promise<any[]> {
  try {
    // Collections that have a date field — order by most recent
    const dateCollections = ["expenses", "income", "debts"]
    const q = dateCollections.includes(collectionName)
      ? query(
          collection(db, "users", uid, collectionName),
          orderBy("date", "desc"),
          fsLimit(rowLimit)
        )
      : query(collection(db, "users", uid, collectionName), fsLimit(rowLimit))

    const snap = await getDocs(q)
    const rows: any[] = []
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }))
    return rows
  } catch (err) {
    console.error(`[firestoreSlice] Failed to fetch ${collectionName}:`, err)
    return []
  }
}

// ─── In-memory trimmer (demo / offline mode) ─────────────────────────────────

function sliceLocalData(
  localData: LocalDataBag,
  collectionName: string,
  rowLimit: number
): any[] {
  const map: Record<string, keyof LocalDataBag> = {
    accounts: "accounts",
    expenses: "expenses",
    income:   "income",
    goals:    "goals",
    savings:  "savings",
    sips:     "sips",
    debts:    "debts",
  }
  const key = map[collectionName]
  if (!key) return []
  const arr = localData[key] ?? []

  // Sort by date descending if the field exists
  const sorted = arr
    .slice()
    .sort((a, b) => {
      const da = a.date ?? a.startDate ?? ""
      const db_ = b.date ?? b.startDate ?? ""
      return db_ > da ? 1 : -1
    })

  return sorted.slice(0, rowLimit)
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns a data slice keyed by collection name.
 *
 * - If `uid` is provided and Firebase is configured → hits Firestore
 * - Otherwise → trims `localData` (demo / offline mode)
 */
export async function fetchDataSlice(
  routerResult: RouterResult,
  options: {
    uid?: string | null
    isDemo?: boolean
    localData?: LocalDataBag
  }
): Promise<SliceResult> {
  const { uid, isDemo, localData } = options
  const useFirestore = !isDemo && !!uid && isConfigured

  const slice: SliceResult = {}

  for (const col of routerResult.collections) {
    if (useFirestore) {
      slice[col] = await fetchFromFirestore(uid!, col, routerResult.limit)
    } else {
      slice[col] = sliceLocalData(localData ?? {}, col, routerResult.limit)
    }
  }

  return slice
}
