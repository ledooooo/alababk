// src/lib/supabase/errors.ts
import { PostgrestError } from '@supabase/supabase-js';

export type Result<T> =
  | { success: true; data: T; count?: number; fromCache?: boolean }
  | { success: false; error: string; code?: string; details?: string };

export function translateSupabaseError(error: unknown): { message: string; code?: string; details?: string } {
  const pgError = error as PostgrestError;
  if (pgError?.code) {
    switch (pgError.code) {
      case 'PGRST301':
        return { message: 'غير مصرّح به - تأكد من تسجيل الدخول', code: 'unauthorized' };
      case '42501':
        return { message: 'صلاحية غير كافية - هذا الإجراء يحتاج صلاحيات إضافية', code: 'insufficient_permission' };
      case '23503':
        return { message: 'تعارض مع بيانات أخرى - قد يكون المرجع غير موجود', code: 'foreign_key_violation' };
      case '23505':
        return { message: 'بيانات مكررة - هذا العنصر موجود بالفعل', code: 'duplicate' };
      case 'PGRST116':
        return { message: 'العنصر غير موجود', code: 'not_found' };
      default:
        return { message: pgError.message || 'خطأ في قاعدة البيانات', code: pgError.code };
    }
  }
  if (error instanceof Error) {
    return { message: error.message, code: 'unknown' };
  }
  return { message: 'خطأ غير معروف', code: 'unknown' };
}

export function isNotFoundError(error: unknown): boolean {
  const pgError = error as PostgrestError;
  return pgError?.code === 'PGRST116';
}

export function isPermissionError(error: unknown): boolean {
  const pgError = error as PostgrestError;
  return pgError?.code === '42501' || pgError?.code === 'PGRST301';
}