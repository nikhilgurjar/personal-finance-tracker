'use client';

import { TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';

interface TransactionItemProps {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function TransactionItem({
  id,
  type,
  amount,
  description,
  category,
  date,
  onEdit,
  onDelete,
  className = '',
}: TransactionItemProps) {
  const isIncome = type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;

  return (
    <div
      className={`flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isIncome ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${isIncome ? 'text-green-600' : 'text-red-600'}`}
          />
        </div>

        <div>
          <p className="font-semibold text-gray-900">{description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">{category}</span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-600">{date}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p
          className={`font-bold text-lg ${
            isIncome ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isIncome ? '+' : '-'}₹{amount.toLocaleString()}
        </p>

        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(id)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
