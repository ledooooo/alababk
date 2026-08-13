// src/lib/supabase/users.ts
import { supabase } from './client';
import { isValidUUID, translateSupabaseError } from './helpers';
import { UserProfile, UserRole } from '../../types/domain';

export async function fetchSupabaseUsers(limit = 1000): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((u: any) => ({
    id: u.id,
    email: u.email || '',
    name: u.full_name || u.name || 'مستخدم',
    phone: u.phone || '',
    role: (u.role as UserRole) || 'customer',
    avatar_url: u.avatar_url,
    is_active: u.is_active ?? true,
    created_at: u.created_at || new Date().toISOString(),
  }));
}

export interface SaveUserOptions {
  isSelf?: boolean;
  isAdministrative?: boolean;
  callerRole?: UserRole | string;
}

export async function saveSupabaseUser(user: Partial<UserProfile>, options: SaveUserOptions = {}): Promise<UserProfile> {
  let validId = user.id && isValidUUID(user.id) ? user.id : '';
  if (!validId && options.isSelf) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      validId = authData.user.id;
    }
  }
  if (!validId || !isValidUUID(validId)) {
    throw new Error('مُعرّف المستخدم مفقود أو غير صالح');
  }

  const isAdmin = options.isAdministrative || options.callerRole === 'admin';
  const payload: Record<string, any> = {
    full_name: user.name || user.full_name || 'مستخدم',
    updated_at: new Date().toISOString(),
  };
  if (user.phone !== undefined) payload.phone = user.phone?.trim() || null;
  if (user.avatar_url !== undefined) payload.avatar_url = user.avatar_url || null;
  if (user.is_active !== undefined) payload.is_active = user.is_active;
  if (user.role && isAdmin) payload.role = user.role;
  if (options.isSelf) delete payload.role;

  const { data, error } = await supabase.from('profiles').update(payload).eq('id', validId).select('*');
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data || data.length === 0) throw new Error('لم يتم العثور على الملف الشخصي');

  const u = data[0];
  return {
    id: u.id,
    email: u.email || '',
    name: u.full_name || u.name || 'مستخدم',
    phone: u.phone || '',
    role: (u.role as UserRole) || 'customer',
    avatar_url: u.avatar_url,
    is_active: u.is_active ?? true,
    created_at: u.created_at || new Date().toISOString(),
  };
}