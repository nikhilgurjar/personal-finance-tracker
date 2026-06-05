import { LayoutDashboard, Wallet, TrendingDown, Target, PiggyBank, Brain } from "lucide-react"

export const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard",           icon: LayoutDashboard },
  { label: "Accounts",  href: "/dashboard/accounts",  icon: Wallet },
  { label: "Expenses",  href: "/dashboard/expenses",  icon: TrendingDown },
  { label: "Goals",     href: "/dashboard/goals",     icon: Target },
  { label: "Savings",   href: "/dashboard/savings",   icon: PiggyBank },
  { label: "AI Coach",  href: "/dashboard/ai-plan",   icon: Brain },
]

export const STATS = [
  { title: "Total Balance",  value: "₹2,45,800", change: "+4.2%", up: true,  icon: "Wallet" },
  { title: "Monthly Spend",  value: "₹18,340",   change: "-2.1%", up: false, icon: "TrendingDown" },
  { title: "Total Savings",  value: "₹82,500",   change: "+8.1%", up: true,  icon: "PiggyBank" },
  { title: "Goals Progress", value: "3 / 5",     change: "60%",   up: true,  icon: "TrendingUp" },
]

export const GOALS = [
  { name: "Emergency Fund", target: 100000, current: 68000, color: "bg-blue-500" },
  { name: "Vacation – Goa", target: 40000,  current: 22000, color: "bg-emerald-500" },
  { name: "New Laptop",     target: 80000,  current: 15000, color: "bg-violet-500" },
]

export const ACCOUNTS = [
  { name: "HDFC Savings",   type: "Savings",  balance: 145800, last4: "4821" },
  { name: "ICICI Current",  type: "Current",  balance:  62000, last4: "3390" },
  { name: "Zerodha",        type: "Stocks",   balance:  38000, last4: "—"    },
]

export const EXPENSES = [
  { category: "Food & Dining",  amount: 4200,  icon: "🍔", percent: 23 },
  { category: "Transport",      amount: 2100,  icon: "🚗", percent: 11 },
  { category: "Utilities",      amount: 3800,  icon: "💡", percent: 21 },
  { category: "Entertainment",  amount: 1500,  icon: "🎬", percent: 8  },
  { category: "Shopping",       amount: 5200,  icon: "🛍️", percent: 28 },
  { category: "Health",         amount: 1540,  icon: "💊", percent: 9  },
]

export const SAVINGS_HISTORY = [
  { month: "Jan", saved: 8000  },
  { month: "Feb", saved: 9500  },
  { month: "Mar", saved: 7200  },
  { month: "Apr", saved: 11000 },
  { month: "May", saved: 9800  },
  { month: "Jun", saved: 12500 },
]

export const USER = {
  name: "John Doe",
  email: "john@email.com",
  initials: "JD",
  avatar: "/avatar.png",
}


export const EXPENSE_CATEGORIES = [
  { value: "housing",         label: "🏠 Housing & Rent" },
  { value: "groceries",       label: "🛒 Groceries" },
  { value: "food_dining",     label: "🍔 Food & Dining" },
  { value: "transport",       label: "🚗 Transport & Fuel" },
  { value: "credit_card",     label: "💳 Credit Card Bill" },
  { value: "card_emi",        label: "📅 Card EMI" },
  { value: "loan_emi",        label: "🏦 Loan EMI" },
  { value: "insurance",       label: "🛡️ Insurance" },
  { value: "health",          label: "💊 Health & Medical" },
  { value: "utilities",       label: "💡 Utilities & Bills" },
  { value: "mobile_internet", label: "📱 Mobile & Internet" },
  { value: "subscriptions",   label: "📺 Subscriptions" },
  { value: "travel",          label: "✈️ Travel" },
  { value: "education",       label: "📚 Education" },
  { value: "shopping",        label: "🛍️ Shopping" },
  { value: "entertainment",   label: "🎬 Entertainment" },
  { value: "personal_care",   label: "💇 Personal Care" },
  { value: "kids",            label: "👶 Kids & Family" },
  { value: "gifts",           label: "🎁 Gifts & Donations" },
  { value: "taxes",           label: "📋 Taxes" },
  { value: "other",           label: "📦 Other" },
]

export const SAVINGS_TYPES = [
  { value: "fd",              label: "🏦 Fixed Deposit (FD)" },
  { value: "mf",              label: "📈 Mutual Fund (MF)" },
  { value: "etf",             label: "📊 ETF" },
  { value: "ppf",             label: "🪙 PPF" },
  { value: "pf",              label: "🏛️ Provident Fund (PF)" },
  { value: "savings_account", label: "💰 Savings Account" },
  { value: "rd",              label: "📅 Recurring Deposit (RD)" },
  { value: "nps",             label: "🏦 NPS" },
  { value: "stocks",          label: "📉 Stocks" },
  { value: "gold",            label: "🥇 Gold / SGB" },
  { value: "crypto",          label: "🔗 Crypto" },
  { value: "other",           label: "📦 Other" },
]

export const SAVINGS_APPS = [
  { value: "groww",           label: "Groww" },
  { value: "zerodha",         label: "Zerodha" },
  { value: "hdfc_bank",       label: "HDFC Bank App" },
  { value: "uco_bank",        label: "UCO Bank App" },
  { value: "tata_neu",        label: "Tata Neu" },
  { value: "paytm_money",     label: "Paytm Money" },
  { value: "kuvera",          label: "Kuvera" },
  { value: "coin",            label: "Coin by Zerodha" },
  { value: "other",           label: "Other (add manually)" },
]

export const SAVINGS_PROVIDERS = [
  { value: "suryoday_bank",           label: "Suryoday Small Finance Bank" },
  { value: "axis_small_cap",          label: "Axis Small Cap Fund" },
  { value: "parag_parikh_flexi_cap",  label: "Parag Parikh Flexi Cap Fund" },
  { value: "hdfc_bank",               label: "HDFC Bank" },
  { value: "sbi",                     label: "SBI" },
  { value: "icici_bank",              label: "ICICI Bank" },
  { value: "axis_bank",               label: "Axis Bank" },
  { value: "mirae_asset",             label: "Mirae Asset" },
  { value: "nippon_india",            label: "Nippon India MF" },
  { value: "uti_mf",                  label: "UTI Mutual Fund" },
  { value: "hdfc_mf",                 label: "HDFC Mutual Fund" },
  { value: "sbi_mf",                  label: "SBI Mutual Fund" },
  { value: "other",                   label: "Other (add manually)" },
]

export const GOAL_CATEGORIES = [
  { value: "emergency_fund",  label: "🆘 Emergency Fund" },
  { value: "vacation",        label: "✈️ Vacation" },
  { value: "gadget",          label: "💻 Gadget / Electronics" },
  { value: "vehicle",         label: "🚗 Vehicle" },
  { value: "home",            label: "🏠 Home / Property" },
  { value: "education",       label: "📚 Education" },
  { value: "wedding",         label: "💍 Wedding" },
  { value: "retirement",      label: "🏖️ Retirement" },
  { value: "business",        label: "💼 Business" },
  { value: "other",           label: "📦 Other" },
]

export const ACCOUNTS_LIST = [
  { value: "hdfc_savings",  label: "HDFC Savings ••4821" },
  { value: "icici_current", label: "ICICI Current ••3390" },
  { value: "zerodha",       label: "Zerodha" },
]

export const INCOME_SOURCES = [
  { value: "salary",        label: "💼 Salary" },
  { value: "freelance",     label: "💻 Freelance / Consulting" },
  { value: "investments",   label: "📈 Investment Returns" },
  { value: "bonus",         label: "🎁 Bonus / Incentive" },
  { value: "rental",        label: "🏠 Rental Income" },
  { value: "business",      label: "🏪 Business Income" },
  { value: "gifts",         label: "🎉 Gifts / Transfers" },
  { value: "other",         label: "📦 Other" },
]

export const INCOME_FREQUENCY = [
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Bi-weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual",    label: "Annual" },
  { value: "one-time",  label: "One-time" },
]

export const SIP_TYPES = [
  { value: "mf",        label: "📈 Mutual Fund (MF)" },
  { value: "stocks",    label: "📉 Stocks" },
  { value: "etf",       label: "📊 ETF" },
  { value: "gold",      label: "🥇 Gold / SGB" },
  { value: "crypto",    label: "🔗 Crypto" },
  { value: "rd",        label: "📅 Recurring Deposit (RD)" },
  { value: "other",     label: "📦 Other" },
]

export const SIP_FREQUENCY = [
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Bi-weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual",    label: "Annual" },
]

export const SIP_STATUS = [
  { value: "active",    label: "✅ Active" },
  { value: "paused",    label: "⏸️ Paused" },
  { value: "completed", label: "✓ Completed" },
]
