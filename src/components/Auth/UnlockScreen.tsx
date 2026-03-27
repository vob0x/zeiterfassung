import { useState } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/i18n'

/**
 * UnlockScreen — shown when a valid Supabase session exists
 * but the encryption key is missing (sessionStorage cleared).
 *
 * This happens when:
 * - User opens app on a new device
 * - User closed the browser/tab and re-opened
 * - Mobile browser backgrounded and cleared sessionStorage
 *
 * The user must re-enter their password to derive the encryption key
 * so that Supabase data can be decrypted.
 */
export default function UnlockScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { profile, unlockWithPassword, signOut } = useAuthStore()
  const { t } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError(t('auth.errors.passwordRequired'))
      return
    }

    setIsLoading(true)
    try {
      await unlockWithPassword(password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg || t('auth.errors.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4">
      <div className="w-full max-w-md">
        <div className="card-solid p-8 md:p-12">
          {/* Lock Icon and Title */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(201, 169, 98, 0.15)' }}>
              <Lock className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h1 className="font-display text-xl font-bold text-[var(--text)] text-center">
              {t('auth.unlock.title')}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 text-center">
              {t('auth.unlock.subtitle').replace('{{codename}}', profile?.codename || '')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg border text-sm"
              style={{
                backgroundColor: 'rgba(212, 112, 110, 0.1)',
                borderColor: 'var(--danger)',
                color: 'var(--danger)',
              }}>
              {error}
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="unlock-password" className="label">
                {t('auth.password')}
              </label>
              <input
                id="unlock-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-6">
              {isLoading ? t('ui.loading') : t('auth.unlock.button')}
            </button>
          </form>

          {/* Sign Out Option */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors">
              <LogOut className="w-4 h-4" />
              <span>{t('auth.unlock.switchAccount')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
