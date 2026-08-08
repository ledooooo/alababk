// src/lib/supabase/categories.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';
import { Category } from '../../types/domain';

export async function fetchSupabaseCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon || '📦',
    sort_order: c.sort_order || 0,
  }));
}