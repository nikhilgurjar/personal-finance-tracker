import { NormalizedTransaction } from "./types";

interface ExistingExpense {
  id: string;
  date: string;
  amount: number;
  note: string;
  category: string;
}

const RECURRING_KEYWORDS = [
  "netflix", "spotify", "hotstar", "youtube", "prime", "apple", "google play",
  "openai", "chatgpt", "notion", "github", "sonyliv", "zee5", "subscription",
  "autopay", "standing instruction", "si-", "nach", "mandate"
];

export function findDuplicates(
  newTransactions: NormalizedTransaction[],
  existingExpenses: ExistingExpense[]
): NormalizedTransaction[] {
  // Step 1: Detect recurring subscriptions
  for (const tx of newTransactions) {
    const desc = tx.rawDescription.toLowerCase();
    const isKeywordRecurring = RECURRING_KEYWORDS.some(k => desc.includes(k));
    if (isKeywordRecurring && !tx.flags.includes("subscription")) {
      tx.flags.push("subscription");
    }
  }

  // Step 2: Pre-bucket existing expenses by amount for O(1) lookups
  const existingByAmount = new Map<number, ExistingExpense[]>();
  for (const ex of existingExpenses) {
    let list = existingByAmount.get(ex.amount);
    if (!list) {
      list = [];
      existingByAmount.set(ex.amount, list);
    }
    list.push(ex);
  }

  // Step 3: Track accepted transactions in the current run for in-batch deduplication
  const acceptedByAmountAndDay = new Map<string, NormalizedTransaction[]>();

  return newTransactions.map((newTx) => {
    // Skip if already excluded (e.g., CC bill payment, ATM withdrawal, self transfer)
    if (newTx.excluded) return newTx;

    const newTxDate = new Date(newTx.date).getTime();
    const baseDay = Math.floor(newTxDate / (1000 * 60 * 60 * 24));

    // 1. Check against EXISTING expenses in database
    const candidates = existingByAmount.get(newTx.amount) || [];
    const duplicateOfExisting = candidates.find((ex) => {
      // Must be within ±2 days (to account for posting date delay)
      const exDate = new Date(ex.date).getTime();
      const diffDays = Math.abs(newTxDate - exDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 2) return false;

      const exNote = ex.note.toLowerCase();

      // If we have UPI ref or UTR overlap -> 100% duplicate
      if (newTx.reference && exNote.includes(newTx.reference.toLowerCase())) return true;
      if (newTx.upiId && exNote.includes(newTx.upiId.toLowerCase())) return true;

      // Fuzzy merchant name match
      if (newTx.merchantName && newTx.merchantName.length > 3) {
        if (exNote.includes(newTx.merchantName.toLowerCase())) return true;
      }

      // If exact same date and amount
      if (diffDays === 0) return true;

      return false;
    });

    if (duplicateOfExisting) {
      newTx.excluded = true;
      newTx.duplicateOf = duplicateOfExisting.id;
      newTx.excludeReason = `DUPLICATE of saved expense on ${duplicateOfExisting.date}`;
      newTx.flags.push("duplicate");
      return newTx;
    }

    // 2. Check against OTHER transactions in the current batch (intra-batch deduplication)
    let duplicateInBatch: NormalizedTransaction | undefined;
    for (let dayOffset = -2; dayOffset <= 2; dayOffset++) {
      const key = `${newTx.amount}_${baseDay + dayOffset}`;
      const batchCandidates = acceptedByAmountAndDay.get(key);
      if (batchCandidates) {
        duplicateInBatch = batchCandidates.find((prevTx) => {
          if (prevTx.amount !== newTx.amount) return false;

          const prevDate = new Date(prevTx.date).getTime();
          const diffDays = Math.abs(newTxDate - prevDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 2) return false;

          // Same UPI ref or UTR
          if (newTx.reference && prevTx.reference && newTx.reference === prevTx.reference) return true;
          if (newTx.upiId && prevTx.upiId && newTx.upiId === prevTx.upiId && diffDays === 0) return true;

          // Same merchant name & exact date
          if (
            diffDays === 0 &&
            newTx.merchantName.toLowerCase() === prevTx.merchantName.toLowerCase()
          ) {
            return true;
          }

          return false;
        });
        if (duplicateInBatch) break;
      }
    }

    if (duplicateInBatch) {
      newTx.excluded = true;
      newTx.duplicateOf = duplicateInBatch.id;
      newTx.excludeReason = `DUPLICATE of another row in statement on ${duplicateInBatch.date}`;
      newTx.flags.push("duplicate");
      return newTx;
    }

    // Accepted as a valid unique transaction
    const myKey = `${newTx.amount}_${baseDay}`;
    if (!acceptedByAmountAndDay.has(myKey)) {
      acceptedByAmountAndDay.set(myKey, []);
    }
    acceptedByAmountAndDay.get(myKey)!.push(newTx);

    return newTx;
  });
}
