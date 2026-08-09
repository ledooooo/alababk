// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

const env = (import.meta as unknown as { env: Record<string, string> }).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('متغيرات VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY لازم تكون موجودة في .env');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);