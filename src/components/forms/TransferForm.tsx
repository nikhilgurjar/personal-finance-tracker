'use client';

import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

export const TransferForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Transfer"
      additionalFields={
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Transfer Description</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" name="description" placeholder="Transfer description" />
        </div>
      }
    />
  );
};
