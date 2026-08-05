import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { DeliveryZone } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { LeafletMap } from '../../shared/LeafletMap';
import { ensureUUID } from '../../../lib/supabase';
import { MapPin, Plus, Clock, Edit2, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export const AdminZonesView: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>(StorageRepo.getZones());
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);
  const [polygonStr, setPolygonStr] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingZone?.polygon && Array.isArray(editingZone.polygon)) {
      setPolygonStr(JSON.stringify(editingZone.polygon));
    } else {
      setPolygonStr('');
    }
  }, [editingZone?.id]);

  const handleSaveZone = async () => {
    setErrorMessage(null);
    const feeVal = Number(editingZone?.fee ?? editingZone?.base_delivery_fee ?? 15);
    const etaVal = Number(editingZone?.eta_minutes ?? editingZone?.estimated_delivery_mins ?? 30);

    if (!editingZone?.name || !feeVal) {
      setErrorMessage('يرجى إدخال اسم المنطقة ورسوم التوصيل الأساسية');
      return;
    }

    let parsedPolygon: [number, number][] | undefined = undefined;
    if (polygonStr.trim()) {
      try {
        const arr = JSON.parse(polygonStr);
        if (Array.isArray(arr) && arr.every((pt) => Array.isArray(pt) && pt.length === 2)) {
          parsedPolygon = arr as [number, number][];
        } else {
          setErrorMessage('صيغة المضلع (polygon) غير صحيحة. يجب أن تكون قائمة إحداثيات مثل [[30.05, 31.23], [30.05, 31.26]]');
          return;
        }
      } catch {
        setErrorMessage('تعذر قراءة إحداثيات المضلع. يرجى التأكد من كتابة JSON صحيح');
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
    } catch (err: any) {
      console.error('Failed to save zone in AdminZonesView:', err);
      setErrorMessage(err?.message || 'فشل حفظ المنطقة في قاعدة البيانات');
    } finally {
      setSaving(false);
    }
  };

  const zoneMarkers = zones.map((z) => ({
    lat: z.center_lat || 30.0444,
    lng: z.center_lng || 31.2357,
    title: z.name,
    popupText: `منطقة: ${z.name} | رسوم التوصيل: ${formatCurrency(z.fee || z.base_delivery_fee || 15)} | ETA: ${z.eta_minutes || z.estimated_delivery_mins || 30} دقيقة`,
    type: 'store' as const,
  }));

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            <span>إدارة مناطق وعصبيات التوصيل الميداني</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد أقطار النطاق الجغرافي والمضلعات (Polygon) ورسوم التوصيل والزمن التقديري للخدمة
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

      {/* Map Overview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <LeafletMap markers={zoneMarkers} height="300px" />
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
        {zones.map((z) => (
          <div key={z.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-slate-900 text-sm">{z.name}</h3>
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

            <button
              onClick={() => {
                setEditingZone({ ...z });
                setErrorMessage(null);
              }}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-purple-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors mt-2"
            >
              تعديل خصائص المنطقة
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
