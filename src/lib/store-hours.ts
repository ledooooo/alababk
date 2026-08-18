// src/lib/store-hours.ts
import { Store, StoreWorkingHours, WeekDay, WEEK_DAYS, WEEK_DAY_LABELS_AR } from '../types/domain';

export interface StoreOpenStatus {
  isOpen: boolean;
  /** نص جاهز للعرض للعميل مباشرة، مثل "مفتوح الآن" أو "مغلق الآن - يفتح الساعة 09:00" */
  label: string;
  /** سبب الإغلاق لو مغلق، لتمييز الحالات في الواجهة لو احتجت (إجازة/خارج المواعيد/موقوف) */
  reason?: 'vacation' | 'deactivated' | 'outside_hours' | 'day_off';
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatHoursRange(open: string, close: string): string {
  return `${open} - ${close}`;
}

/**
 * يحسب حالة المتجر الفعلية (مفتوح/مغلق) الآن، بناءً على:
 *  1) وضع الإجازة (is_vacation_mode) — أولوية قصوى.
 *  2) هل المتجر مفعّل أصلًا من الأدمن (is_open).
 *  3) مواعيد العمل الحقيقية (opening_hours) — 24/7 أو جدول أسبوعي.
 * يعتمد على توقيت المتصفح المحلي (وهو المتوقع يكون توقيت القاهرة لغالبية
 * المستخدمين، متسق مع باقي التطبيق اللي مابيعملش أي تحويل timezone صريح).
 */
export function getStoreOpenStatus(store: Store): StoreOpenStatus {
  if (store.is_vacation_mode) {
    return { isOpen: false, label: 'المتجر في إجازة مؤقتة', reason: 'vacation' };
  }
  if (!store.is_open) {
    return { isOpen: false, label: 'المتجر غير متاح حاليًا', reason: 'deactivated' };
  }

  const hours = store.opening_hours;
  if (!hours) {
    // مفيش مواعيد محدَّدة أصلًا — نعتبره مفتوح افتراضيًا بدل ما نمنع
    // الطلب بلا سبب واضح للعميل (سلوك متسق مع القيمة الافتراضية القديمة).
    return { isOpen: true, label: 'مفتوح الآن' };
  }

  if (hours.is_24_7) {
    return { isOpen: true, label: 'مفتوح على مدار الساعة' };
  }

  const now = new Date();
  const dayKey = WEEK_DAYS[now.getDay()] as WeekDay; // getDay(): 0=Sunday...6=Saturday، بنفس ترتيب WEEK_DAYS
  const today = hours.schedule?.[dayKey];

  if (!today || today.closed) {
    return {
      isOpen: false,
      label: `مغلق اليوم (${WEEK_DAY_LABELS_AR[dayKey]}) — عطلة`,
      reason: 'day_off',
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(today.open);
  const closeMinutes = timeToMinutes(today.close);

  // يدعم المواعيد اللي بتعدي منتصف الليل (مثلًا يفتح 18:00 ويقفل 02:00)
  const isWithinHours =
    closeMinutes > openMinutes
      ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
      : nowMinutes >= openMinutes || nowMinutes < closeMinutes;

  if (isWithinHours) {
    return { isOpen: true, label: `مفتوح الآن — يقفل الساعة ${today.close}` };
  }

  return {
    isOpen: false,
    label: `مغلق الآن — مواعيد العمل: ${formatHoursRange(today.open, today.close)}`,
    reason: 'outside_hours',
  };
}
