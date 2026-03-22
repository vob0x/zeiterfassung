import { useState } from 'react'
import { Clock, Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useI18n } from '@/i18n'

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [codename, setCodename] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signIn, signUp } = useAuthStore()
  const { language, setLanguage } = useUiStore()
  const { t } = useI18n()

  const validateForm = (): boolean => {
    setError('')

    if (!codename.trim()) {
      setError('Codename is required')
      return false
    }

    if (!password) {
      setError('Password is required')
      return false
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      if (isSignUp) {
        await signUp(codename, password)
      } else {
        await signIn(codename, password)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'de' ? 'fr' : 'de')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10" />

      <div className="w-full max-w-md">
        <div className="card-solid p-8 md:p-12">
          {/* Logo and Title */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(201, 169, 98, 0.15)' }}>
              <Clock className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--text)] text-center">
              ZEITERFASSUNG
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 text-center">
              Track your time efficiently
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => {
                setIsSignUp(false)
                setError('')
                setPassword('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                !isSignUp
                  ? 'bg-[var(--primary)] text-[var(--bg)]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'
              }`}>
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUp(true)
                setError('')
                setPassword('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                isSignUp
                  ? 'bg-[var(--primary)] text-[var(--bg)]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'
              }`}>
              Sign Up
            </button>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Codename Input */}
            <div>
              <label htmlFor="codename" className="label">
                Codename
              </label>
              <input
                id="codename"
                type="text"
                className="input"
                placeholder="e.g. alex, sophie"
                value={codename}
                onChange={(e) => setCodename(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {/* Confirm Password Input (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-6">
              {isLoading
                ? 'Loading...'
                : isSignUp
                  ? 'Sign Up'
                  : 'Sign In'}
            </button>
          </form>

          {/* Language Toggle */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              <Globe className="w-4 h-4" />
              <span>{language === 'de' ? 'English' : 'Deutsch'}</span>
            </button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Pseudonymous time tracking. Your privacy is important.
        </p>
      </div>
    </div>
  )
}
