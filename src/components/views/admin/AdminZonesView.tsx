import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { DeliveryZone } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { LeafletMap } from '../../shared/LeafletMap';
import { MapPin, Plus, Clock, Edit2, ShieldCheck, Check } from 'lucide-react';

export const AdminZonesView: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>(StorageRepo.getZones());
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);

  const handleSaveZone = () => {
    if (!editingZone?.name || !editingZone?.base_delivery_fee) {
      alert('يرجى إدخال اسم المنطقة ورسوم التوصيل الأساسية');
      return;
    }

    const fullZone: DeliveryZone = {
      id: editingZone.id || `zone-${Date.now()}`,
      name: editingZone.name,
      center_lat: editingZone.center_lat || 30.0444,
      center_lng: editingZone.center_lng || 31.2357,
      radius_km: Number(editingZone.radius_km || 5),
      base_delivery_fee: Number(editingZone.base_delivery_fee || 15),
      estimated_delivery_mins: Number(editingZone.estimated_delivery_mins || 30),
      is_active: editingZone.is_active ?? true,
    };

    StorageRepo.saveZone(fullZone);
    setZones(StorageRepo.getZones());
    setEditingZone(null);
  };

  const zoneMarkers = zones.map((z) => ({
    lat: z.center_lat || 30.0444,
    lng: z.center_lng || 31.2357,
    title: z.name,
    popupText: `منطقة: ${z.name} | رسوم التوصيل: ${formatCurrency(z.base_delivery_fee || z.fee || 15)} | التغطية: ${z.radius_km || 5} كم`,
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
            تحديد أقطار النطاق الجغرافي ورسوم التوصيل والزمن التقديري للخدمة
          </p>
        </div>

        <button
          onClick={() =>
            setEditingZone({
              id: `zone-${Date.now()}`,
              name: 'منطقة جديدة',
              center_lat: 30.0444,
              center_lng: 31.2357,
              radius_km: 5,
              base_delivery_fee: 15,
              estimated_delivery_mins: 30,
              is_active: true,
            })
          }
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
              <label className="block text-xs font-bold text-slate-700 mb-1">رسوم التوصيل الأساسية (ج.م)</label>
              <input
                type="number"
                value={editingZone.base_delivery_fee || ''}
                onChange={(e) => setEditingZone({ ...editingZone, base_delivery_fee: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوقت التقديري (بالدقيقة)</label>
              <input
                type="number"
                value={editingZone.estimated_delivery_mins || ''}
                onChange={(e) => setEditingZone({ ...editingZone, estimated_delivery_mins: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveZone}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              حفظ المنطقة
            </button>
            <button
              onClick={() => setEditingZone(null)}
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
                {formatCurrency(z.base_delivery_fee)}
              </span>
            </div>

            <p className="text-xs text-slate-500">قطر التغطية: {z.radius_km} كم من المركز</p>
            <p className="text-xs text-slate-500">معدل التوصيل المتوقع: {z.estimated_delivery_mins} دقيقة</p>

            <button
              onClick={() => setEditingZone({ ...z })}
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
