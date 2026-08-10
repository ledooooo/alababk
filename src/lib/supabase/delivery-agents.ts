// src/lib/supabase/delivery-agents.ts
import { supabase } from './client';
import { ensureUUID, isValidUUID, extractCoordinates, translateSupabaseError } from './helpers';
import { DeliveryAgent } from '../../types/domain';

export async function fetchSupabaseAgents(): Promise<DeliveryAgent[]> {
  const { data, error } = await supabase
    .from('delivery_agents')
    // ملاحظة: لا توجد أي علاقة بين delivery_agents و delivery_zones في الـschema
    // الحالي (لا عمود zone_id ولا أي FK)، لذا لا يمكن تضمينها هنا. المنطقة
    // النشطة تُشتق فقط من current_location الجغرافي إن توفر لاحقًا.
    .select('*, profiles(full_name, phone, avatar_url)');

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((a: any) => {
    const zoneName = a.active_zone || a.zone || null;
    const coords = extractCoordinates(a.current_location || a);
    return {
      id: a.id,
      user_id: a.user_id,
      name: a.profiles?.full_name || 'كابتن توصيل',
      phone: a.profiles?.phone || null,
      avatar_url: a.profiles?.avatar_url || null,
      vehicle_type: a.vehicle_type === 'motorcycle' ? 'motorcycle' : (a.vehicle_type === 'car' ? 'car' : (a.vehicle_type === 'walking' ? 'walking' : 'bicycle')),
      license_plate: a.plate_number || null,
      national_id: a.id_number || null,
      is_approved: a.is_approved ?? false,
      is_online: a.is_online ?? false,
      active_zone: zoneName,
      rating: a.rating_avg != null ? Number(a.rating_avg) : null,
      total_trips: a.total_deliveries != null ? Number(a.total_deliveries) : 0,
      current_lat: coords ? coords.lat : null,
      current_lng: coords ? coords.lng : null,
      created_at: a.created_at || new Date().toISOString(),
    };
  });
}

export interface SaveAgentOptions {
  isSelf?: boolean;
  isAdministrative?: boolean;
  callerRole?: string;
}

export async function saveSupabaseAgent(agent: Partial<DeliveryAgent>, options: SaveAgentOptions = {}): Promise<DeliveryAgent> {
  const validAgentId = ensureUUID(agent.id);
  agent.id = validAgentId;

  let userId = agent.user_id && isValidUUID(agent.user_id) ? agent.user_id : '';
  if (!userId && options.isSelf) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) userId = authData.user.id;
  }
  if (!userId || !isValidUUID(userId)) throw new Error('مُعرّف المستخدم مفقود أو غير صالح');

  const isAdminOrSupervisor = options.isAdministrative || options.callerRole === 'admin' || options.callerRole === 'delivery_supervisor';

  const vehicleMap: Record<string, string> = {
    motorcycle: 'motorcycle',
    bicycle: 'bicycle',
    car: 'car',
    walking: 'walking',
  };
  if (agent.vehicle_type && !vehicleMap[agent.vehicle_type]) {
    throw new Error(`نوع المركبة "${agent.vehicle_type}" غير مدعوم. الأنواع المسموحة: motorcycle, bicycle, car, walking`);
  }

  const payload: Record<string, any> = {
    id: validAgentId,
    user_id: userId,
    vehicle_type: vehicleMap[agent.vehicle_type || 'motorcycle'],
    plate_number: agent.license_plate || null,
    id_number: agent.national_id || null,
    is_online: agent.is_online ?? false,
    updated_at: new Date().toISOString(),
  };

  if (isAdminOrSupervisor) {
    if ((agent as any).is_active !== undefined) payload.is_active = (agent as any).is_active;
    else payload.is_active = true;
    if (agent.is_approved !== undefined) payload.is_approved = agent.is_approved;
  }

  const existing = await supabase.from('delivery_agents').select('id').eq('id', validAgentId).maybeSingle();
  let result;
  if (!existing.data) {
    payload.is_approved = false;
    const { data, error } = await supabase.from('delivery_agents').insert([payload]).select('*, profiles(full_name, phone, avatar_url)').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    result = data;
  } else {
    const { data, error } = await supabase.from('delivery_agents').update(payload).eq('id', validAgentId).select('*, profiles(full_name, phone, avatar_url)').single();
    if (error) throw new Error(translateSupabaseError(error).message);
    result = data;
  }

  return {
    id: result.id,
    user_id: result.user_id,
    name: result.profiles?.full_name || agent.name || 'كابتن توصيل',
    phone: result.profiles?.phone || agent.phone || null,
    avatar_url: result.profiles?.avatar_url || agent.avatar_url || null,
    vehicle_type: result.vehicle_type === 'motorcycle' ? 'motorcycle' : (result.vehicle_type === 'car' ? 'car' : (result.vehicle_type === 'walking' ? 'walking' : 'bicycle')),
    license_plate: result.plate_number || null,
    national_id: result.id_number || null,
    is_approved: result.is_approved ?? false,
    is_online: result.is_online ?? false,
    active_zone: agent.active_zone || null,
    rating: result.rating_avg != null ? Number(result.rating_avg) : null,
    total_trips: result.total_deliveries != null ? Number(result.total_deliveries) : 0,
    current_lat: null,
    current_lng: null,
    created_at: result.created_at || new Date().toISOString(),
  };
}

export async function deleteSupabaseAgent(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_agents').delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}