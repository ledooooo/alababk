// src/lib/supabase/auth.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';
import { UserProfile, UserRole } from '../../types/domain';

export interface SaveUserOptions {
  isSelf?: boolean;
  isAdministrative?: boolean;
  callerRole?: UserRole | string;
}

/**
 * Save / Update User profile in Supabase database
 * - Uses UPDATE instead of UPSERT because RLS policies restrict INSERT on profiles
 * - Profiles are created automatically via handle_new_user trigger on auth.users
 */
export async function saveSupabaseUser(user: Partial<UserProfile>, options: SaveUserOptions = {}) {
  try {
    let validId = user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : '';

    if (!validId) {
      if (options.isSelf) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authData.user.id)) {
            validId = authData.user.id;
          }
        } catch {
          // Ignore auth check errors
        }
      }
    }

    if (!validId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validId)) {
      throw new Error('مُعرّف المستخدم (user.id) مفقود أو ليس UUID صالحاً');
    }

    user.id = validId;

    const userName = user.name || (user as any).full_name || 'مستخدم';
    const isAdmin = options.isAdministrative || options.callerRole === 'admin';

    // بناء payload للتحديث
    const payload: Record<string, any> = {
      full_name: userName,
      updated_at: new Date().toISOString(),
    };

    if (user.phone !== undefined) {
      payload.phone = user.phone?.trim() || null;
    }

    if (user.avatar_url !== undefined) {
      payload.avatar_url = user.avatar_url || null;
    }

    if (user.is_active !== undefined) {
      payload.is_active = user.is_active;
    }

    if (user.role && isAdmin) {
      payload.role = user.role;
    }

    if (options.isSelf) {
      delete payload.role;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', validId)
      .select('*');

    if (error) {
      let msg = error.message || 'فشل تحديث بيانات المستخدم';
      msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
      throw new Error(msg);
    }

    if (!data || data.length === 0) {
      throw new Error('لم يتم العثور على الملف الشخصي للمستخدم. قد يكون الحساب غير مكتمل، يرجى الاتصال بالدعم.');
    }

    return data[0];
  } catch (err) {
    console.warn('Sync profile info error:', err);
    throw err;
  }
}

/**
 * Fetch Users / Profiles from Supabase database
 */
export async function fetchSupabaseUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data && data.length > 0) {
      return (data as any[]).map((u) => ({
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
  } catch {
    // fallback
  }
  return [];
}

/**
 * Verify phone & password via secure RPC (does not return email)
 */
export async function verifyPhonePassword(phone: string, password: string): Promise<{ userId: string | null; error?: string }> {
  const { data, error } = await supabase.rpc('verify_phone_password_internal', {
    p_phone: phone,
    p_password: password,
  });
  if (error) {
    const translated = translateSupabaseError(error);
    return { userId: null, error: translated.message };
  }
  return { userId: data as string | null };
}