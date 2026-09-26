import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Lazy initialization for Supabase client.
 * Returns null if Supabase environment variables are not configured,
 * ensuring the application runs smoothly on local/Cloud Run/Vercel without crashing.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const supabaseUrl =
    metaEnv?.VITE_SUPABASE_URL ||
    procEnv?.VITE_SUPABASE_URL ||
    procEnv?.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    metaEnv?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseClient;
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

/**
 * Attempt to load database from Supabase if configured
 */
export async function fetchDatabaseFromSupabase(): Promise<any | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('siakad_storage')
      .select('data')
      .eq('id', 'main_database')
      .maybeSingle();
    if (!error && data?.data) {
      return data.data;
    }
  } catch (e) {
    console.warn('Supabase fetch note:', e);
  }
  return null;
}

/**
 * Attempt to persist database to Supabase if configured
 */
export async function saveDatabaseToSupabase(dbPayload: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client
      .from('siakad_storage')
      .upsert({ id: 'main_database', data: dbPayload, updated_at: new Date().toISOString() });
    return !error;
  } catch (e) {
    console.warn('Supabase save note:', e);
    return false;
  }
}

