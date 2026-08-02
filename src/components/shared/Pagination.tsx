import React from 'react';
import { ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
  showDetails?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
  showDetails = true,
}) => {
  if (totalPages <= 1) return null;

  // Calculate start & end indices for display
  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem =
    totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  // Generate page numbers range with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs dir-rtl ${className}`}
    >
      {/* Details info */}
      {showDetails && totalItems !== undefined && startItem !== null && endItem !== null ? (
        <div className="text-slate-500 font-medium">
          عرض <span className="font-bold text-slate-800 font-mono">{startItem}</span> -{' '}
          <span className="font-bold text-slate-800 font-mono">{endItem}</span> من أصل{' '}
          <span className="font-bold text-slate-950 font-mono">{totalItems}</span> عنصر
        </div>
      ) : (
        <div className="text-slate-500 font-medium">
          الصفحة <span className="font-bold text-slate-800 font-mono">{currentPage}</span> من{' '}
          <span className="font-bold text-slate-800 font-mono">{totalPages}</span>
        </div>
      )}

      {/* Buttons controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous page button (RTL ChevronRight is Previous) */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold shadow-2xs"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="hidden sm:inline">السابق</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-slate-400 flex items-center justify-center"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm scale-105'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page button (RTL ChevronLeft is Next) */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold shadow-2xs"
          title="الصفحة التالية"
        >
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
