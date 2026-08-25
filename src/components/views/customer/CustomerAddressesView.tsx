import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { CustomerAddress } from '../../../types/domain';
import { LeafletMap } from '../../shared/LeafletMap';
import { ZoneStatusBadge, ZoneStatus } from '../../shared/ZoneStatusBadge';
import { DEFAULT_LAT, DEFAULT_LNG } from '../../../lib/constants';
import { checkPointInZone, checkAddressZone } from '../../../lib/supabase/customer-insights';
import { MapPin, Plus, Trash2, Check, Home, Building, PlusCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

export default function CustomerAddressesView() {
  const currentUser = StorageRepo.getCurrentUser();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const [addresses, setAddresses] = useState<CustomerAddress[]>(
    StorageRepo.getAddresses(currentUser?.id)
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lng, setLng] = useState<number>(DEFAULT_LNG);

  // حالة فحص الـ zone للنقطة المختارة على الخريطة
  const [pickedZoneStatus, setPickedZoneStatus] = useState<ZoneStatus>(null);
  // zone محفوظة لكل عنوان (id → ZoneStatus)
  const [savedZones, setSavedZones] = useState<Record<string, ZoneStatus>>({});

  useEffect(() => {
    const syncAddresses = () => {
      setAddresses(StorageRepo.getAddresses(currentUser?.id));
    };

    syncAddresses();
    StorageRepo.refreshAddresses(currentUser?.id).catch(() => {});

    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'address') syncAddresses();
    });
    return unsubscribe;
  }, [currentUser?.id]);

  // فحص zone لكل عنوان محفوظ (lazy — واحد واحد لما الـ list تتحدّث).
  // بنستخدم setTimeout بسيط كـ debounce خفيف عشان ما نـ fireg RPC
  // requests على كل reload سريع. والـ result بنـ cache في state.
  useEffect(() => {
    if (!addresses || addresses.length === 0) return;
    let cancelled = false;
    const run = async () => {
      for (const addr of addresses) {
        if (!addr.id) continue;
        if (savedZones[addr.id] !== undefined) continue; // اتفحص قبل كده
        setSavedZones((prev) => ({ ...prev, [addr.id]: 'loading' }));
        const zone = await checkAddressZone(addr.id);
        if (cancelled) return;
        setSavedZones((prev) => ({ ...prev, [addr.id]: zone || 'outside' }));
      }
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  // فحص zone فوري لما اليوزر يضغط على الخريطة
  const handleMapClick = async (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat);
    setLng(pickedLng);
    setPickedZoneStatus('loading');
    const zone = await checkPointInZone(pickedLat, pickedLng);
    setPickedZoneStatus(zone || 'outside');
  };

  const resetForm = () => {
    setTitle('');
    setAddressLine('');
    setBuilding('');
    setFloor('');
    setApartment('');
    setIsDefault(false);
    setLat(DEFAULT_LAT);
    setLng(DEFAULT_LNG);
    setPickedZoneStatus(null);
  };

  const handleSave = async () => {
    if (!addressLine.trim()) {
      showToast({ type: 'error', title: 'خطأ', message: 'يرجى إدخال تفاصيل الشارع والعنوان' });
      return;
    }

    setIsSaving(true);
    try {
      await StorageRepo.saveAddress({
        id: '',
        user_id: currentUser?.id,
        title: title.trim() || 'عنوان جديد',
        address_line: addressLine.trim(),
        building: building.trim() || null,
        floor: floor.trim() || null,
        apartment: apartment.trim() || null,
        lat,
        lng,
        is_default: isDefault,
      });

      showToast({ type: 'success', title: 'تم', message: 'تم حفظ العنوان بنجاح' });
      resetForm();
      setIsAdding(false);
      setAddresses(StorageRepo.getAddresses(currentUser?.id));
    } catch (err: any) {
      showToast({ type: 'error', title: 'خطأ', message: err?.message || 'تعذر حفظ العنوان' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل ترغب في حذف هذا العنوان؟',
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        try {
          await StorageRepo.deleteAddress(id);
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف العنوان' });
          setAddresses(StorageRepo.getAddresses(currentUser?.id));
        } catch (err: any) {
          showToast({ type: 'error', title: 'خطأ', message: err?.message || 'تعذر حذف العنوان' });
        }
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            <span>دفتر العناوين المعتمدة للتوصيل</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتحديد عناوينك للتوصيل السريع بنقرة واحدة
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عنوان جديد</span>
        </button>
      </div>

      {/* Add New Address Form */}
      {isAdding && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg space-y-4 animate-in fade-in duration-200">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            إضافة عنوان توصيل جديد على الخريطة
          </h3>

          <LeafletMap
            interactiveSelect={true}
            onLocationSelect={handleMapClick}
            height="220px"
          />

          {/* badge حالة الـ zone تحت الخريطة — feedback فوري */}
          <ZoneStatusBadge status={pickedZoneStatus} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                اسم العنوان / التسمية
              </label>
              <input
                type="text"
                placeholder="مثال: المنزل، المكتب، بيت العائلة..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                تفاصيل الشارع والمنطقة *
              </label>
              <input
                type="text"
                placeholder="مثال: 23 شارع 9 - المعادي..."
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                المبنى / رقم العمارة
              </label>
              <input
                type="text"
                placeholder="عمارة 15..."
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                رقم الدور والشقة
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="دور 4..."
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-1/2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="شقة 12..."
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-1/2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>تعيين كعنوان افتراضي للتوصيل</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ العنوان'}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Saved Addresses List */}
      <div className="space-y-3">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl mt-1">
                <Home className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{addr.title}</h4>
                  {addr.is_default && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-md">
                      افتراضي
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{addr.address_line}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  مبنى: {addr.building || '-'} | دور: {addr.floor || '-'} | شقة: {addr.apartment || '-'}
                </p>
                {/* badge zone للعنوان المحفوظ */}
                {savedZones[addr.id] !== undefined && (
                  <div className="mt-2">
                    <ZoneStatusBadge status={savedZones[addr.id]} inline={true} />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDelete(addr.id)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="حذف العنوان"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
