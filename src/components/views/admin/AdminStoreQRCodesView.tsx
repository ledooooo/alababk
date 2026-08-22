import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { StorageRepo } from '../../../lib/storage';
import { QRCodeImage } from '../../shared/QRCodeImage';
import { printStoreQRCode, printAllStoreQRCodes } from '../../../lib/qr-print';
import { Store } from '../../../types/domain';
import { Pagination } from '../../shared/Pagination';
import { QrCode, Search, Printer, Download, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '../../shared/Toast';

const ITEMS_PER_PAGE = 8;

export default function AdminStoreQRCodesView() {
  const [stores, setStores] = useState<Store[]>(StorageRepo.getStores());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [printingAll, setPrintingAll] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadStores = async () => {
    setRefreshing(true);
    try {
      const data = await StorageRepo.refreshStores();
      setStores(data);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحميل', message: err.message || 'تعذر تحميل قائمة المتاجر' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const filteredStores = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((s) => s.name.toLowerCase().includes(term));
  }, [stores, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / ITEMS_PER_PAGE));
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrintOne = async (store: Store) => {
    setPrintingId(store.id);
    try {
      await printStoreQRCode(store);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الطباعة', message: err.message || 'تعذر إنشاء كود QR للطباعة' });
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintAll = async () => {
    if (filteredStores.length === 0) return;
    setPrintingAll(true);
    try {
      await printAllStoreQRCodes(filteredStores);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الطباعة', message: err.message || 'تعذر إنشاء أكواد QR للطباعة' });
    } finally {
      setPrintingAll(false);
    }
  };

  const handleDownload = async (store: Store) => {
    setDownloadingId(store.id);
    try {
      const url = `${window.location.origin}/stores/${store.id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr-${store.slug || store.id}.png`;
      link.click();
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحميل', message: 'تعذر إنشاء صورة QR' });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل المتاجر...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
            <QrCode className="w-5 h-5" />
            <span>أكواد QR للمتاجر</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">اطبع كود لكل متجر</h1>
          <p className="text-xs text-slate-500 mt-1">
            مسح الكود بالموبايل يودّي العميل مباشرة لصفحة المتجر على المنصة — مفيد للصق على واجهة المحل أو الفواتير
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadStores()}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={handlePrintAll}
            disabled={printingAll || filteredStores.length === 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            {printingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{printingAll ? 'جاري التجهيز...' : `طباعة الكل (${filteredStores.length})`}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="ابحث باسم المتجر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Stores Grid */}
      {filteredStores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-xs text-slate-500">لا توجد متاجر مطابقة.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginatedStores.map((store) => {
              const storeUrl = `${window.location.origin}/stores/${store.id}`;
              return (
                <div key={store.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col items-center text-center gap-3">
                  <div className="w-full flex items-center gap-2">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} loading="lazy" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                    )}
                    <p className="font-bold text-slate-900 text-xs truncate">{store.name}</p>
                  </div>

                  <QRCodeImage value={storeUrl} size={160} className="rounded-lg border border-slate-100" />

                  <p className="text-[10px] text-slate-400 truncate w-full dir-ltr" title={storeUrl}>
                    {storeUrl}
                  </p>

                  <div className="w-full flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrintOne(store)}
                      disabled={printingId === store.id}
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      {printingId === store.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      طباعة
                    </button>
                    <button
                      onClick={() => handleDownload(store)}
                      disabled={downloadingId === store.id}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      {downloadingId === store.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      تحميل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredStores.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}
    </div>
  );
}
