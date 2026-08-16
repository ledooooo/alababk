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
    is_vacation_mode: s.is_vacation_mode ?? false,
    rating: s.rating_avg != null ? Number(s.rating_avg) : null,
    reviews_count: s.rating_count ? Number(s.rating_count) : 0,
    commission_rate: Number(s.commission_pct ?? 15),
    min_order_amount: Number(s.min_order_amount ?? 0),
    delivery_fee: 0, // لا يوجد عمود ثابت لهذا في الـschema؛ القيمة الفعلية تُحسب وقت الطلب حسب المنطقة
    opening_hours: s.working_hours || { everyday: { open: '08:00', close: '23:00' } },
    created_at: s.created_at || new Date().toISOString(),
  };
}

/**
 * ينظّف نص البحث من رموز بها معنى خاص في صياغة فلاتر PostgREST
 * (الفاصلة والأقواس تكسر تركيب or())، ويهرب رموز ilike الخاصة
 * (% و _) حتى لا يتحول بحث المستخدم لنمط بحث غير مقصود.
 */
function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()]/g, ' ')
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}

export async function fetchSupabaseStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapStoreRow);
}

/**
 * بحث حقيقي من السيرفر بـ ilike (بدل تحميل كل المتاجر وفلترتها في المتصفح).
 * يقتصر على المتاجر المعتمدة والنشطة فقط (نفس ما ترجعه سياسة SELECT العامة).
 */
export async function searchSupabaseStores(term: string, limit = 20): Promise<Store[]> {
  const cleaned = sanitizeSearchTerm(term);
  if (!cleaned) return [];

  const { data, error } = await supabase
    .from('stores')
    .select('*, categories(name)')
    .eq('is_approved', true)
    .eq('is_active', true)
    .or(`name.ilike.%${cleaned}%,description.ilike.%${cleaned}%`)
    .limit(limit);

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

/**
 * جلب متجر واحد بمعرّفه مباشرة (بدل تحميل كل المتاجر والفلترة في
 * المتصفح) — تُستخدم في وضع إدارة الأدمن لمتجر معيّن.
 */
export async function fetchStoreById(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*, categories(name)')
    .eq('id', storeId)
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
    category_id: store.category_id && isValidUUID(store.category_id) ? store.category_id : null,
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
  // is_active محجوز للأدمن فقط (نفس قيد protect_store_admin_fields في الداتابيز:
  // صاحب المتجر ممنوع يفعّل/يوقف محله بشكل دائم بنفسه، لازم يستخدم is_vacation_mode).
  if (store.is_open !== undefined && !options.isSelf) {
    payload.is_active = store.is_open;
  }
  // على عكس is_active، وضع الإجازة مسموح لصاحب المتجر نفسه يغيّره وقت ما يحب
  // (الـtrigger في الداتابيز مش بيقيّد العمود ده خالص).
  if (store.is_vacation_mode !== undefined) {
    payload.is_vacation_mode = store.is_vacation_mode;
  }
  if (store.commission_rate !== undefined && !options.isSelf) {
    payload.commission_pct = store.commission_rate;
  }

  const existing = await supabase.from('stores').select('id').eq('id', validStoreId).maybeSingle();
  let result;
  if (!existing.data) {
    payload.is_approved = false;
    const { data, error } = await supabase.from('stores').insert([payload]).select('*, categories(name)').single();
    if (error) {
      // قيد stores_owner_id_unique (انظر fix_10) هو خط الدفاع الأخير ضد
      // امتلاك أكتر من متجر — نديله رسالة عربية واضحة بدل رسالة قاعدة
      // بيانات تقنية مبهمة لو الفحص الأولي في الواجهة فشل أو اتخطّى.
      if ((error as any).code === '23505' && (error as any).message?.includes('stores_owner_id_unique')) {
        throw new Error('لديك بالفعل متجر مسجل على هذا الحساب — لا يمكن إنشاء أكثر من متجر واحد لكل مستخدم.');
      }
      throw new Error(translateSupabaseError(error).message);
    }
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