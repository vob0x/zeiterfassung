import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { useTeamStore } from '../../stores/teamStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useUiStore } from '../../stores/uiStore';
import { PeriodType } from '@/types';
import { TeamDaily } from './TeamDaily';
import { TeamMatrix } from './TeamMatrix';
import { TeamWorkload } from './TeamWorkload';
import { TeamTimeline } from './TeamTimeline';

export default function TeamView() {
  const { t } = useI18n();
  const { team, members, memberEntries, connected, syncTeamData, leaveTeam, createTeam, joinTeam } = useTeamStore();
  const entries = useEntriesStore((state) => state.entries);
  const showToast = useUiStore((state) => state.showToast);
  const { period, setTeamPeriod } = useTeamStore();

  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [setupMode, setSetupMode] = useState<'create' | 'join' | null>(null);

  const handleCreateTeam = async (name: string) => {
    if (!name.trim()) {
      showToast('Team-Name erforderlich', 'error');
      return;
    }

    try {
      await createTeam(name);
      showToast(`${t('toast.connected')} ${name}`, 'success');
      setTeamName('');
      setSetupMode(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleJoinTeam = async (code: string, name: string) => {
    if (!code.trim() || !name.trim()) {
      showToast('Invite-Code und Name erforderlich', 'error');
      return;
    }

    try {
      await joinTeam(code, name);
      showToast(`${t('toast.connected')} ${name}`, 'success');
      setInviteCode('');
      setTeamName('');
      setSetupMode(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleSync = async () => {
    try {
      await syncTeamData();
      showToast(t('toast.syncOk'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleLeaveTeam = async () => {
    const confirmed = window.confirm(t('confirm.disconnect'));
    if (!confirmed) return;

    try {
      await leaveTeam();
      showToast(t('toast.disconnected'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  // Compute KPIs
  const allTeamEntries = Array.from(memberEntries.values()).flat();
  const totalHours = allTeamEntries.reduce((sum, entry) => sum + (entry.duration_ms || 0) / (1000 * 60 * 60), 0);
  const personCount = members.length;
  const entryCount = allTeamEntries.length;
  const avgPerPerson = personCount > 0 ? totalHours / personCount : 0;
  const workingDays = new Set(allTeamEntries.map((e) => e.date)).size || 1;
  const avgPerDay = workingDays > 0 ? totalHours / workingDays : 0;

  if (!connected) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="rounded-lg p-6 backdrop-blur-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{t('team.setupText')}</h2>

          {setupMode === null && (
            <div className="flex gap-3">
              <button
                onClick={() => setSetupMode('create')}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
              >
                Team erstellen
              </button>
              <button
                onClick={() => setSetupMode('join')}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors"
              >
                Team beitreten
              </button>
            </div>
          )}

          {setupMode === 'create' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Team-Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-2 rounded border focus:outline-none"
                style={{ background: 'var(--surface-solid)', color: 'var(--text)', borderColor: 'var(--border)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTeam(teamName);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateTeam(teamName)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Team erstellen
                </button>
                <button
                  onClick={() => {
                    setSetupMode(null);
                    setTeamName('');
                  }}
                  className="px-4 py-2 rounded font-medium transition-colors"
                  style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-solid)')}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {setupMode === 'join' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Invite-Code (6 Zeichen)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-2 rounded border font-mono text-center focus:outline-none"
                style={{ background: 'var(--surface-solid)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
              <input
                type="text"
                placeholder="Dein Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-2 rounded border focus:outline-none"
                style={{ background: 'var(--surface-solid)', color: 'var(--text)', borderColor: 'var(--border)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinTeam(inviteCode, teamName);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleJoinTeam(inviteCode, teamName)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors"
                >
                  Beitreten
                </button>
                <button
                  onClick={() => {
                    setSetupMode(null);
                    setTeamName('');
                    setInviteCode('');
                  }}
                  className="px-4 py-2 rounded font-medium transition-colors"
                  style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-solid)')}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Team is connected
  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Team Header */}
      <div className="rounded-lg p-4 backdrop-blur-sm flex items-center justify-between flex-wrap gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{team?.name}</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('team.connected')} {members.length} {t('team.persons').toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            {t('team.sync')}
          </button>
          <button
            onClick={handleLeaveTeam}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-medium transition-colors"
          >
            Trennen
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {(['week', 'month', 'year', 'all'] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setTeamPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === p
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg'
                : ''
            }`}
            style={period === p ? { color: 'var(--text)' } : { background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => period !== p && (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => period !== p && (e.currentTarget.style.background = 'var(--surface-solid)')}
          >
            {t(`team.${p}`)}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--neon-cyan)' }}>{totalHours.toFixed(1)}h</div>
        </div>
        <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('team.persons')}</div>
          <div className="text-2xl font-bold" style={{ color: '#60a5fa' }}>{personCount}</div>
        </div>
        <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Einträge</div>
          <div className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{entryCount}</div>
        </div>
        <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('team.perPerson')}</div>
          <div className="text-2xl font-bold" style={{ color: '#4ade80' }}>{avgPerPerson.toFixed(1)}h</div>
        </div>
        <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('team.perDay')}</div>
          <div className="text-2xl font-bold" style={{ color: '#fb923c' }}>{avgPerDay.toFixed(1)}h</div>
        </div>
      </div>

      {allTeamEntries.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('team.nodata')}</div>
      ) : (
        <>
          {/* Daily Overview */}
          <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('team.attendance')}</h3>
            <TeamDaily memberEntries={memberEntries} entries={entries} />
          </div>

          {/* Stakeholder × Person Matrix */}
          <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('team.shxperson')}</h3>
            <TeamMatrix dimension="stakeholder" entries={allTeamEntries} members={members} />
          </div>

          {/* Project × Person Matrix */}
          <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('team.prxperson')}</h3>
            <TeamMatrix dimension="project" entries={allTeamEntries} members={members} />
          </div>

          {/* Workload per Person */}
          <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('team.workload')}</h3>
            <TeamWorkload memberEntries={memberEntries} entries={allTeamEntries} />
          </div>

          {/* Timeline */}
          <div className="rounded-lg p-4 backdrop-blur-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('team.timeline')}</h3>
            <TeamTimeline memberEntries={memberEntries} members={members} />
          </div>
        </>
      )}
    </div>
  );
}
