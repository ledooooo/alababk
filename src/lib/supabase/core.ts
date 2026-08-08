// src/lib/supabase/core.ts
import { supabase } from './client';
import { ensureUUID, isValidUUID, translateSupabaseError, Result } from './helpers';

/**
 * List records from any table with optional filters, pagination, and sorting
 * (ترجع Result، ولا تبتلع الأخطاء)
 */
export async function listSupabase<T>(
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

/**
 * Get a single record by ID from a table
 */
export async function getSupabaseById<T>(table: string, id: string): Promise<Result<T>> {
  try {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') {
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

/**
 * Create a record in a table
 */
export async function createSupabase<T>(table: string, data: Partial<T>): Promise<T> {
  try {
    const payload = { ...data };
    const currentId = (payload as Record<string, unknown>).id as string | undefined;
    if (!currentId || !isValidUUID(currentId)) {
      (payload as Record<string, unknown>).id = ensureUUID(currentId);
    }
    const { data: created, error } = await supabase.from(table).insert([payload as any]).select('*').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    return created as T;
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

/**
 * Update a record by ID in a table
 */
export async function updateSupabase<T>(table: string, id: string, data: Partial<T>): Promise<T> {
  try {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const { data: updated, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    return updated as T;
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

/**
 * Delete a record by ID from a table
 */
export async function deleteSupabase(table: string, id: string): Promise<void> {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(translateSupabaseError(error).message);
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}