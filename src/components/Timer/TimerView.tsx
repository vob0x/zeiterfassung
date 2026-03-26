import React, { useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { formatDurationHM, formatDuration, getTodayISO, computeUnionMs } from '../../lib/utils';
import { Plus } from 'lucide-react';
import TimerLane from './TimerLane';
import FuzzySearch from './FuzzySearch';
import ManualEntry from './ManualEntry';

// Breathing orb keyframe animation (injected once)
const styleId = 'stack-timer-breathe';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes breathe {
      0%, 100% { box-shadow: 0 0 8px rgba(201,169,98,0.15), 0 0 2px rgba(201,169,98,0.1); transform: scale(1); }
      50% { box-shadow: 0 0 16px rgba(201,169,98,0.3), 0 0 6px rgba(201,169,98,0.2); transform: scale(1.06); }
    }
  `;
  document.head.appendChild(style);
}

const TimerView: React.FC = () => {
  const { t } = useI18n();
  const { taskSlots, addSlot, stopAllTimers, getSlotElapsed } = useTimerStore();
  const { entries } = useEntriesStore();

  // Today's entries for total
  const todayEntries = useMemo(() => {
    const todayISO = getTodayISO();
    return entries.filter((e) => e.date === todayISO);
  }, [entries]);

  const todayTotalMs = useMemo(() => computeUnionMs(todayEntries), [todayEntries]);

  // Running timers total (live)
  const runningTotalMs = taskSlots.reduce((sum, slot) => sum + getSlotElapsed(slot.id), 0);

  // Daily goal: 8:24
  const dailyGoalMs = 8 * 3600 * 1000 + 24 * 60 * 1000;
  const combinedMs = todayTotalMs + runningTotalMs;
  const progressPercent = Math.min((combinedMs / dailyGoalMs) * 100, 100);

  const hasActiveTimers = taskSlots.some((s) => !s.isPaused || s.pausedMs > 0);

  // Fuzzy search → create a new lane
  const handleFuzzySelect = (combo: { stakeholder: string; projekt: string; taetigkeit: string; format: string }) => {
    addSlot({
      stakeholder: [combo.stakeholder], // NEW: wrap in array
      projekt: combo.projekt,
      taetigkeit: combo.taetigkeit,
      format: combo.format || 'Einzelarbeit', // NEW: include format
      notiz: '',
    });
    // Auto-start the new timer
    setTimeout(() => {
      const state = useTimerStore.getState();
      const newest = state.taskSlots[state.taskSlots.length - 1];
      if (newest) {
        useTimerStore.getState().resumeTimer(newest.id);
      }
    }, 50);
  };

  // "+" empty timer
  const handleAddEmpty = () => {
    addSlot({ stakeholder: [], projekt: '', taetigkeit: '', format: 'Einzelarbeit', notiz: '' }); // NEW: add format
    // Auto-start
    setTimeout(() => {
      const state = useTimerStore.getState();
      const newest = state.taskSlots[state.taskSlots.length - 1];
      if (newest) {
        useTimerStore.getState().resumeTimer(newest.id);
      }
    }, 50);
  };

  return (
    <div className="py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ alignItems: 'start' }}>
        {/* ── Left Column: Stack Timer ── */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div
              className="font-display text-xs font-semibold tracking-wide uppercase"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}
            >
              {t('timer.tasks')}
            </div>
            {hasActiveTimers && (
              <button
                onClick={stopAllTimers}
                className="px-3 py-1 text-xs font-semibold rounded transition-all"
                style={{
                  background: 'rgba(212, 112, 110, 0.08)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(212, 112, 110, 0.18)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 112, 110, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 112, 110, 0.08)';
                }}
              >
                {t('timer.endDay')}
              </button>
            )}
          </div>

          {/* Fuzzy Search */}
          <div style={{ marginBottom: '14px' }}>
            <FuzzySearch onSelect={handleFuzzySelect} />
          </div>

          {/* Timer Lanes */}
          <div className="space-y-2 mb-3">
            {taskSlots.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('timer.startHint')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t('stack.searchOrPlus')}
                </p>
              </div>
            )}

            {taskSlots.map((slot) => (
              <TimerLane key={slot.id} slot={slot} />
            ))}
          </div>

          {/* "+" Button — start empty timer */}
          {taskSlots.length < 8 && (
            <button
              onClick={handleAddEmpty}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                e.currentTarget.style.color = 'var(--neon-cyan)';
                e.currentTarget.style.borderStyle = 'solid';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderStyle = 'dashed';
              }}
            >
              <Plus className="w-4 h-4" />
              {t('stack.startEmpty')}
            </button>
          )}

          {/* Manual Entry */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <ManualEntry embedded />
          </div>
        </div>

        {/* ── Right Column: Live Overview ── */}
        <div className="lg:sticky lg:top-20">
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Live combined time (saved + running) */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                className="font-mono font-bold"
                style={{
                  fontSize: '48px',
                  color: 'var(--neon-cyan)',
                  lineHeight: 1,
                  textShadow: taskSlots.some((s) => !s.isPaused) ? '0 0 20px rgba(201,169,98,0.2)' : 'none',
                }}
              >
                {formatDuration(combinedMs)}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {t('timer.todayTotal')}
              </div>
            </div>

            {/* Active lanes summary — mini orbs */}
            {taskSlots.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}>
                {taskSlots.map((slot) => {
                  const running = !slot.isPaused;
                  const elapsed = getSlotElapsed(slot.id);
                  const label = (Array.isArray(slot.stakeholder) ? slot.stakeholder[0] : slot.stakeholder) || slot.projekt || t('stack.untitled');
                  return (
                    <div
                      key={slot.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: running ? 'rgba(201,169,98,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${running ? 'rgba(201,169,98,0.2)' : 'var(--border)'}`,
                        fontSize: '11px',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: running ? 'var(--neon-cyan)' : elapsed > 0 ? 'var(--warning)' : 'var(--text-muted)',
                          animation: running ? 'breathe 2s ease-in-out infinite' : 'none',
                        }}
                      />
                      <span style={{ color: 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      <span className="font-mono" style={{ color: running ? 'var(--neon-cyan)' : 'var(--text-muted)', fontSize: '10px' }}>
                        {formatDuration(elapsed)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Daily Goal Progress */}
            <div style={{ width: '100%' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('timer.dailyGoal')}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div
                className="w-full overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '4px',
                  height: '6px',
                  position: 'relative',
                }}
              >
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    borderRadius: '4px',
                    background:
                      progressPercent >= 100
                        ? 'var(--success)'
                        : progressPercent >= 70
                          ? 'var(--warning)'
                          : 'var(--neon-cyan)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '-2px',
                    bottom: '-2px',
                    width: '2px',
                    background: 'var(--text-muted)',
                    borderRadius: '1px',
                    transform: 'translateX(-2px)',
                  }}
                />
              </div>
              <div className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                {formatDurationHM(combinedMs)} / {formatDurationHM(dailyGoalMs)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
