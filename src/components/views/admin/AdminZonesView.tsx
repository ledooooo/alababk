import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { DeliveryZone, Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { LeafletMap, MapPolygon } from '../../shared/LeafletMap';
import { ensureUUID, fetchSupabaseStores } from '../../../lib/supabase';
import { MapPin, Plus, Clock, Edit2, ShieldCheck, Check, AlertCircle, Power, Trash2, Store as StoreIcon, Globe } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

export default function AdminZonesView() {
  const [zones, setZones] = useState<DeliveryZone[]>(StorageRepo.getZones());
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);
  const [polygonStr, setPolygonStr] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    if (editingZone?.polygon && Array.isArray(editingZone.polygon)) {
      setPolygonStr(JSON.stringify(editingZone.polygon));
    } else {
      setPolygonStr('');
    }
  }, [editingZone?.id]);

  // subscribe لأي تغيير في zones (save/delete من أي مكان) عشان الـ list
  // يحدّث تلقائياً من غير refresh
  useEffect(() => {
    const refresh = () => setZones(StorageRepo.getZones());
    refresh();
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'zone') refresh();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchSupabaseStores().then(setStores).catch((err) => console.warn('fetch stores for zones error:', err));
  }, []);

  const filteredZones = storeFilter === 'all'
    ? zones
    : storeFilter === 'global'
      ? zones.filter((z) => !z.store_id)
      : zones.filter((z) => z.store_id === storeFilter);

  const handleSaveZone = async () => {
    setErrorMessage(null);
    const feeVal = Number(editingZone?.fee ?? editingZone?.base_delivery_fee ?? 15);
    const etaVal = Number(editingZone?.eta_minutes ?? editingZone?.estimated_delivery_mins ?? 30);

    if (!editingZone?.name || !feeVal) {
      const msg = 'يرجى إدخال اسم المنطقة ورسوم التوصيل الأساسية';
      setErrorMessage(msg);
      showToast({ type: 'error', title: 'بيانات ناقصة', message: msg });
      return;
    }

    let parsedPolygon: [number, number][] | undefined = undefined;
    if (polygonStr.trim()) {
      try {
        const arr = JSON.parse(polygonStr);
        if (Array.isArray(arr) && arr.every((pt) => Array.isArray(pt) && pt.length === 2)) {
          parsedPolygon = arr as [number, number][];
        } else {
          const msg = 'صيغة المضلع (polygon) غير صحيحة. يجب أن تكون قائمة إحداثيات مثل [[30.05, 31.23], [30.05, 31.26]]';
          setErrorMessage(msg);
          showToast({ type: 'error', title: 'خطأ في الإحداثيات', message: msg });
          return;
        }
      } catch {
        const msg = 'تعذر قراءة إحداثيات المضلع. يرجى التأكد من كتابة JSON صحيح';
        setErrorMessage(msg);
        showToast({ type: 'error', title: 'خطأ في JSON', message: msg });
        return;
      }
    }

    const fullZone: DeliveryZone = {
      id: editingZone.id && editingZone.id.length > 20 ? editingZone.id : ensureUUID(editingZone.id),
      name: editingZone.name,
      fee: feeVal,
      eta_minutes: etaVal,
      base_delivery_fee: feeVal,
      estimated_delivery_mins: etaVal,
      center_lat: editingZone.center_lat || 30.0444,
      center_lng: editingZone.center_lng || 31.2357,
      radius_km: Number(editingZone.radius_km || 5),
      polygon: parsedPolygon || editingZone.polygon,
      is_active: editingZone.is_active ?? true,
    };

    try {
      setSaving(true);
      await StorageRepo.saveZone(fullZone);
      setZones(StorageRepo.getZones());
      setEditingZone(null);
      showToast({ type: 'success', title: 'تم الحفظ', message: 'تم حفظ المنطقة بنجاح' });
    } catch (err: any) {
      console.error('Failed to save zone in AdminZonesView:', err);
      const msg = err?.message || 'فشل حفظ المنطقة في قاعدة البيانات';
      setErrorMessage(msg);
      showToast({ type: 'error', title: 'فشل الحفظ', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = (zoneId: string, zoneName: string) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف منطقة "${zoneName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        try {
          await StorageRepo.deleteZone(zoneId);
          setZones(StorageRepo.getZones());
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف المنطقة نهائياً' });
        } catch (err: any) {
          console.error('Failed to delete zone:', err);
          showToast({ type: 'error', title: 'فشل الحذف', message: err?.message || 'تعذر حذف المنطقة' });
        }
      },
    });
  };

  // تبديل حالة النشاط (is_active) بدون فتح نموذج التعديل
  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      const updated = { ...zone, is_active: !zone.is_active };
      await StorageRepo.saveZone(updated);
      setZones(StorageRepo.getZones());
      showToast({
        type: 'success',
        title: updated.is_active ? 'تم التفعيل' : 'تم التعطيل',
        message: `منطقة "${zone.name}" ${updated.is_active ? 'نشطة الآن' : 'معطلة مؤقتاً'}`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err?.message || 'تعذر تغيير حالة المنطقة' });
    }
  };

  const zoneMarkers = filteredZones.map((z) => ({
    lat: z.center_lat || 30.0444,
    lng: z.center_lng || 31.2357,
    title: z.name,
    popupText: `منطقة: ${z.name} | رسوم التوصيل: ${formatCurrency(z.fee || z.base_delivery_fee || 15)} | ETA: ${z.eta_minutes || z.estimated_delivery_mins || 30} دقيقة`,
    type: 'store' as const,
  }));

  // تحويل الـ polygons للـ format اللي LeafletMap يفهمه
  const zonePolygons: MapPolygon[] = filteredZones
    .filter((z) => Array.isArray(z.polygon) && z.polygon.length >= 3)
    .map((z) => ({
      coordinates: z.polygon as [number, number][],
      name: z.name,
      isActive: z.is_active !== false,
    }));

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            <span>إدارة مناطق وعصبيات التوصيل الميداني</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            كل متجر له مناطق تغطية خاصة به (عنوانه مختلف عن غيره) — أو تُستخدم المناطق العامة تلقائيًا لأي متجر لسه ما حدّدش مناطقه
          </p>
        </div>

        <button
          onClick={() => {
            setEditingZone({
              id: ensureUUID(),
              name: 'منطقة جديدة',
              center_lat: 30.0444,
              center_lng: 31.2357,
              radius_km: 5,
              fee: 15,
              base_delivery_fee: 15,
              eta_minutes: 30,
              estimated_delivery_mins: 30,
              is_active: true,
              store_id: storeFilter !== 'all' && storeFilter !== 'global' ? storeFilter : null,
            });
            setPolygonStr('');
            setErrorMessage(null);
          }}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منطقة تغطية جديدة</span>
        </button>
      </div>

      {/* فلتر عرض المناطق حسب المتجر */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 shrink-0">اعرض مناطق:</span>
        <button
          onClick={() => setStoreFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${storeFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          الكل
        </button>
        <button
          onClick={() => setStoreFilter('global')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${storeFilter === 'global' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>عامة (fallback)</span>
        </button>
        <select
          value={storeFilter !== 'all' && storeFilter !== 'global' ? storeFilter : ''}
          onChange={(e) => setStoreFilter(e.target.value || 'all')}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border-none outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">-- اختر متجر معيّن --</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Map Overview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700">خريطة المناطق المرئية (نشطة = ملونة، معطلة = متقطعة)</h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-300" /> نشطة
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-dashed border-slate-400" /> معطلة
            </span>
          </div>
        </div>
        <LeafletMap markers={zoneMarkers} polygons={zonePolygons} height="300px" />
      </div>

      {/* Zone Edit Form Modal */}
      {editingZone && (
        <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-lg space-y-4 animate-in fade-in">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            بيانات منطقة التوصيل
          </h3>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تابعة لمتجر معيّن، ولا منطقة عامة؟</label>
            <select
              value={editingZone.store_id || ''}
              onChange={(e) => setEditingZone({ ...editingZone, store_id: e.target.value || null })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">🌐 منطقة عامة (fallback لكل متجر لسه ما حدّدش مناطقه)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>🏪 {s.name}</option>
              ))}
            </select>
            {editingZone.store_id && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1.5 font-bold">
                ⚠️ بمجرد ما تحفظ أول منطقة خاصة بهذا المتجر، عناوين عملائه هتتفحص ضد مناطقه الخاصة بس (مش هيرجعوا للمناطق العامة تلقائيًا).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنطقة</label>
              <input
                type="text"
                value={editingZone.name || ''}
                onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رسوم التوصيل (fee / ج.م)</label>
              <input
                type="number"
                value={editingZone.fee ?? editingZone.base_delivery_fee ?? ''}
                onChange={(e) =>
                  setEditingZone({
                    ...editingZone,
                    fee: Number(e.target.value),
                    base_delivery_fee: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوقت التقديري (eta_minutes)</label>
              <input
                type="number"
                value={editingZone.eta_minutes ?? editingZone.estimated_delivery_mins ?? ''}
                onChange={(e) =>
                  setEditingZone({
                    ...editingZone,
                    eta_minutes: Number(e.target.value),
                    estimated_delivery_mins: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* is_active toggle in edit form */}
          <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={editingZone.is_active !== false}
              onChange={(e) => setEditingZone({ ...editingZone, is_active: e.target.checked })}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>المنطقة نشطة وتستقبل طلبات (إيقاف = منطقة مغلقة مؤقتاً)</span>
          </label>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              إحداثيات الحدود الجغرافية Polygon (JSON اختياري)
            </label>
            <textarea
              rows={2}
              value={polygonStr}
              onChange={(e) => setPolygonStr(e.target.value)}
              placeholder="[[30.05, 31.23], [30.05, 31.26], [30.03, 31.26], [30.03, 31.23]]"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none dir-ltr"
            />
            {polygonStr.trim() && (() => {
              try {
                const arr = JSON.parse(polygonStr);
                if (Array.isArray(arr) && arr.length >= 3 && arr.every((p) => Array.isArray(p) && p.length === 2)) {
                  return (
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      مضلع صالح: {arr.length} نقطة
                    </p>
                  );
                }
                return (
                  <p className="text-[10px] text-rose-600 mt-1 font-bold">
                    ⚠️ محتاج 3 نقاط على الأقل وكل نقطة [lat, lng]
                  </p>
                );
              } catch {
                return (
                  <p className="text-[10px] text-rose-600 mt-1 font-bold">
                    ⚠️ JSON غير صالح
                  </p>
                );
              }
            })()}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveZone}
              disabled={saving}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ المنطقة'}
            </button>
            <button
              onClick={() => {
                setEditingZone(null);
                setErrorMessage(null);
              }}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Zone Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredZones.map((z) => (
          <div
            key={z.id}
            className={`bg-white rounded-2xl p-4 border shadow-xs space-y-2 ${
              z.is_active !== false ? 'border-slate-200' : 'border-slate-200 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-sm">{z.name}</h3>
                {z.store_id ? (
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                    <StoreIcon className="w-3 h-3" /> {z.store_name || 'متجر'}
                  </span>
                ) : (
                  <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> عامة
                  </span>
                )}
                {z.is_active === false && (
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                    معطلة
                  </span>
                )}
              </div>
              <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-xs">
                {formatCurrency(z.fee ?? z.base_delivery_fee ?? 0)}
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center justify-between">
              <span>زمن التوصيل (ETA):</span>
              <span className="font-bold text-slate-800">{z.eta_minutes ?? z.estimated_delivery_mins ?? 30} دقيقة</span>
            </p>
            <p className="text-xs text-slate-500">قطر التغطية: {z.radius_km || 5} كم</p>

            {z.polygon && (
              <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 font-mono">
                مضلع معرّف: {Array.isArray(z.polygon) ? z.polygon.length : 0} نقاط
              </p>
            )}

            <div className="grid grid-cols-3 gap-1.5 pt-2">
              <button
                onClick={() => {
                  setEditingZone({ ...z });
                  setErrorMessage(null);
                }}
                className="py-2 bg-slate-50 hover:bg-slate-100 text-purple-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
                title="تعديل خصائص المنطقة"
              >
                <Edit2 className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                onClick={() => handleToggleActive(z)}
                className={`py-2 font-bold text-xs rounded-xl border transition-colors ${
                  z.is_active !== false
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title={z.is_active !== false ? 'تعطيل مؤقت' : 'تفعيل'}
              >
                <Power className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                onClick={() => handleDeleteZone(z.id, z.name)}
                className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors"
                title="حذف المنطقة نهائياً"
              >
                <Trash2 className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};