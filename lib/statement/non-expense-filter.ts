import { NormalizedTransaction } from "./types";

export interface AccountInfo {
  id: string;
  name: string;
  last4: string;
}

const NON_EXPENSE_PATTERNS = {
  cc_bill_payment: [
    /credit\s*card\s*(bill|payment)/i,
    /cc\s*(bill|payment)/i,
    /hdfc\s*cc/i, /icici\s*cc/i, /sbi\s*cc/i, /axis\s*cc/i,
    /visa\s*(bill|payment)/i,
    /mastercard\s*(bill|payment)/i,
  ],
  atm_withdrawal: [
    /atm\s*(wdl|withdrawal|cash)/i,
    /cash\s*withdrawal/i,
    /nfs\s*atm/i,
  ],
  wallet_topup: [
    /wallet\s*(load|topup|top-up|add)/i,
    /phonepe\s*wallet/i,
    /paytm\s*wallet/i,
    /amazon\s*pay\s*balance/i,
  ],
  refund: [
    /refund/i, /reversal/i, /cashback/i,
    /credit\s*adj/i, /dispute\s*credit/i,
  ],
  salary: [
    /salary/i, /stipend/i, /payroll/i,
    /neft.*(?:pvt|ltd|llp|inc|corp)/i,
  ],
  self_transfer: [
    /self\s*transfer/i, /own\s*account/i,
    /a\/c\s*transfer/i,
  ],
};

export function flagNonExpenses(
  transactions: NormalizedTransaction[],
  userAccounts: AccountInfo[]
): NormalizedTransaction[] {
  return transactions.map(t => {
    // If it's already excluded (e.g. credit), keep it excluded
    if (t.excluded) return t;

    const desc = t.rawDescription.toLowerCase();

    // 1. Check strict regex patterns
    for (const [flag, patterns] of Object.entries(NON_EXPENSE_PATTERNS)) {
      if (patterns.some(p => p.test(desc))) {
        t.excluded = true;
        t.excludeReason = flag.replace(/_/g, " ").toUpperCase();
        t.flags.push(flag);
        return t;
      }
    }

    // 2. Check for self-transfers using user's known accounts
    for (const acc of userAccounts) {
      if (!acc.last4 || acc.last4.length < 4) continue;
      // If description contains the last 4 digits of another account, it's a self-transfer
      if (desc.includes(acc.last4) || desc.includes(acc.name.toLowerCase())) {
        t.excluded = true;
        t.excludeReason = `SELF TRANSFER (${acc.name})`;
        t.flags.push("self_transfer");
        return t;
      }
    }

    return t;
  });
}
