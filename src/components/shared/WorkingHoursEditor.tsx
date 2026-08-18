import React from 'react';
import { StoreWorkingHours, WEEK_DAYS, WEEK_DAY_LABELS_AR, WeekDay, getDefaultWorkingHours } from '../../types/domain';
import { Clock, Copy } from 'lucide-react';

interface WorkingHoursEditorProps {
  value: StoreWorkingHours;
  onChange: (value: StoreWorkingHours) => void;
}

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const hours = value || getDefaultWorkingHours();

  const setIs24_7 = (is247: boolean) => {
    onChange({ ...hours, is_24_7: is247 });
  };

  const updateDay = (day: WeekDay, patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    onChange({
      ...hours,
      schedule: {
        ...hours.schedule,
        [day]: { ...hours.schedule[day], ...patch },
      },
    });
  };

  const copyToAllDays = (day: WeekDay) => {
    const source = hours.schedule[day];
    const newSchedule = { ...hours.schedule };
    WEEK_DAYS.forEach((d) => {
      newSchedule[d] = { ...source };
    });
    onChange({ ...hours, schedule: newSchedule });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">يعمل المتجر 24 ساعة يوميًا بلا انقطاع</span>
        </div>
        <button
          type="button"
          onClick={() => setIs24_7(!hours.is_24_7)}
          className={`relative w-11 h-6 rounded-full transition-colors ${hours.is_24_7 ? 'bg-emerald-500' : 'bg-slate-300'}`}
          role="switch"
          aria-checked={hours.is_24_7}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              hours.is_24_7 ? 'translate-x-0.5' : 'translate-x-5'
            }`}
          />
        </button>
      </div>

      {!hours.is_24_7 && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 -mb-1">حدّد مواعيد العمل والعطلات لكل يوم على حدة</p>
          {WEEK_DAYS.map((day) => {
            const d = hours.schedule[day];
            return (
              <div
                key={day}
                className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border ${
                  d.closed ? 'bg-rose-50/50 border-rose-100' : 'bg-white border-slate-200'
                }`}
              >
                <span className="w-16 shrink-0 text-xs font-bold text-slate-700">{WEEK_DAY_LABELS_AR[day]}</span>

                <label className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.closed}
                    onChange={(e) => updateDay(day, { closed: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-rose-600"
                  />
                  عطلة
                </label>

                {!d.closed && (
                  <>
                    <input
                      type="time"
                      value={d.open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] dir-ltr"
                    />
                    <span className="text-slate-400 text-[11px]">إلى</span>
                    <input
                      type="time"
                      value={d.close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] dir-ltr"
                    />
                    <button
                      type="button"
                      onClick={() => copyToAllDays(day)}
                      title="نسخ هذا الموعد لكل الأيام"
                      className="mr-auto p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
