// src/lib/supabase/products.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { Product } from '../../types/domain';

export async function fetchSupabaseProducts(storeId?: string): Promise<Product[]> {
  try {
    let query = supabase.from('products').select('*');
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query;
    if (error || !data) throw error || new Error('No data');

    return (data as any[]).map((p) => ({
      id: p.id,
      store_id: p.store_id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      original_price: p.old_price != null ? Number(p.old_price) : undefined,
      category_name: 'عام',
      image_url: p.images?.[0] || '',
      stock: p.stock ?? 0,
      is_active: p.is_active ?? true,
      unit: p.attributes?.unit || 'قطعة',
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

export async function saveSupabaseProduct(product: Partial<Product>): Promise<Product> {
  const validId = ensureUUID(product.id);
  product.id = validId;
  const validStoreId = product.store_id ? ensureUUID(product.store_id) : '';
  if (!validStoreId) throw new Error('المتجر غير محدد للمنتج');

  const payload: Record<string, any> = {
    id: validId,
    store_id: validStoreId,
    name: product.name || 'منتج جديد',
    slug: (product.name || 'prod').toLowerCase().replace(/\s+/g, '-') + '-' + validId.slice(0, 4),
    description: product.description || '',
    price: product.price || 0,
    old_price: product.original_price ?? null,
    stock: product.stock ?? 0,
    images: product.image_url ? [product.image_url] : [],
    is_active: product.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw new Error(translateSupabaseError(error).message);

  const p = data as any;
  return {
    id: p.id,
    store_id: p.store_id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    original_price: p.old_price ? Number(p.old_price) : undefined,
    category_name: product.category_name || 'عام',
    image_url: p.images?.[0] || '',
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    unit: product.unit || 'قطعة',
    created_at: p.created_at || new Date().toISOString(),
  };
}

export async function deleteSupabaseProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}