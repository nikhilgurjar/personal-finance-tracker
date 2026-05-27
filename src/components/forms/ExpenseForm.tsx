'use client';

import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Groceries',
  'Education',
  'EMI / Loan Payment',
  'Other',
];

export const ExpenseForm: React.FC<BaseTransactionFormProps> = ({ accounts, ...props }) => {
  // Debit FROM: any non-expense account (bank, savings, wallet, income)
  const sourceAccounts = accounts.filter(a => a.type !== 'expense');
  // Categorize TO: expense-type accounts (category buckets)
  const categoryAccounts = accounts.filter(a => a.type === 'expense');

  return (
    <BaseTransactionForm
      {...props}
      accounts={accounts}
      fromAccounts={sourceAccounts}
      toAccounts={categoryAccounts.length > 0 ? categoryAccounts : accounts}
      title="New Expense"
      additionalFields={
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" defaultValue="" name="category">
              <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="tags" placeholder="Enter tags (comma separated)" />
          </div>
        </>
      }
    />
  );
};
