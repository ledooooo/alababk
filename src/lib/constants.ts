import { Category, DeliveryZone } from '../types/domain';

export const APP_NAME = 'جِهَات';
export const APP_SLOGAN = 'منصة التوصيل المحلي لمتاجر منطقتك';

export const DEFAULT_LAT = 30.0444;
export const DEFAULT_LNG = 31.2357;

export const EGYPT_DEFAULT_ZONES: DeliveryZone[] = [
  {
    id: 'zone-1',
    name: 'المعادي وشارع 9',
    fee: 15,
    eta_minutes: 25,
    is_active: true,
    polygon: [
      [30.050, 31.230],
      [30.050, 31.260],
      [30.030, 31.260],
      [30.030, 31.230],
    ],
  },
  {
    id: 'zone-2',
    name: 'مدينة نصر ومكرم عبيد',
    fee: 20,
    eta_minutes: 35,
    is_active: true,
    polygon: [
      [30.080, 31.320],
      [30.080, 31.370],
      [30.040, 31.370],
      [30.040, 31.320],
    ],
  },
  {
    id: 'zone-3',
    name: 'الزمالك والمهندسين',
    fee: 18,
    eta_minutes: 30,
    is_active: true,
    polygon: [
      [30.070, 31.210],
      [30.070, 31.240],
      [30.040, 31.240],
      [30.040, 31.210],
    ],
  },
  {
    id: 'zone-4',
    name: 'مصر الجديدة والتجمع',
    fee: 25,
    eta_minutes: 40,
    is_active: true,
    polygon: [
      [30.110, 31.320],
      [30.110, 31.380],
      [30.070, 31.380],
      [30.070, 31.320],
    ],
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-grocery', name: 'بقالة وسوبرماركت', slug: 'grocery', icon: '🛒', sort_order: 1 },
  { id: 'cat-veg', name: 'خضار وفاكهة طازجة', slug: 'vegetables', icon: '🥬', sort_order: 2 },
  { id: 'cat-dairy', name: 'ألبان وأجبان', slug: 'dairy', icon: '🥛', sort_order: 3 },
  { id: 'cat-meat', name: 'لحوم ودواجن', slug: 'meat', icon: '🍗', sort_order: 4 },
  { id: 'cat-bakery', name: 'مخبوزات وحلويات', slug: 'bakery', icon: '🍞', sort_order: 5 },
  { id: 'cat-pharmacy', name: 'صيدلية وعناية', slug: 'pharmacy', icon: '💊', sort_order: 6 },
  { id: 'cat-beverages', name: 'مشروبات ومياه', slug: 'beverages', icon: '🥤', sort_order: 7 },
];

export const ORDER_STATUS_LABELS: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: 'في انتظار قبول المتجر', bg: 'bg-amber-100', text: 'text-amber-800', icon: 'Clock' },
  accepted: { label: 'تم قبول الطلب', bg: 'bg-blue-100', text: 'text-blue-800', icon: 'CheckCircle2' },
  preparing: { label: 'جاري تحضير الطلب', bg: 'bg-purple-100', text: 'text-purple-800', icon: 'ChefHat' },
  ready: { label: 'جاهز للاستلام والتوصيل', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: 'PackageCheck' },
  assigned: { label: 'تم تعيين مندوب التوصيل', bg: 'bg-sky-100', text: 'text-sky-800', icon: 'Bike' },
  picked_up: { label: 'تم الاستلام من المتجر', bg: 'bg-teal-100', text: 'text-teal-800', icon: 'ShoppingBag' },
  on_the_way: { label: 'مندوب التوصيل في الطريق إليك', bg: 'bg-orange-100', text: 'text-orange-800', icon: 'Truck' },
  delivered: { label: 'تم التسليم بنجاح', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: 'CheckCircle' },
  rejected: { label: 'اعتذر المتجر عن الطلب', bg: 'bg-rose-100', text: 'text-rose-800', icon: 'XCircle' },
  cancelled: { label: 'ملغي', bg: 'bg-slate-100', text: 'text-slate-800', icon: 'Ban' },
};
