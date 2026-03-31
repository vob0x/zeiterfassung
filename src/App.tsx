import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useEntriesStore } from '@/stores/entriesStore'
import { useMasterStore } from '@/stores/masterStore'
import { useTeamStore } from '@/stores/teamStore'
import { useTimerStore, subscribeToTimerSync, unsubscribeFromTimerSync } from '@/stores/timerStore'
import { subscribeToMasterSync, unsubscribeFromMasterSync } from '@/stores/masterStore'
import { subscribeToEntriesSync, unsubscribeFromEntriesSync } from '@/stores/entriesStore'
import { subscribeToTeamSync, unsubscribeFromTeamSync } from '@/stores/teamStore'
import { I18nProvider, useI18n } from '@/i18n'
import Layout from '@/components/Layout'
import LoginScreen from '@/components/Auth/LoginScreen'
import UnlockScreen from '@/components/Auth/UnlockScreen'

function AppContent() {
  const { t } = useI18n()
  const { isAuthenticated, loading, needsPassword, initializeAuth } = useAuthStore()
  const { theme } = useUiStore()
  const fetchEntries = useEntriesStore((s) => s.fetch)
  const fetchMaster = useMasterStore((s) => s.fetch)
  const syncTeam = useTeamStore((s) => s.syncTeamData)
  const restoreTimers = useTimerStore((s) => s.restoreTimers)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Load user-scoped data once authenticated AND encryption key is available
  // (needsPassword=false means key is ready → safe to decrypt Supabase data)
  //
  // CRITICAL: syncTeam MUST complete first to restore the Team Key before
  // fetching entries/master data. Otherwise decryptFieldSmart fails because
  // the Team Key isn't in sessionStorage yet, causing all encrypted text
  // fields (stakeholder, projekt, etc.) to decrypt as empty strings.
  useEffect(() => {
    if (isAuthenticated && !needsPassword) {
      // Step 1: Restore team key first (fast — single row query)
      syncTeam().then(() => {
        subscribeToTeamSync()
        // Step 2: Now safe to decrypt — fetch entries & master data
        fetchEntries().then(() => {
          subscribeToEntriesSync()
        })
        fetchMaster()
        subscribeToMasterSync()
      }).catch(() => {
        // Team sync failed (offline?) — still load data with personal key
        fetchEntries().then(() => {
          subscribeToEntriesSync()
        })
        fetchMaster()
        subscribeToMasterSync()
      })
      // Timers don't contain encrypted text fields, safe to start in parallel
      restoreTimers().then(() => {
        subscribeToTimerSync()
      })
    }

    return () => {
      unsubscribeFromTimerSync()
      unsubscribeFromMasterSync()
      unsubscribeFromEntriesSync()
      unsubscribeFromTeamSync()
    }
  }, [isAuthenticated, needsPassword, fetchEntries, fetchMaster, syncTeam, restoreTimers])

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme === 'light' ? 'light' : 'cyber')
  }, [theme])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--neon-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('ui.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Session exists but encryption key is missing → prompt for password
  if (needsPassword) {
    return <UnlockScreen />
  }

  return <Layout />
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}
