import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let client: SupabaseClient | null = null

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'zeiterfassung_auth',
    },
  })
} else {
  console.warn('Supabase credentials missing – running in offline/local mode')
}

export const supabaseClient = client

/**
 * Check if Supabase is available and connected
 */
export function isSupabaseAvailable(): boolean {
  return client !== null
}
