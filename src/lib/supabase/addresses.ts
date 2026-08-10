// src/lib/supabase/addresses.ts
import { supabase } from './client';
import { ensureUUID, extractCoordinates, translateSupabaseError } from './helpers';
import { CustomerAddress } from '../../types/domain';

export function addressToRow(address: CustomerAddress): Record<string, any> {
  return {
    id: address.id || ensureUUID(),
    user_id: address.user_id,
    label: address.title || 'عنوان',
    street: address.address_line || address.street || '',
    building: address.building || null,
    floor: address.floor || null,
    apartment: address.apartment || null,
    notes: address.notes || null,
    is_default: address.is_default ?? false,
    updated_at: new Date().toISOString(),
  };
}

export function rowToAddress(row: any): CustomerAddress {
  // upsert_address_secure() يرجّع jsonb بحقلي lat/lng مباشرة،
  // بينما select * from addresses يرجّع عمود location (PostGIS geography).
  // نتعامل مع الشكلين هنا حتى لا تضيع الإحداثيات بعد الحفظ عبر الـRPC.
  let lat: number | null = typeof row.lat === 'number' ? row.lat : null;
  let lng: number | null = typeof row.lng === 'number' ? row.lng : null;
  if ((lat == null || lng == null) && row.location) {
    const coords = extractCoordinates(row.location);
    lat = coords?.lat ?? null;
    lng = coords?.lng ?? null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.label,
    address_line: row.street,
    street: row.street,
    building: row.building,
    floor: row.floor,
    apartment: row.apartment,
    notes: row.notes,
    lat,
    lng,
    is_default: row.is_default ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function upsertAddress(address: CustomerAddress): Promise<CustomerAddress> {
  if (!address.user_id) throw new Error('يجب تحديد المستخدم صاحب العنوان');
  if (address.lat == null || address.lng == null) throw new Error('يجب توفير إحداثيات الموقع (lat/lng)');
  if (!address.title || !address.address_line) throw new Error('يجب توفير اسم العنوان والشارع');

  const { data, error } = await supabase.rpc('upsert_address_secure', {
    p_id: address.id || null,
    p_label: address.title,
    p_street: address.address_line,
    p_building: address.building || null,
    p_floor: address.floor || null,
    p_apartment: address.apartment || null,
    p_notes: address.notes || null,
    p_lat: address.lat,
    p_lng: address.lng,
    p_is_default: address.is_default ?? false,
  });

  if (error) {
    const translated = translateSupabaseError(error);
    throw new Error(translated.message);
  }
  return rowToAddress(data);
}

export async function fetchAddresses(userId: string): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    const translated = translateSupabaseError(error);
    throw new Error(translated.message);
  }
  return (data || []).map(rowToAddress);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) {
    const translated = translateSupabaseError(error);
    throw new Error(translated.message);
  }
}