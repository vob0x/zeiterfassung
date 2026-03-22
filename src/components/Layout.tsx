import { useState, lazy, Suspense } from 'react'
import {
  Clock,
  List,
  LayoutDashboard,
  Settings,
  Users,
  Sun,
  Moon,
  Menu,
  Globe,
  X,
  LogOut,
} from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import Toast from '@/components/UI/Toast'

// Views
import TimerView from '@/components/Timer/TimerView'
import EntriesView from '@/components/Entries/EntriesView'
import DashboardView from '@/components/Dashboard/DashboardView'
import ManageView from '@/components/Manage/ManageView'
import TeamView from '@/components/Team/TeamView'

const VIEW_COMPONENTS: Record<string, React.ComponentType> = {
  timer: TimerView,
  entries: EntriesView,
  dashboard: DashboardView,
  manage: ManageView,
  team: TeamView,
}

export default function Layout() {
  const { currentView, setCurrentView, theme, setTheme, language, setLanguage } =
    useUiStore()
  const { logout, profile } = useAuthStore()
  const { t } = useI18n()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts()

  const viewConfig = [
    { id: 'timer', label: t('nav.timer'), icon: Clock },
    { id: 'entries', label: t('nav.entries'), icon: List },
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'manage', label: t('nav.manage'), icon: Settings },
    { id: 'team', label: t('nav.team'), icon: Users },
  ]

  const handleViewChange = (viewId: string) => {
    setCurrentView(viewId)
    setMobileMenuOpen(false)
  }

  const toggleTheme = () => {
    setTheme(theme === 'cyber' ? 'light' : 'cyber')
  }

  const toggleLanguage = () => {
    setLanguage(language === 'de' ? 'fr' : 'de')
  }

  // Render the active view component
  const ActiveView = VIEW_COMPONENTS[currentView] || TimerView

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="top-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(201, 169, 98, 0.12)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--neon-cyan)' }} />
              </div>
              <span className="font-display font-bold text-lg tracking-tight"
                style={{ color: 'var(--neon-cyan)' }}>
                ZEITERFASSUNG
              </span>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 relative">
              {viewConfig.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleViewChange(id)}
                  className={`nav-tab ${currentView === id ? 'active' : ''}`}>
                  {label}
                </button>
              ))}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Codename Badge */}
              {profile?.codename && (
                <span className="hidden sm:inline-block text-xs font-mono px-2 py-1 rounded-md"
                  style={{
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                  {profile.codename}
                </span>
              )}

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="btn-icon"
                title={t('title.langToggle')}>
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold ml-1">
                  {language === 'de' ? 'DE' : 'FR'}
                </span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="btn-icon"
                title={t('title.themeToggle')}>
                {theme === 'cyber' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={() => logout()}
                className="btn-icon hidden sm:flex"
                title={t('auth.signOut')}>
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden btn-icon">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t pb-3 animate-fadeIn"
              style={{ borderColor: 'var(--border)' }}>
              <div className="py-2 space-y-1">
                {viewConfig.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleViewChange(id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
                      currentView === id
                        ? 'text-[var(--neon-cyan)] bg-[var(--surface-active)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
                <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 rounded-lg text-[var(--danger)] hover:bg-[rgba(212,112,110,0.08)] transition-all">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('auth.signOut')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-20 pb-24 md:pb-8 w-full relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ActiveView />
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="bottom-nav md:hidden">
        <div className="bottom-nav-content">
          {viewConfig.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleViewChange(id)}
              className={`bottom-nav-item ${currentView === id ? 'active' : ''}`}>
              <Icon className="bottom-nav-icon" />
              <span className="bottom-nav-label">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Toast Notifications */}
      <Toast />
    </div>
  )
}
