// src/lib/supabase/helpers.ts
import { supabase } from './client';
import { translateSupabaseError, isNotFoundError, isPermissionError, Result } from './errors';

export function isValidUUID(id?: string): boolean {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function ensureUUID(id?: string): string {
  if (id && isValidUUID(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function extractCoordinates(locationObj: any): { lat: number; lng: number } | null {
  if (!locationObj) return null;
  try {
    if (typeof locationObj === 'object') {
      if (Array.isArray(locationObj.coordinates) && locationObj.coordinates.length >= 2) {
        const lng = Number(locationObj.coordinates[0]);
        const lat = Number(locationObj.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng };
      }
      const directLat = Number(locationObj.lat ?? locationObj.latitude ?? locationObj.store_lat);
      const directLng = Number(locationObj.lng ?? locationObj.longitude ?? locationObj.store_lng);
      if (!isNaN(directLat) && !isNaN(directLng) && (directLat !== 0 || directLng !== 0)) {
        return { lat: directLat, lng: directLng };
      }
    }
    if (typeof locationObj === 'string') {
      const trimmed = locationObj.trim();
      if (trimmed.includes('POINT')) {
        const match = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match && match[1] && match[2]) {
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// أعد تصدير دوال الأخطاء
export { translateSupabaseError, isNotFoundError, isPermissionError } from './errors';

// دوال مساعدة للجلب الآمن (بدون CRUD)
export async function listSupabaseSafe<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
): Promise<Result<T[]>> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact' });
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query = query.eq(key, value);
      });
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    if (options?.limit !== undefined) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }
    const { data, count, error } = await query;
    if (error) {
      const translated = translateSupabaseError(error);
      return { success: false, error: translated.message, code: translated.code };
    }
    return { success: true, data: (data as T[]) || [], count: count || 0 };
  } catch (err) {
    const translated = translateSupabaseError(err);
    return { success: false, error: translated.message, code: translated.code };
  }
}

export async function getSupabaseByIdSafe<T>(table: string, id: string): Promise<Result<T>> {
  try {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
      if (isNotFoundError(error)) {
        return { success: false, error: 'العنصر غير موجود', code: 'not_found' };
      }
      const translated = translateSupabaseError(error);
      return { success: false, error: translated.message, code: translated.code };
    }
    return { success: true, data: data as T };
  } catch (err) {
    const translated = translateSupabaseError(err);
    return { success: false, error: translated.message, code: translated.code };
  }
}