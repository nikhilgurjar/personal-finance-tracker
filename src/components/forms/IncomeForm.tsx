'use client';

import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Rental',
  'Other',
];

export const IncomeForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Income"
      hideFromAccount
      additionalFields={
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" defaultValue="" name="category" required>
              <option value="">Select category</option>
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Source</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="source" placeholder="Income source" />
          </div>
        </>
      }
    />
  );
};
