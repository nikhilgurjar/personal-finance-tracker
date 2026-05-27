'use client';

import { useState } from 'react';
import { Account } from '@/lib/types';

interface FormFields { amount: string; date: Date | null; note?: string; fromAccountId?: string; toAccountId?: string; [key: string]: any; }
type InitialFormFields = Partial<Omit<FormFields, 'date'> & { date: Date | null; }>;

export interface BaseTransactionFormProps {
  accounts: Account[];
  onSubmit: (formData: any) => void;
  onClose?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  editingTransaction?: any;
  initialValues?: InitialFormFields;
  fromAccounts?: Account[];
  toAccounts?: Account[];
}

export const BaseTransactionForm: React.FC<BaseTransactionFormProps & {
  title: string;
  additionalFields?: React.ReactNode;
  hideFromAccount?: boolean;
  hideToAccount?: boolean;
}> = ({ title, accounts, fromAccounts, toAccounts, onSubmit, isLoading, error, additionalFields, initialValues = {}, hideFromAccount = false, hideToAccount = false }) => {
  const [formData, setFormData] = useState<FormFields>({ ...initialValues, amount: initialValues.amount || '', date: initialValues.date ? new Date(initialValues.date) : new Date(), note: initialValues.note || '', fromAccountId: initialValues.fromAccountId || '', toAccountId: initialValues.toAccountId || '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validateForm = () => { const e: Record<string, string> = {}; if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) e.amount = 'Amount must be a positive number'; if (!formData.date) e.date = 'Date is required'; if (!hideFromAccount && !formData.fromAccountId) e.fromAccountId = 'From Account is required'; if (!hideToAccount && !formData.toAccountId) e.toAccountId = 'To Account is required'; setErrors(e); return Object.keys(e).length===0; };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!validateForm()) return; const tagsArray = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []; onSubmit({ ...formData, date: formData.date || new Date(), tags: tagsArray, currency: 'INR' }); };
  const handleChange = (field: string) => (event: any) => setFormData((p) => ({ ...p, [field]: event.target.value }));
  const resolvedFromAccounts = fromAccounts ?? accounts; const resolvedToAccounts = toAccounts ?? accounts;
  return <div className='mb-3 rounded-xl border border-slate-200 bg-white p-6'><h2 className='mb-4 text-lg font-semibold text-slate-900'>{title}</h2><form onSubmit={handleSubmit}><div className='grid grid-cols-1 gap-4 sm:grid-cols-2'><div><label className='mb-1 block text-sm font-medium text-slate-700'>Amount</label><input className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' type='number' value={formData.amount} onChange={handleChange('amount')} required step='0.01' />{errors.amount&&<p className='mt-1 text-xs text-red-600'>{errors.amount}</p>}</div><div><label className='mb-1 block text-sm font-medium text-slate-700'>Date</label><input className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' type='date' value={formData.date ? formData.date.toISOString().slice(0,10) : ''} onChange={(e)=>setFormData((p)=>({...p,date:new Date(e.target.value)}))} required />{errors.date&&<p className='mt-1 text-xs text-red-600'>{errors.date}</p>}</div>{!hideFromAccount&&<div><label className='mb-1 block text-sm font-medium text-slate-700'>From Account</label><select className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' value={formData.fromAccountId} onChange={handleChange('fromAccountId')} required><option value=''>Select account</option>{resolvedFromAccounts.map((a:Account)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}{!hideToAccount&&<div><label className='mb-1 block text-sm font-medium text-slate-700'>To Account</label><select className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' value={formData.toAccountId} onChange={handleChange('toAccountId')} required><option value=''>Select account</option>{resolvedToAccounts.map((a:Account)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}{additionalFields}<div className='sm:col-span-2'><label className='mb-1 block text-sm font-medium text-slate-700'>Note</label><textarea className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' rows={2} value={formData.note} onChange={handleChange('note')} /></div>{error&&<div className='sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{error.message}</div>}<div className='sm:col-span-2'><button type='submit' disabled={isLoading} className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white'>{isLoading ? 'Saving...' : 'Save'}</button></div></div></form></div>;
};

