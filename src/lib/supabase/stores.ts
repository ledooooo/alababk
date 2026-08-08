// src/lib/supabase/stores.ts
import { supabase } from './client';
import { ensureUUID, isValidUUID, extractCoordinates, translateSupabaseError } from './helpers';
import { Store } from '../../types/domain';

export function mapStoreRow(s: any): Store {
  const coords = extractCoordinates(s.location || s);
  return {
    id: s.id,
    name: s.name,
    slug: s.slug || s.name,
    owner_id: s.owner_id,
    category_id: s.category_id || '',
    category_name: s.categories?.name || 'عام',
    description: s.description || '',
    logo_url: s.logo_url || '',
    banner_url: s.cover_url || null,
    address: s.address || '',
    lat: coords ? coords.lat : null,
    lng: coords ? coords.lng : null,
    phone: s.phone || '',
    is_approved: s.is_approved ?? false,
    is_open: s.is_active ?? false,
    rating: s.rating_avg != null ? Number(s.rating_avg) : null,
    reviews_count: s.rating_count ? Number(s.rating_count) : 0,
    commission_rate: Number(s.commission_pct ?? 15),
    min_order_amount: Number(s.min_order_amount ?? 0),
    opening_hours: s.working_hours || { everyday: { open: '08:00', close: '23:00' } },
    created_at: s.created_at || new Date().toISOString(),
  };
}

export async function fetchSupabaseStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapStoreRow);
}

export async function fetchMyStore(): Promise<Store | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('stores')
    .select('*, categories(name)')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) throw new Error(translateSupabaseError(error).message);
  return data ? mapStoreRow(data) : null;
}

export interface SaveStoreOptions {
  isSelf?: boolean;
}

export async function saveSupabaseStore(store: Partial<Store>, options: SaveStoreOptions = {}): Promise<Store> {
  const validStoreId = ensureUUID(store.id);
  store.id = validStoreId;

  let ownerId = store.owner_id && isValidUUID(store.owner_id) ? store.owner_id : '';
  if (!ownerId && options.isSelf) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) ownerId = authData.user.id;
  }
  if (!ownerId || !isValidUUID(ownerId)) {
    throw new Error('مُعرّف مالك المتجر مفقود أو غير صالح');
  }

  const payload: Record<string, any> = {
    id: validStoreId,
    owner_id: ownerId,
    name: store.name || 'متجر جديد',
    slug: store.slug || (store.name || 'store').toLowerCase().replace(/\s+/g, '-') + '-' + validStoreId.slice(0, 4),
    description: store.description || '',
    phone: store.phone ?? undefined,
    address: store.address ?? undefined,
    logo_url: store.logo_url ?? null,
    cover_url: store.banner_url ?? null,
    min_order_amount: store.min_order_amount ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (store.is_approved !== undefined && !options.isSelf) {
    payload.is_approved = store.is_approved;
  }
  if (store.commission_rate !== undefined && !options.isSelf) {
    payload.commission_pct = store.commission_rate;
  }

  const existing = await supabase.from('stores').select('id').eq('id', validStoreId).maybeSingle();
  let result;
  if (!existing.data) {
    payload.is_approved = false;
    const { data, error } = await supabase.from('stores').insert([payload]).select('*, categories(name)').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    result = data;
  } else {
    const { data, error } = await supabase.from('stores').update(payload).eq('id', validStoreId).select('*, categories(name)').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    result = data;
  }
  return mapStoreRow(result);
}

export async function deleteSupabaseStore(id: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}