'use client';

import { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Account } from '@/lib/types';

interface FormFields {
  amount: string;
  date: Dayjs | null;
  note?: string;
  fromAccountId?: string;
  toAccountId?: string;
  [key: string]: any;
}

type InitialFormFields = Partial<Omit<FormFields, 'date'> & {
  date: Dayjs | Date | null;
}>;

export interface BaseTransactionFormProps {
  accounts: Account[];
  onSubmit: (formData: any) => void;
  onClose?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  editingTransaction?: any;
  initialValues?: InitialFormFields;
  /** Override accounts shown in the "From Account" selector */
  fromAccounts?: Account[];
  /** Override accounts shown in the "To Account" selector */
  toAccounts?: Account[];
}

export const BaseTransactionForm: React.FC<BaseTransactionFormProps & {
  title: string;
  additionalFields?: React.ReactNode;
  initialValues?: InitialFormFields;
  hideFromAccount?: boolean;
  hideToAccount?: boolean;
  fromAccounts?: Account[];
  toAccounts?: Account[];
}> = ({
  title,
  accounts,
  fromAccounts,
  toAccounts,
  onSubmit,
  isLoading,
  error,
  additionalFields,
  initialValues = {},
  hideFromAccount = false,
  hideToAccount = false,
}) => {
  const [formData, setFormData] = useState<FormFields>({
    ...initialValues,
    amount: initialValues.amount || '',
    date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    note: initialValues.note || '',
    fromAccountId: initialValues.fromAccountId || '',
    toAccountId: initialValues.toAccountId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!hideFromAccount && !formData.fromAccountId) {
      newErrors.fromAccountId = 'From Account is required';
    }
    if (!hideToAccount && !formData.toAccountId) {
      newErrors.toAccountId = 'To Account is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

      const submissionData = {
        ...formData,
        date: formData.date?.toDate(),
        tags: tagsArray,
        currency: 'INR',
      };
      onSubmit(submissionData);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const resolvedFromAccounts = fromAccounts ?? accounts;
  const resolvedToAccounts = toAccounts ?? accounts;

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              type="number"
              value={formData.amount}
              onChange={handleChange('amount')}
              required
              step="0.01"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              type="date"
              value={formData.date ? formData.date.format('YYYY-MM-DD') : ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: dayjs(e.target.value) }))}
              required
            />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
          </div>
          {!hideFromAccount && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">From Account</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                value={formData.fromAccountId}
                onChange={handleChange('fromAccountId')}
                required
              >
                <option value="">Select account</option>
                  {resolvedFromAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
              {errors.fromAccountId && <p className="mt-1 text-xs text-red-600">{errors.fromAccountId}</p>}
            </div>
          )}
          {!hideToAccount && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">To Account</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                value={formData.toAccountId}
                onChange={handleChange('toAccountId')}
                required
              >
                <option value="">Select account</option>
                  {resolvedToAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
              {errors.toAccountId && <p className="mt-1 text-xs text-red-600">{errors.toAccountId}</p>}
            </div>
          )}
          {additionalFields}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              rows={2}
              value={formData.note}
              onChange={handleChange('note')}
            />
          </div>
          {error && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error.message}
            </div>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
