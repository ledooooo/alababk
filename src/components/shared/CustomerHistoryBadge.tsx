// src/components/shared/CustomerHistoryBadge.tsx
// =====================================================================
// Badge موحّد لعرض "عميل جديد" أو "عميل عائد" صاحب الـ (X) طلب سابق.
// بيستخدم getCustomerOrderCount و isFirstOrder من customer-insights.
// =====================================================================
import React from 'react';
import { Sparkles, User } from 'lucide-react';

export type CustomerHistoryStatus =
  | 'loading'
  | { isFirst: true; total: number }      // أول طلب
  | { isFirst: false; total: number };    // عنده طلبات سابقة

interface CustomerHistoryBadgeProps {
  status: CustomerHistoryStatus;
  className?: string;
  /** inline mode — بيخلي الـ badge صغير ومناسب للـ list items */
  inline?: boolean;
}

export function CustomerHistoryBadge({ status, className = '', inline = false }: CustomerHistoryBadgeProps) {
  if (status === 'loading') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 ${className}`}>
        <span className="w-3 h-3 rounded-full bg-slate-200 animate-pulse" />
        {inline ? null : <span>جاري التحقق...</span>}
      </span>
    );
  }

  if (status.isFirst) {
    return (
      <span
        title="عميل جديد — هذا أول طلب له"
        className={`inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 ${className}`}
      >
        <Sparkles className="w-3 h-3" />
        <span>عميل جديد</span>
      </span>
    );
  }

  return (
    <span
      title={`عميل عائد — عنده ${status.total} طلبات سابقة`}
      className={`inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 ${className}`}
    >
      <User className="w-3 h-3" />
      <span>عائد{status.total > 0 ? ` · ${status.total} طلب` : ''}</span>
    </span>
  );
}
