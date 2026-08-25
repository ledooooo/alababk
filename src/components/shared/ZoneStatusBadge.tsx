// src/components/shared/ZoneStatusBadge.tsx
// =====================================================================
// Badge موحّد يعرض حالة العنوان بالنسبة لمناطق التوصيل:
//   • داخل zone  → ✅ "جوه [اسم المنطقة] — رسوم [X] ج / [Y] دقيقة"
//   • بره zones  → ⚠️ "بره كل مناطق التوصيل المسجلة"
//   • جاري الفحص → ⏳ "جاري التحقق من منطقة التوصيل..."
//   • null/فارغ  → لا يعرض شيء
// =====================================================================
import React from 'react';
import { CheckCircle2, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import type { ZoneMatch } from '../../lib/supabase/customer-insights';
import { formatCurrency } from '../../lib/formatters';

export type ZoneStatus = 'loading' | ZoneMatch | 'outside' | null;

interface ZoneStatusBadgeProps {
  status: ZoneStatus;
  className?: string;
  /** يخلي الـ badge inline مع نص تاني (مثلاً: "في انتظار التوصيل" | badge) */
  inline?: boolean;
}

export function ZoneStatusBadge({ status, className = '', inline = false }: ZoneStatusBadgeProps) {
  if (status === null) return null;

  const wrapperClasses = inline
    ? `inline-flex items-center gap-1.5 text-[11px] font-bold ${className}`
    : `flex items-start gap-2 p-2.5 rounded-xl text-xs ${className}`;

  // حالة التحميل
  if (status === 'loading') {
    return (
      <div className={wrapperClasses + ' bg-slate-50 text-slate-600 border border-slate-200'}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>جاري التحقق من منطقة التوصيل...</span>
      </div>
    );
  }

  // داخل zone
  if (typeof status === 'object') {
    return (
      <div className={wrapperClasses + ' bg-emerald-50 text-emerald-800 border border-emerald-200'}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>جوه منطقة {status.zone_name}</span>
          </div>
          {!inline && (
            <div className="text-[11px] text-emerald-700 mt-0.5">
              رسوم التوصيل: {formatCurrency(status.fee)} · الوقت المتوقع: {status.eta_minutes} دقيقة
            </div>
          )}
        </div>
      </div>
    );
  }

  // بره كل الـ zones
  return (
    <div className={wrapperClasses + ' bg-amber-50 text-amber-800 border border-amber-200'}>
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold">بره كل مناطق التوصيل المسجلة</div>
        {!inline && (
          <div className="text-[11px] text-amber-700 mt-0.5">
            للأسف موقعك خارج النطاق الحالي. جرب عنوان تاني أو تواصل مع خدمة العملاء.
          </div>
        )}
      </div>
    </div>
  );
}
