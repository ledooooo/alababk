// src/lib/supabase/crud.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';

export async function deleteSupabase(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}

export async function createSupabase<T>(table: string, data: Partial<T>): Promise<T> {
  const payload = { ...data, id: (data as any).id ? ensureUUID((data as any).id) : ensureUUID() };
  const { data: created, error } = await supabase.from(table).insert([payload]).select('*').single();
  if (error) throw new Error(translateSupabaseError(error).message);
  return created as T;
}

export async function updateSupabase<T>(table: string, id: string, data: Partial<T>): Promise<T> {
  const payload = { ...data, updated_at: new Date().toISOString() };
  const { data: updated, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(translateSupabaseError(error).message);
  return updated as T;
}