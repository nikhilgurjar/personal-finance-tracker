'use client';

import { ReactNode } from 'react';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        {title && <div className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900">{title}</div>}
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-4 py-3">{footer}</div>}
      </div>
      <button aria-label="Close" className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

