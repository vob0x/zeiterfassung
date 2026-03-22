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
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-4">
        <h3 className="text-lg font-semibold text-white">Design</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-300">Theme</label>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-700 hover:bg-slate-600 text-white"
            >
              {theme === 'cyber' ? '🌙 Light' : '💻 Cyber'}
            </button>
          </div>

          {/* Theme Preview */}
          <div className="mt-4 p-4 rounded-lg border border-slate-700/50 bg-slate-900/30">
            <div className="text-xs text-slate-400 mb-2">Vorschau:</div>
            <div className={`grid grid-cols-3 gap-2 p-3 rounded ${theme === 'cyber' ? 'bg-slate-900' : 'bg-gray-100'}`}>
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-cyan-500' : 'bg-blue-500'}`} />
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-purple-500' : 'bg-purple-500'}`} />
              <div className={`w-8 h-8 rounded ${theme === 'cyber' ? 'bg-pink-500' : 'bg-pink-500'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-4">
        <h3 className="text-lg font-semibold text-white">Sprache</h3>

        <div className="flex gap-2">
          {['de', 'fr'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang as 'de' | 'fr')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                language === lang
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-4">
        <h3 className="text-lg font-semibold text-white">Profil</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Codename</label>
            <div className="mt-1 px-3 py-2 bg-slate-900/50 text-slate-300 rounded border border-slate-700/30">
              {localStorage.getItem('userCodename') || 'nicht gesetzt'}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </div>

      {/* Team Section */}
      {team && (
        <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-4">
          <h3 className="text-lg font-semibold text-white">Team</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Team-Name</label>
              <div className="mt-1 px-3 py-2 bg-slate-900/50 text-slate-300 rounded border border-slate-700/30">
                {team.name}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Mitglieder</label>
              <div className="mt-1 px-3 py-2 bg-slate-900/50 text-slate-300 rounded border border-slate-700/30">
                {members.length}
              </div>
            </div>

            {team.createdBy === localStorage.getItem('userId') && (
              <div>
                <label className="text-xs text-slate-400">Invite Code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={team.inviteCode}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-900/50 text-slate-300 rounded border border-slate-700/30 font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(team.inviteCode);
                      alert('In Zwischenablage kopiert');
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
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
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-3">
        <h3 className="text-lg font-semibold text-white">Info</h3>

        <div className="space-y-2 text-sm text-slate-400">
          <p>
            <strong>Zeiterfassung</strong> V6.0
          </p>
          <p>Eine moderne Zeit-Tracking-App für Teams</p>
          <p className="text-xs text-slate-500 mt-2">© 2024. Alle Daten werden lokal gespeichert.</p>
        </div>
      </div>

      {/* Data Sync Status */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-3">
        <h3 className="text-lg font-semibold text-white">Datensynchronisation</h3>

        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded border border-green-700/30">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-green-400">Synchronisiert</span>
        </div>
      </div>
    </div>
  );
}
