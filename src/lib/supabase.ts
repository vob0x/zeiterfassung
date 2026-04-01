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

/**
 * Ensure the Supabase session is valid (refresh if expired).
 * Returns true if authenticated, false if no valid session.
 */
export async function ensureValidSession(): Promise<boolean> {
  if (!client) return false
  try {
    const { data: { session } } = await client.auth.getSession()
    if (!session) return false
    // Check if token expires within 60 seconds — proactively refresh
    const expiresAt = session.expires_at || 0
    if (expiresAt * 1000 - Date.now() < 60000) {
      const { data, error } = await client.auth.refreshSession()
      if (error || !data.session) return false
    }
    return true
  } catch {
    return false
  }
}
