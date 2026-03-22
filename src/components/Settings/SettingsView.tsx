import React from 'react';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/uiStore';
import { useTeamStore } from '../../stores/teamStore';

export function SettingsView() {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useUiStore();
  const { team, members } = useTeamStore();

  const handleSignOut = () => {
    const confirmed = window.confirm('Wirklich abmelden?');
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* Theme Section */}
      <div className="rounded-lg p-4 backdrop-blur-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Design</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label style={{ color: 'var(--text-secondary)' }}>Theme</label>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-solid)')}
            >
              {theme === 'cyber' ? '🌙 Light' : '💻 Cyber'}
            </button>
          </div>

          {/* Theme Preview */}
          <div className="mt-4 p-4 rounded-lg border" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Vorschau:</div>
            <div className={`grid grid-cols-3 gap-2 p-3 rounded ${theme === 'cyber' ? '' : 'bg-gray-100'}`} style={theme === 'cyber' ? { background: 'var(--surface-hover)' } : {}}>
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-cyan-500' : 'bg-blue-500'}`} />
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-purple-500' : 'bg-purple-500'}`} />
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-pink-500' : 'bg-pink-500'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Language Section */}
      <div className="rounded-lg p-4 backdrop-blur-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Sprache</h3>

        <div className="flex gap-2">
          {['de', 'fr'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang as 'de' | 'fr')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${language === lang ? 'shadow-lg' : ''}`}
              style={language === lang
                ? { background: 'var(--neon-cyan)', color: 'var(--surface)' }
                : { background: 'var(--surface-solid)', color: 'var(--text-secondary)' }
              }
              onMouseEnter={(e) => language !== lang && (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => language !== lang && (e.currentTarget.style.background = 'var(--surface-solid)')}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="rounded-lg p-4 backdrop-blur-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Profil</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Codename</label>
            <div className="mt-1 px-3 py-2 rounded border" style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
              {localStorage.getItem('userCodename') || 'nicht gesetzt'}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ background: '#b91c1c', color: 'var(--text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#a01c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#b91c1c')}
          >
            {t('auth.signOut')}
          </button>
        </div>
      </div>

      {/* Team Section */}
      {team && (
        <div className="rounded-lg p-4 backdrop-blur-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Team</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Team-Name</label>
              <div className="mt-1 px-3 py-2 rounded border" style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                {team.name}
              </div>
            </div>

            <div>
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Mitglieder</label>
              <div className="mt-1 px-3 py-2 rounded border" style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                {members.length}
              </div>
            </div>

            {team.creator_id === localStorage.getItem('userId') && (
              <div>
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Invite Code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={team.invite_code}
                    readOnly
                    className="flex-1 px-3 py-2 rounded border font-mono"
                    style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(team.invite_code);
                      alert('In Zwischenablage kopiert');
                    }}
                    className="px-3 py-2 rounded"
                    style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-solid)')}
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="rounded-lg p-4 backdrop-blur-sm space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Info</h3>

        <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>
            <strong>Zeiterfassung</strong> V6.0
          </p>
          <p>Eine moderne Zeit-Tracking-App für Teams</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>© 2024. Alle Daten werden lokal gespeichert.</p>
        </div>
      </div>

      {/* Data Sync Status */}
      <div className="rounded-lg p-4 backdrop-blur-sm space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Datensynchronisation</h3>

        <div className="flex items-center gap-2 px-3 py-2 rounded border" style={{ background: '#064e3b', borderColor: '#047857' }}>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm" style={{ color: '#4ade80' }}>Synchronisiert</span>
        </div>
      </div>
    </div>
  );
}
