'use client';

import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const SALARY_TYPES = [
  'Regular',
  'Bonus',
  'Commission',
  'Overtime',
  'Other',
];

export const SalaryForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Salary"
      hideFromAccount
      additionalFields={
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" defaultValue="" name="salaryType" required>
              <option value="">Select salary type</option>
                {SALARY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="company" placeholder="Company name" required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Pay Period</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="payPeriod" placeholder="e.g., Sept 1-15, 2025" />
          </div>
        </>
      }
    />
  );
};
