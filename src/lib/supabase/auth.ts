// src/lib/supabase/auth.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

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