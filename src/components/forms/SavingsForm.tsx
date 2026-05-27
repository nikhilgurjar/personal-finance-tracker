'use client';

import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Retirement',
  'Investment',
  'House Down Payment',
  'Education',
  'Other',
];

export const SavingsForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Savings"
      additionalFields={
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" defaultValue="" name="category" required>
              <option value="">Select category</option>
                {SAVINGS_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Goal</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="goal" placeholder="Savings goal (optional)" />
          </div>
        </>
      }
    />
  );
};
