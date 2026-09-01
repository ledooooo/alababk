import { Category, DeliveryZone } from '../types/domain';

export const APP_NAME = 'وياك';
export const APP_SLOGAN = 'منصة التوصيل المحلي لمتاجر منطقتك';

export const DEFAULT_LAT = 30.0444;
export const DEFAULT_LNG = 31.2357;

export const EGYPT_DEFAULT_ZONES: DeliveryZone[] = [
  {
    id: 'd1111111-1111-4111-8111-111111111111',
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
    id: 'd2222222-2222-4222-8222-222222222222',
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
    id: 'd3333333-3333-4333-8333-333333333333',
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
    id: 'd4444444-4444-4444-8444-444444444444',
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
  { id: 'c1000000-0000-4000-8000-000000000001', name: 'بقالة وسوبرماركت', slug: 'grocery', icon: '🛒', sort_order: 1 },
  { id: 'c1000000-0000-4000-8000-000000000002', name: 'خضار وفاكهة طازجة', slug: 'vegetables', icon: '🥬', sort_order: 2 },
  { id: 'c1000000-0000-4000-8000-000000000003', name: 'ألبان وأجبان', slug: 'dairy', icon: '🥛', sort_order: 3 },
  { id: 'c1000000-0000-4000-8000-000000000004', name: 'لحوم ودواجن', slug: 'meat', icon: '🍗', sort_order: 4 },
  { id: 'c1000000-0000-4000-8000-000000000005', name: 'مخبوزات وحلويات', slug: 'bakery', icon: '🍞', sort_order: 5 },
  { id: 'c1000000-0000-4000-8000-000000000006', name: 'صيدلية وعناية', slug: 'pharmacy', icon: '💊', sort_order: 6 },
  { id: 'c1000000-0000-4000-8000-000000000007', name: 'مشروبات ومياه', slug: 'beverages', icon: '🥤', sort_order: 7 },
];

export const DEFAULT_STATUS_LABEL = { label: 'في انتظار قبول المتجر', bg: 'bg-amber-100', text: 'text-amber-800', icon: 'Clock' };

export const ORDER_STATUS_LABELS: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: DEFAULT_STATUS_LABEL,
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

export function getOrderStatusConfig(status: string) {
  return ORDER_STATUS_LABELS[status] ?? DEFAULT_STATUS_LABEL;
}
