// lib/ai/firestoreSlice.ts
// Fetches only the relevant data slice from Firestore based on the router result.
// v2: time-range filtering, per-collection error isolation, demo-mode date sorting.

import { adminDb, admin } from "@/lib/firebaseAdmin"
import type { RouterResult, TimeFilter } from "./contextRouter"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalDataBag {
  accounts?: any[]
  expenses?: any[]
  income?: any[]
  goals?: any[]
  savings?: any[]
  sips?: any[]
  debts?: any[]
}

export interface SliceResult {
  [collection: string]: any[]
}

// Collections that carry a sortable "date" field
const DATE_COLLECTIONS = ["expenses", "income", "debts"]

// ─── Firestore fetcher (cloud mode) ──────────────────────────────────────────

async function fetchFromFirestore(
  uid: string,
  collectionName: string,
  rowLimit: number,
  timeFilter?: TimeFilter
): Promise<any[]> {
  try {
    if (!adminDb) {
      throw new Error("Firebase Admin DB is not initialized.")
    }

    let queryRef: any = adminDb
      .collection("users")
      .doc(uid)
      .collection(collectionName)

    if (DATE_COLLECTIONS.includes(collectionName) && timeFilter) {
      queryRef = queryRef
        .where("date", ">=", admin.firestore.Timestamp.fromDate(timeFilter.start))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(timeFilter.end))
        .orderBy("date", "desc")
    } else if (DATE_COLLECTIONS.includes(collectionName)) {
      queryRef = queryRef.orderBy("date", "desc")
    }

    queryRef = queryRef.limit(rowLimit)

    const snap = await queryRef.get()

    const rows: any[] = []
    snap.forEach((d: any) => rows.push({ id: d.id, ...d.data() }))
    return rows
  } catch (err) {
    console.error(`[firestoreSlice] Failed to fetch "${collectionName}":`, err)
    return [] // Isolate: one failing collection should not crash the whole request
  }
}

// ─── In-memory trimmer (demo / offline mode) ─────────────────────────────────

const COLLECTION_KEY_MAP: Record<string, keyof LocalDataBag> = {
  accounts: "accounts",
  expenses: "expenses",
  income:   "income",
  goals:    "goals",
  savings:  "savings",
  sips:     "sips",
  debts:    "debts",
}

// Helper to convert Firebase Admin timestamp or client representation to ms
function toDateValue(item: any): number {
  const raw = item?.date ?? item?.startDate ?? item?.createdAt ?? ""
  if (!raw) return 0
  // Handle Firestore Timestamps (Admin or Client), ISO strings, or plain date strings
  if (typeof raw === "object" && "seconds" in raw) return raw.seconds * 1000
  if (typeof raw === "object" && typeof raw.toDate === "function") return raw.toDate().getTime()
  return new Date(raw).getTime() || 0
}

function sliceLocalData(
  localData: LocalDataBag,
  collectionName: string,
  rowLimit: number,
  timeFilter?: TimeFilter
): any[] {
  const key = COLLECTION_KEY_MAP[collectionName]
  if (!key) return []

  let arr = (localData[key] ?? []).slice()

  // Sort by date descending for date-bearing collections
  if (DATE_COLLECTIONS.includes(collectionName)) {
    arr.sort((a, b) => toDateValue(b) - toDateValue(a))
  }

  // Apply time filter if provided
  if (timeFilter && DATE_COLLECTIONS.includes(collectionName)) {
    const startMs = timeFilter.start.getTime()
    const endMs   = timeFilter.end.getTime()
    arr = arr.filter((item) => {
      const ms = toDateValue(item)
      return ms >= startMs && ms <= endMs
    })
  }

  return arr.slice(0, rowLimit)
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns a data slice keyed by collection name.
 *
 * - uid + Firebase Admin configured → hits Firestore with optional time-range filter via Admin SDK
 * - Otherwise → trims `localData` in-memory (demo / offline mode)
 *
 * Each collection is fetched independently; a failure in one does not
 * prevent the others from returning data.
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
  const useFirestore = !isDemo && !!uid && !!adminDb

  const slice: SliceResult = {}

  // Fetch all collections concurrently for lower latency
  await Promise.all(
    routerResult.collections.map(async (col) => {
      if (useFirestore) {
        slice[col] = await fetchFromFirestore(
          uid!,
          col,
          routerResult.limit,
          routerResult.timeFilter
        )
      } else {
        slice[col] = sliceLocalData(
          localData ?? {},
          col,
          routerResult.limit,
          routerResult.timeFilter
        )
      }
    })
  )

  return slice
}