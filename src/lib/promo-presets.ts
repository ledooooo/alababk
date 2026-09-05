import React from 'react';
import { Gift, Store as StoreIcon, Flame, Percent, Tag, Clock, Sparkles } from 'lucide-react';

export type PromoTheme = 'emerald' | 'blue' | 'rose' | 'teal' | 'amber' | 'purple';
export type PromoIconKey = 'gift' | 'store' | 'flame' | 'percent' | 'tag' | 'clock' | 'sparkles';

export const PROMO_THEMES: Record<PromoTheme, { label: string; bgGradient: string; badgeBg: string; iconColor: string }> = {
  emerald: { label: 'أخضر زمردي', bgGradient: 'from-emerald-950 via-emerald-900 to-teal-900', badgeBg: 'bg-amber-400 text-slate-950', iconColor: 'text-amber-300' },
  blue: { label: 'أزرق كحلي', bgGradient: 'from-blue-950 via-indigo-900 to-slate-900', badgeBg: 'bg-blue-500 text-white', iconColor: 'text-blue-300' },
  rose: { label: 'وردي بنفسجي', bgGradient: 'from-rose-950 via-purple-900 to-slate-900', badgeBg: 'bg-rose-500 text-white', iconColor: 'text-rose-400' },
  teal: { label: 'تركواز', bgGradient: 'from-teal-950 via-emerald-900 to-slate-900', badgeBg: 'bg-teal-400 text-slate-950', iconColor: 'text-teal-300' },
  amber: { label: 'كهرماني دافئ', bgGradient: 'from-amber-950 via-orange-900 to-slate-900', badgeBg: 'bg-amber-400 text-slate-950', iconColor: 'text-amber-300' },
  purple: { label: 'بنفسجي', bgGradient: 'from-purple-950 via-violet-900 to-slate-900', badgeBg: 'bg-purple-500 text-white', iconColor: 'text-purple-300' },
};

export const PROMO_ICONS: Record<PromoIconKey, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  gift: { label: 'هدية', Icon: Gift },
  store: { label: 'متجر', Icon: StoreIcon },
  flame: { label: 'عرض ساخن', Icon: Flame },
  percent: { label: 'نسبة خصم', Icon: Percent },
  tag: { label: 'وسم سعر', Icon: Tag },
  clock: { label: 'وقت محدود', Icon: Clock },
  sparkles: { label: 'بريق عام', Icon: Sparkles },
};

export const PROMO_ACTION_TYPES: { value: string; label: string }[] = [
  { value: 'stores', label: 'الذهاب لكل المتاجر' },
  { value: 'store_detail', label: 'الذهاب لمتجر معيّن' },
  { value: 'category', label: 'الذهاب لتصنيف معيّن' },
  { value: 'external_url', label: 'رابط خارجي' },
];
