import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale/ar';

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ج.م`;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('+20')) {
    const cleaned = phone.replace('+20', '0');
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

export function formatDateArabic(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'd MMMM yyyy - hh:mm a', { locale: ar });
  } catch {
    return dateString;
  }
}

export const formatDate = formatDateArabic;

export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ar });
  } catch {
    return dateString;
  }
}

// Calculate approximate distance in kilometers between 2 coordinates
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function estimateDeliveryTimeMinutes(distanceKm: number, baseMinutes = 15): number {
  // Assume ~3 mins per km in city traffic + preparation base time
  return Math.max(15, Math.round(baseMinutes + distanceKm * 3.5));
}
