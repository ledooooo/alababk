// src/lib/supabase/products.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { Product } from '../../types/domain';

function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()]/g, ' ')
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}

/**
 * بحث حقيقي من السيرفر بـ ilike على اسم/وصف المنتج، مقتصر على المنتجات
 * النشطة في متاجر معتمدة ونشطة (زي ما بترجع سياسة SELECT العامة بالظبط).
 */
export async function searchSupabaseProducts(term: string, limit = 20): Promise<Product[]> {
  const cleaned = sanitizeSearchTerm(term);
  if (!cleaned) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name), stores!inner(is_approved, is_active, is_vacation_mode)')
    .eq('is_active', true)
    .eq('stores.is_approved', true)
    .eq('stores.is_active', true)
    .eq('stores.is_vacation_mode', false)
    .or(`name.ilike.%${cleaned}%,description.ilike.%${cleaned}%`)
    .limit(limit);

  if (error) throw new Error(translateSupabaseError(error).message);

  return (data as any[]).map((p) => ({
    id: p.id,
    store_id: p.store_id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    original_price: p.old_price != null ? Number(p.old_price) : undefined,
    category_id: p.category_id || undefined,
    category_name: p.categories?.name || 'عام',
    image_url: p.images?.[0] || '',
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    is_returnable: p.is_returnable ?? false,
    min_order_quantity: p.min_order_quantity ?? 1,
    unit: p.attributes?.unit || 'قطعة',
    created_at: p.created_at || new Date().toISOString(),
  }));
}

export async function fetchSupabaseProducts(storeId?: string): Promise<Product[]> {
  try {
    let query = supabase.from('products').select('*, categories(name)');
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
      category_id: p.category_id || undefined,
      category_name: p.categories?.name || 'عام',
      image_url: p.images?.[0] || '',
      stock: p.stock ?? 0,
      saved_stock: p.saved_stock ?? null,
      is_active: p.is_active ?? true,
      is_returnable: p.is_returnable ?? false,
      min_order_quantity: p.min_order_quantity ?? 1,
      unit: p.attributes?.unit || 'قطعة',
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

/**
 * كل منتجات المنصة عبر كل المتاجر، مع اسم المتجر — تُستخدم في لوحة
 * الأدمن (AdminProductsView) لإدارة المنتجات على مستوى المنصة كلها،
 * بخلاف fetchSupabaseProducts(storeId) اللي بترجع منتجات متجر واحد بس.
 */
export async function fetchAllSupabaseProductsWithStore(limit = 1000): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name), stores(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(translateSupabaseError(error).message);

  return (data as any[]).map((p) => ({
    id: p.id,
    store_id: p.store_id,
    store_name: p.stores?.name || 'متجر محذوف',
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    original_price: p.old_price != null ? Number(p.old_price) : undefined,
    category_id: p.category_id || undefined,
    category_name: p.categories?.name || 'عام',
    image_url: p.images?.[0] || '',
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    is_returnable: p.is_returnable ?? false,
    min_order_quantity: p.min_order_quantity ?? 1,
    unit: p.attributes?.unit || 'قطعة',
    created_at: p.created_at || new Date().toISOString(),
  }));
}

export async function saveSupabaseProduct(product: Partial<Product>): Promise<Product> {
  const validId = ensureUUID(product.id);
  product.id = validId;
  const validStoreId = product.store_id ? ensureUUID(product.store_id) : '';
  if (!validStoreId) throw new Error('المتجر غير محدد للمنتج');

  const payload: Record<string, any> = {
    id: validId,
    store_id: validStoreId,
    category_id: product.category_id || null,
    name: product.name || 'منتج جديد',
    slug: (product.name || 'prod').toLowerCase().replace(/\s+/g, '-') + '-' + validId.slice(0, 4),
    description: product.description || '',
    price: product.price || 0,
    old_price: product.original_price ?? null,
    stock: product.stock ?? 0,
    saved_stock: product.saved_stock ?? null,
    images: product.image_url ? [product.image_url] : [],
    is_active: product.is_active ?? true,
    is_returnable: product.is_returnable ?? false,
    min_order_quantity: product.min_order_quantity && product.min_order_quantity >= 1 ? Math.floor(product.min_order_quantity) : 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select('*, categories(name), stores(name)').single();
  if (error) throw new Error(translateSupabaseError(error).message);

  const p = data as any;
  return {
    id: p.id,
    store_id: p.store_id,
    store_name: p.stores?.name || product.store_name,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    original_price: p.old_price ? Number(p.old_price) : undefined,
    category_id: p.category_id || undefined,
    category_name: p.categories?.name || product.category_name || 'عام',
    image_url: p.images?.[0] || '',
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    is_returnable: p.is_returnable ?? false,
    min_order_quantity: p.min_order_quantity ?? 1,
    unit: product.unit || 'قطعة',
    created_at: p.created_at || new Date().toISOString(),
  };
}

export async function deleteSupabaseProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}