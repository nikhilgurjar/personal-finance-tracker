import { Timestamp } from 'firebase/firestore';

// ─── Account Types ─────────────────────────────────────────────────────────────

export type AccountType = 'income' | 'expense' | 'savings';

export type ExpenseSubtype =
  | 'credit_card'
  | 'debit_card'
  | 'loan'
  | 'mortgage'
  | 'utility'
  | 'insurance'
  | 'tax'
  | 'subscription'
  | 'category';

export type SavingsSubtype =
  | 'stock'
  | 'equity_mf'
  | 'etf'
  | 'debt_mf'
  | 'fd'
  | 'commodity'
  | 'wallet'
  | 'bank'
  | 'savings_account'
  | 'checking_account';

export type IncomeSubtype =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'investment'
  | 'rental'
  | 'other';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'savings'
  | 'salary'
  | 'loan_repayment';

export type ExpenseNature = 'fixed' | 'dynamic';

export type LoanType = 'lent' | 'borrowed' | 'payable';

export type SavingsInstrumentType =
  | 'savings_account'
  | 'fd'
  | 'rd'
  | 'stock'
  | 'equity_mf'
  | 'debt_mf'
  | 'etf'
  | 'commodity'
  | 'ppf'
  | 'nps'
  | 'other'
  | 'epf'
  | 'bond'
  | 'mf';

// ─── Core Entities ─────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  type: AccountType;
  subtype?: SavingsSubtype | ExpenseSubtype | IncomeSubtype;
  name: string;
  institution?: string;
  currency: string; // "INR"
  currentBalance?: number;
  creditLimit?: number; // for credit cards
  interestRate?: number; // for loans, credit cards, and savings accounts
  dueDate?: number; // for credit cards and loans
  minimumPayment?: number; // for credit cards and loans
  billingCycleDay?: number; // for credit cards and subscriptions
  createdAt: number;
  metadata?: {
    [key: string]: any;
  };
}

export interface SourceBreakdown {
  sourceAccountId: string;
  amount: number;
  referenceTxId?: string;
}

export interface SalaryComponents {
  // Earnings
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  lta: number;
  bonus: number;
  // Deductions
  employeePf: number;
  professionalTax: number;
  tdsOnSalary: number;
  esic?: number;
  // Employer
  employerPf: number;
  employerEsic?: number;
  // Summary
  grossSalary?: number;
  netTakeHome?: number;
  salaryMonth: string; // YYYY-MM
}

export interface Transaction {
  id: string;
  date: number; // epoch ms
  amount: number;
  currency: string;
  fromAccountId?: string;
  toAccountId: string;
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  type: TransactionType;
  category?: string;
  tags?: string[];
  note?: string;
  scheduleId?: string;
  sourceBreakdown?: SourceBreakdown[];
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
  status?: 'pending' | 'cleared' | 'failed';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'neft' | 'imps' | 'rtgs' | 'cheque' | string;
  fee?: number;
  exchangeRate?: number;
  reconciled?: boolean;
  reconciledAt?: number;
  // Expense-specific
  expenseNature?: ExpenseNature;
  // Income-specific
  sourceType?: string; // salary | freelance | from_person | business | rental | investment | other
  sourceName?: string; // employer name or person name
  // Loan repayment-specific
  loanId?: string;
  // India-specific transaction fields
  fiscalYear?: string;
  upiRefId?: string;
  tdsDeducted?: number;
  taxSection?: '80C' | '80D' | '80G' | '24B' | 'HRA' | string;
  isTaxDeductible?: boolean;
  gstAmount?: number;
  vendorGstin?: string;
  // Salary components
  salaryComponents?: SalaryComponents;
  // Instrument link
  instrumentId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: number;
  priority?: number;
  allocations: Array<{
    accountId?: string;
    instrumentId?: string;
    amount: number;
  }>;
  createdAt: number;
}

// ─── People ──────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  createdAt: number;
  userId: string;
}

// ─── Loan Types ────────────────────────────────────────────────────────────────

export interface Loan {
  id: string;
  loanType: LoanType; // lent = you gave to someone, borrowed = someone gave you, payable = you owe someone
  personName: string; // fallback or denormalized name
  personId?: string; // reference to a Person entity
  principalAmount: number;
  outstandingAmount: number; // reduces with each repayment
  currency: string;
  startDate: number; // epoch ms
  dueDate?: number; // epoch ms
  interestRate?: number; // annual %
  note?: string;
  status: 'active' | 'settled' | 'written_off';
  fromAccountId?: string; // account the money came from (for lent/payable)
  toAccountId?: string; // account money went into (for borrowed)
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  currency: string;
  date: number; // epoch ms
  note?: string;
  accountId: string; // which account was used for repayment
  transactionId?: string; // linked transaction in main transaction list
  createdAt: number;
  createdBy: string;
}

// ─── Savings Instrument Types ──────────────────────────────────────────────────

export type InstrumentClass = 'fixed_return' | 'market_linked' | 'govt_scheme';

export interface FixedReturnDetails {
  interestRate?: number;
  maturityDate?: number;
  maturityAmount?: number;
  payoutFrequency?: 'cumulative' | 'monthly' | 'quarterly' | string;
  accountNumber?: string;
  tdsApplicable?: boolean;
}

export interface MarketLinkedDetails {
  isin?: string;
  folioNumber?: string;
  dematAccountNo?: string;
  units?: number;
  avgCostBasis?: number;
  currentNAV?: number;
  navUpdatedAt?: number;
  npsAccountType?: 'tier1' | 'tier2' | string;
  lockInUntil?: number;
}

export interface InstrumentDetails extends FixedReturnDetails, MarketLinkedDetails {}

export interface SavingsInstrumentEvent {
  id: string;
  type: 'opened' | 'deposit' | 'withdrawal' | 'interest_credit' | 'closed' | 'broken' | 'sip' | 'nav_update' | 'interest';
  date: number; // epoch ms
  amount?: number;
  note?: string;
  linkedTransactionId?: string;
  linkedExpenseId?: string; // if withdrawn for a specific expense
  reason?: string; // for closing/breaking
  newInstrumentId?: string; // if money was moved to another instrument
  units?: number;
  navAtPurchase?: number;
  transactionId?: string;
  financialYear?: string;
  tdsDeducted?: number;
}

export interface SavingsInstrument {
  id: string;
  name: string; // e.g. "HDFC Savings A/C", "Suryoday FD 7.5%", "HDFC Midcap MF"
  type: SavingsInstrumentType;
  provider?: string; // Keep provider for backward compatibility
  providerId?: string;
  platform?: string; // Keep platform for backward compatibility
  platformId?: string;
  ownerName?: string; // whose money: "Myself", "Mother", "Father", etc.
  ownerId?: string;
  goalIds?: string[]; // linked financial goals
  sipScheduleId?: string; // linked SIP recurring schedule
  accountNumber?: string; // optional reference number
  currency?: string; // optional (inherits from baseCurrency)
  openedAt: number; // epoch ms when instrument was created/opened
  closedAt?: number; // epoch ms when closed/broken/exited
  closeReason?: string; // "Emergency", "Matured", "Better opportunity"
  maturityDate?: number; // for FD, RD, bonds
  interestRate?: number; // annual %
  principalAmount?: number; // initial deposit / investment
  currentValue: number; // current total value
  unrealizedGain?: number;
  instrumentClass: InstrumentClass;
  details?: InstrumentDetails;
  status: 'active' | 'closed' | 'matured';
  linkedAccountId?: string; // which bank account it's linked to
  events: SavingsInstrumentEvent[]; // full history
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
  metadata?: {
    [key: string]: any; // folio number, ISIN, etc.
  };
}

// ─── Expense Category ──────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string; // emoji or icon name
  color?: string; // hex color
  nature: ExpenseNature | 'both'; // fixed | dynamic | both
  isDefault: boolean; // predefined vs user-created
  createdAt: number;
  createdBy: string;
}

// ─── Schedule Types ─────────────────────────────────────────────────────────────

export interface ScheduleTemplate extends Omit<Transaction, 'date' | 'id' | 'createdAt' | 'createdBy' | 'scheduleId'> {
  category?: string;
  instrumentId?: string;
  sipMode?: 'auto' | 'manual';
}

export interface Schedule {
  id: string;
  name: string;
  rrule: string; // e.g., "FREQ=MONTHLY;BYMONTHDAY=15"
  template: ScheduleTemplate;
  nextRunAt: number;
  lastRunAt?: number;
  status: 'active' | 'paused';
  priority: number;
  createdAt: number;
  updatedAt?: number;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  entity: 'transaction' | 'account' | 'goal' | 'schedule' | 'loan' | 'savings_instrument' | 'category';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  before: any;
  after: any;
  by: string;
  at: number;
  reason: 'manual' | 'schedule' | 'import' | 'system';
}

export interface Insight {
  id: string;
  month: string; // YYYY-MM format
  totals: {
    income: number;
    expenses: number;
    savings: number;
  };
  deltas: {
    income: number;
    expenses: number;
    savings: number;
  };
  projections: {
    burnRate: number;
    runway: number;
    goalProgress: { [goalId: string]: number };
  };
  createdAt: number;
}

export interface UserSettings {
  baseCurrency: string;
  locale: string;
  paydayRules: {
    dayOfMonth: number;
    accountId: string;
  }[];
  alerts: {
    budgetThreshold: number;
    goalReminder: boolean;
    recurringReminder: boolean;
  };
}

export interface Budget {
  id: string;
  accountId: string;
  monthlyAmount: number;
  currentAmount: number;
  month: string; // YYYY-MM format
  createdAt: number;
}

// ─── Form Types ─────────────────────────────────────────────────────────────────

export interface TransactionFormData {
  date: Date;
  amount: number;
  currency: string;
  fromAccountId: string;
  toAccountId: string;
  category?: string;
  tags: string[];
  note: string;
  sourceBreakdown: SourceBreakdown[];
  expenseNature?: ExpenseNature;
  sourceType?: string;
  sourceName?: string;
}

export interface AccountFormData {
  type: AccountType;
  subtype?: string;
  name: string;
  institution: string;
  currency: string;
}

export interface GoalFormData {
  name: string;
  targetAmount: number;
  targetDate?: Date;
  priority: number;
  allocations: { accountId?: string; instrumentId?: string; amount: number }[];
}

export interface ScheduleFormData {
  rrule: string;
  template: Omit<TransactionFormData, 'date'>;
  status: 'active' | 'paused';
}

export interface LoanFormData {
  loanType: LoanType;
  personName: string;
  principalAmount: number;
  currency: string;
  startDate: Date;
  dueDate?: Date;
  interestRate?: number;
  note?: string;
  fromAccountId?: string;
  toAccountId?: string;
  personId?: string;
}

export interface SavingsInstrumentFormData {
  name: string;
  type: SavingsInstrumentType;
  provider: string;
  platform?: string;
  ownerName?: string;
  personId?: string;
  goalIds?: string[];
  accountNumber?: string;
  currency: string;
  openedAt: Date;
  maturityDate?: Date;
  interestRate?: number;
  principalAmount: number;
  linkedAccountId?: string;
  metadata?: Record<string, any>;
}

// ─── Firestore Schema Types (legacy, kept for reference) ──────────────────────

export interface FirestoreAccount {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'credit_card';
  balance: number;
  currency: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreAuditLog {
  id: string;
  system: 'expense' | 'income' | 'transfer' | 'savings' | 'salary' | 'loan' | 'savings_instrument';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: object;
  timestamp: Timestamp;
  userId: string;
}

export interface Platform {
  id: string;
  name: string;
  type: 'trading' | 'mf_invest' | 'banking' | 'insurance' | 'crypto' | string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: number;
  createdBy: string;
}

export interface Provider {
  id: string;
  name: string;
  type: 'bank' | 'amc' | 'broker' | 'insurance' | 'govt' | string;
  shortCode: string;
  logoUrl?: string;
  createdAt: number;
  createdBy: string;
}

export interface InstrumentMaster {
  isin: string; // PK
  name: string;
  type: 'equity' | 'mf_equity' | 'mf_debt' | 'etf' | 'bond' | string;
  providerId: string; // FK to providers
  category: 'large_cap' | 'mid_cap' | 'elss' | 'liquid' | 'index' | string;
  currentNAV: number;
  navUpdatedAt: number; // epoch
  exitLoad?: number;
  lockInMonths?: number;
  createdAt: number;
  createdBy: string;
}

export interface TaxDeclaration {
  id: string;
  userId: string;
  fiscalYear: string; // e.g. "2024-25"
  regime: 'old' | 'new';
  section80C?: {
    ppf?: number;
    elss?: number;
    epf?: number;
    lic?: number;
    nsc?: number;
    tuition?: number;
    other?: number;
  };
  total80C: number; // max 1.5L
  section80D?: number; // health insurance
  hraExemption?: number;
  homeLoanInterest?: number; // 24B
  totalDeductions: number;
  pan?: string; // encrypted
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
}

export interface CapitalGain {
  id: string;
  userId: string;
  instrumentId: string;
  saleTransactionId: string;
  assetType: 'equity' | 'mf_equity' | 'mf_debt' | 'fd' | 'gold' | string;
  purchaseDate: number;
  saleDate: number;
  holdingDays: number;
  gainType: 'LTCG' | 'STCG';
  gain: number;
  taxRate: number; // percentage, e.g. 10, 15, 20
  fiscalYear: string; // e.g. "2024-25"
  createdAt: number;
  createdBy: string;
}
