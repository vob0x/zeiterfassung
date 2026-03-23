import React, { useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { formatDurationHM, getTodayISO, computeUnionMs } from '../../lib/utils';
import TimerCircle from './TimerCircle';
import TaskSlot from './TaskSlot';
import QuickShortcuts from './QuickShortcuts';
import ManualEntry from './ManualEntry';

const TimerView: React.FC = () => {
  const { t } = useI18n();
  const { taskSlots, addSlot, stopAllTimers } = useTimerStore();
  const { entries } = useEntriesStore();

  // Get today's entries for total calculation
  const todayEntries = useMemo(() => {
    const todayISO = getTodayISO();
    return entries.filter((e) => e.date === todayISO);
  }, [entries]);

  // Calculate today's total using union algorithm
  const todayTotalMs = useMemo(() => {
    return computeUnionMs(todayEntries);
  }, [todayEntries]);

  // Daily goal: 8:24 (504 minutes)
  const dailyGoalMs = 8 * 3600 * 1000 + 24 * 60 * 1000;

  // Progress percentage
  const progressPercent = Math.min((todayTotalMs / dailyGoalMs) * 100, 100);

  // Handle "Stop All" button
  const handleStopAll = () => {
    if (taskSlots.length > 0) {
      stopAllTimers();
    }
  };

  return (
    <div className="py-4">
      {/* V5.15: Two-column grid layout (1:1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ alignItems: 'start' }}>
        {/* Left Column: Tasks Card */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Card Title + Feierabend */}
          <div className="flex items-center justify-between mb-3">
            <div
              className="font-display text-xs font-semibold tracking-wide uppercase"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}
            >
              {t('timer.tasks')}
            </div>
            {taskSlots.some((s) => !s.isPaused || s.pausedMs > 0) && (
              <button
                onClick={handleStopAll}
                className="px-3 py-1 text-xs font-semibold rounded transition-all"
                style={{
                  background: 'rgba(212, 112, 110, 0.08)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(212, 112, 110, 0.18)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 112, 110, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(212, 112, 110, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 112, 110, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(212, 112, 110, 0.18)';
                }}
                title={t('title.stopAll')}
              >
                {t('timer.endDay')}
              </button>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <QuickShortcuts />
          </div>

          {/* Task Slots */}
          <div className="space-y-3 mb-4">
            {taskSlots.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('timer.startHint')}</p>
              </div>
            )}

            {taskSlots.map((slot, index) => (
              <TaskSlot key={slot.id} slot={slot} index={index} />
            ))}
          </div>

          {/* Add Task Button */}
          {taskSlots.length < 8 && (
            <button
              onClick={() => {
                addSlot({
                  stakeholder: '',
                  projekt: '',
                  taetigkeit: '',
                  notiz: '',
                });
              }}
              className="w-full py-3 text-sm font-medium rounded-lg transition-all"
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.color = 'var(--neon-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              + {t('timer.addTask')}
            </button>
          )}

          {/* Manual Entry Section - inside the same card like V5.15 */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <ManualEntry embedded />
          </div>
        </div>

        {/* Right Column: Timer Circle + Today Total + Daily Goal */}
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
            <TimerCircle />

            {/* Today Total - V5.15 style */}
            <div
              style={{
                marginTop: '20px',
                textAlign: 'center',
                width: '100%',
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', marginBottom: '4px' }}
              >
                {t('timer.todayTotal')}
              </div>
              <div
                className="text-3xl font-mono font-bold"
                style={{ color: 'var(--success)', lineHeight: 1.2 }}
              >
                {formatDurationHM(todayTotalMs)}
              </div>
            </div>

            {/* Daily Goal Progress Bar - V5.15 style */}
            <div style={{ width: '100%', marginTop: '16px' }}>
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
                {/* 100% marker */}
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
                {formatDurationHM(todayTotalMs)} / {formatDurationHM(dailyGoalMs)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
