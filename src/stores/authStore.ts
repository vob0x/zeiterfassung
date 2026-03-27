import { create } from 'zustand'
import { supabaseClient, isSupabaseAvailable } from '@/lib/supabase'
import { deriveEncryptionKey, clearEncryptionKey, hasEncryptionKey, clearTeamKey } from '@/lib/crypto'
import { migrateUserData, clearAllUserData } from '@/lib/userStorage'
import type { Profile, Session } from '@/types'

interface AuthState {
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  needsPassword: boolean // Session exists but encryption key missing (e.g. new device / tab closed)
  signIn: (codename: string, password: string) => Promise<void>
  signUp: (codename: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
  unlockWithPassword: (password: string) => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
}

// Pseudonymous email: codename@zeiterfassung.local
function codeToEmail(codename: string): string {
  return `${codename.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}@zeiterfassung.local`
}

// Deterministic local user ID based on codename (stable across sessions)
function localUserId(codename: string): string {
  return `local_${codename.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  session: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  needsPassword: false,

  initializeAuth: async () => {
    set({ loading: true })
    try {
      if (isSupabaseAvailable() && supabaseClient) {
        // Check existing Supabase session
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.user) {
          // Fetch profile
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          const rawCodename = session.user.user_metadata?.codename || 'User'
          let profile: Profile

          if (profileData) {
            profile = profileData
          } else {
            // Profile missing in DB — create it now
            profile = {
              id: session.user.id,
              codename: rawCodename,
              created_at: session.user.created_at,
              updated_at: session.user.created_at,
            }
            await supabaseClient
              .from('profiles')
              .upsert({
                id: session.user.id,
                codename: rawCodename,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' })
          }

          // Check if encryption key is available (sessionStorage survives refresh but not tab/app close)
          const keyAvailable = hasEncryptionKey()

          set({
            session: {
              user: profile,
              access_token: session.access_token,
              refresh_token: session.refresh_token || '',
            },
            profile,
            loading: false,
            isAuthenticated: true,
            needsPassword: !keyAvailable, // Prompt for password if key is missing
          })
          return
        }
      }

      // Fallback: check localStorage session
      const stored = localStorage.getItem('zeiterfassung_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        const isLocalUser = parsed.user?.id?.startsWith('local_')
        set({
          session: parsed,
          profile: parsed.user,
          loading: false,
          isAuthenticated: true,
          // Local users don't need encryption key; Supabase users do
          needsPassword: !isLocalUser && !hasEncryptionKey(),
        })
        return
      }

      set({ loading: false, isAuthenticated: false })
    } catch (error) {
      console.error('Auth init failed:', error)
      set({ loading: false, isAuthenticated: false })
    }
  },

  signIn: async (codename: string, password: string) => {
    set({ loading: true, error: null })
    try {
      if (isSupabaseAvailable() && supabaseClient) {
        const email = codeToEmail(codename)
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        if (data.user) {
          // Derive encryption key for business data encryption
          await deriveEncryptionKey(password, data.user.id)

          // Ensure profile exists in DB (upsert) — codename stays plaintext (it's a pseudonym)
          await supabaseClient
            .from('profiles')
            .upsert({
              id: data.user.id,
              codename,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

          const profile: Profile = {
            id: data.user.id,
            codename,
            created_at: data.user.created_at,
            updated_at: new Date().toISOString(),
          }

          const session: Session = {
            user: profile,
            access_token: data.session?.access_token || '',
            refresh_token: data.session?.refresh_token || '',
          }

          // Migrate data from local_ user to Supabase user (if upgrading from offline)
          const oldLocalId = localUserId(codename)
          if (data.user.id !== oldLocalId) {
            migrateUserData(oldLocalId, data.user.id)
          }

          localStorage.setItem('zeiterfassung_session', JSON.stringify(session))
          set({ profile, session, loading: false, isAuthenticated: true, needsPassword: false })
          return
        }
      }

      // Offline fallback: local-only session
      const userId = localUserId(codename)
      // Check if this user already has a session (preserve existing ID for data continuity)
      const existingSession = localStorage.getItem('zeiterfassung_session')
      let existingId = userId
      if (existingSession) {
        try {
          const parsed = JSON.parse(existingSession)
          if (parsed.user?.codename?.toLowerCase() === codename.toLowerCase() && parsed.user?.id) {
            existingId = parsed.user.id
          }
        } catch {}
      }
      const profile: Profile = {
        id: existingId,
        codename,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const session: Session = {
        user: profile,
        access_token: 'local',
        refresh_token: 'local',
      }
      localStorage.setItem('zeiterfassung_session', JSON.stringify(session))
      localStorage.setItem('userCodename', codename)
      set({ profile, session, loading: false, isAuthenticated: true, needsPassword: false })
    } catch (error: any) {
      const msg = error?.message || 'Authentication failed'
      set({ error: msg, loading: false })
      throw error
    }
  },

  signUp: async (codename: string, password: string) => {
    set({ loading: true, error: null })
    try {
      if (isSupabaseAvailable() && supabaseClient) {
        const email = codeToEmail(codename)
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { codename },
          },
        })
        if (error) {
          // "User already registered" → codename taken
          if (error.message?.includes('already registered')) {
            throw new Error('CODENAME_TAKEN')
          }
          throw error
        }

        if (data.user) {
          // Derive encryption key for business data encryption
          await deriveEncryptionKey(password, data.user.id)

          // Ensure profile exists in DB (upsert) — codename stays plaintext (it's a pseudonym)
          await supabaseClient
            .from('profiles')
            .upsert({
              id: data.user.id,
              codename,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

          const profile: Profile = {
            id: data.user.id,
            codename,
            created_at: data.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const session: Session = {
            user: profile,
            access_token: data.session?.access_token || '',
            refresh_token: data.session?.refresh_token || '',
          }

          // Migrate data from local_ user to Supabase user (if upgrading from offline)
          const oldLocalId = localUserId(codename)
          if (data.user.id !== oldLocalId) {
            migrateUserData(oldLocalId, data.user.id)
          }

          localStorage.setItem('zeiterfassung_session', JSON.stringify(session))
          set({ profile, session, loading: false, isAuthenticated: true, needsPassword: false })
          return
        }
      }

      // Offline fallback
      const profile: Profile = {
        id: localUserId(codename),
        codename,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const session: Session = {
        user: profile,
        access_token: 'local',
        refresh_token: 'local',
      }
      localStorage.setItem('zeiterfassung_session', JSON.stringify(session))
      localStorage.setItem('userCodename', codename)
      set({ profile, session, loading: false, isAuthenticated: true, needsPassword: false })
    } catch (error: any) {
      const msg = error?.message || 'Registration failed'
      set({ error: msg, loading: false })
      throw error
    }
  },

  signOut: async () => {
    try {
      if (isSupabaseAvailable() && supabaseClient) {
        await supabaseClient.auth.signOut()
      }
    } catch (e) {
      console.warn('Supabase signOut error:', e)
    }
    localStorage.removeItem('zeiterfassung_session')
    clearEncryptionKey()
    clearTeamKey()
    set({ profile: null, session: null, isAuthenticated: false, loading: false, needsPassword: false })
  },

  logout: async () => {
    await get().signOut()
  },

  unlockWithPassword: async (password: string) => {
    const state = get()
    if (!state.profile?.id) {
      set({ error: 'No profile available' })
      return
    }
    set({ loading: true, error: null })
    try {
      // Verify password by attempting sign-in with Supabase
      if (isSupabaseAvailable() && supabaseClient) {
        const email = codeToEmail(state.profile.codename)
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw new Error('Falsches Passwort')
      }

      // Derive encryption key
      await deriveEncryptionKey(password, state.profile.id)
      set({ needsPassword: false, loading: false })
    } catch (error: any) {
      const msg = error?.message || 'Unlock failed'
      set({ error: msg, loading: false })
      throw error
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))
