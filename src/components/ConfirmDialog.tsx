'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const colorMap = {
  error: { bg: 'bg-red-50', text: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-600', button: 'bg-yellow-600 hover:bg-yellow-700' },
  primary: { bg: 'bg-blue-50', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
  success: { bg: 'bg-green-50', text: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const colors = colorMap[confirmColor];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xs w-full shadow-lg">
        <div className={`p-6 ${colors.bg}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>
        
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg font-medium transition disabled:opacity-50 ${colors.button}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
