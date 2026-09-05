export type ProductBadgeType = 'none' | 'sale' | 'new' | 'flash_sale' | 'best_seller';

export const PRODUCT_BADGES: Record<Exclude<ProductBadgeType, 'none'>, { label: string; className: string; pulse?: boolean }> = {
  sale: { label: 'عرض توفير', className: 'bg-amber-500 text-white' },
  new: { label: 'جديد', className: 'bg-blue-500 text-white' },
  flash_sale: { label: '⚡ عرض محدود', className: 'bg-rose-600 text-white', pulse: true },
  best_seller: { label: '⭐ الأكثر مبيعًا', className: 'bg-purple-600 text-white' },
};

export const PRODUCT_BADGE_OPTIONS: { value: ProductBadgeType; label: string }[] = [
  { value: 'none', label: 'بدون تاج' },
  { value: 'sale', label: 'عرض توفير' },
  { value: 'new', label: 'جديد' },
  { value: 'flash_sale', label: 'عرض محدود (Flash Sale)' },
  { value: 'best_seller', label: 'الأكثر مبيعًا' },
];

/** يتحقق إن التاج لسه سارٍ (مانتهاش وقته لو محدد badge_expires_at). */
export function isBadgeActive(badgeType?: string | null, badgeExpiresAt?: string | null): boolean {
  if (!badgeType || badgeType === 'none') return false;
  if (badgeExpiresAt && new Date(badgeExpiresAt) < new Date()) return false;
  return true;
}
