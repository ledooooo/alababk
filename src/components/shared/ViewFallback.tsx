import React from 'react';

export const ViewFallback: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-semibold text-slate-600">جاري تحميل الشاشة...</p>
    </div>
  );
};