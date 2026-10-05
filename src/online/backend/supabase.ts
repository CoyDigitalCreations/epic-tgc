import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

/** Cliente Supabase singleton. Null si faltan env vars (modo local vs bot). */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

export function supabaseConfigurado(): boolean {
  return Boolean(url && anonKey)
}

/** URL del proyecto (para logs / debug). */
export function supabaseUrl(): string {
  return url ?? '(sin configurar)'
}
