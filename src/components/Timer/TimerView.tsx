import React, { useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { formatDurationHM, getTodayISO, computeUnionMs, cn } from '../../lib/utils';
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
  const dailyGoalMs = 8 * 3600 * 1000 + 24 * 60 * 1000; // 8 hours 24 minutes

  // Progress percentage
  const progressPercent = Math.min((todayTotalMs / dailyGoalMs) * 100, 100);

  // Handle "Stop All" button
  const handleStopAll = () => {
    if (taskSlots.length > 0) {
      stopAllTimers();
    }
  };

  return (
    <div className="py-6 px-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t('nav.timer')}</h1>
          {taskSlots.length > 0 && (
            <button
              onClick={handleStopAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
              title={t('title.stopAll')}
            >
              Feierabend
            </button>
          )}
        </div>

        {/* Today Total & Progress */}
        <div className="card mb-8 p-6">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'var(--text-secondary)' }}>{t('timer.todayTotal')}</span>
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--primary)' }}>
              {formatDurationHM(todayTotalMs)} / {formatDurationHM(dailyGoalMs)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-solid)' }}>
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${progressPercent}%`,
                background:
                  progressPercent >= 100
                    ? 'var(--success)'
                    : progressPercent >= 70
                      ? 'var(--warning)'
                      : 'var(--primary)',
              }}
            />
          </div>

          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {Math.round(progressPercent)}% {t('of')} 8:24
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Task Slots & Quick Shortcuts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Shortcuts */}
            <div className="card p-4">
              <QuickShortcuts />
            </div>

            {/* Task Slots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{t('timer.tasks')}</h2>
                {taskSlots.length > 0 && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {taskSlots.length}/8
                  </span>
                )}
              </div>

              {taskSlots.length === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('timer.startHint')}</p>
                  <button
                    onClick={() => {
                      addSlot({
                        stakeholder: '',
                        projekt: '',
                        taetigkeit: '',
                        notiz: '',
                      });
                    }}
                    className="btn btn-primary"
                  >
                    {t('timer.addTask')}
                  </button>
                </div>
              )}

              {taskSlots.map((slot, index) => (
                <TaskSlot key={slot.id} slot={slot} index={index} />
              ))}

              {taskSlots.length > 0 && taskSlots.length < 8 && (
                <button
                  onClick={() => {
                    addSlot({
                      stakeholder: '',
                      projekt: '',
                      taetigkeit: '',
                      notiz: '',
                    });
                  }}
                  className="w-full px-4 py-3 rounded-lg transition-colors"
                  style={{
                    background: 'var(--surface)',
                    border: '1px dashed var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  + {t('timer.addTask')}
                </button>
              )}
            </div>

            {/* Manual Entry Form */}
            <ManualEntry />
          </div>

          {/* Right Column: Timer Circle */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <TimerCircle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
