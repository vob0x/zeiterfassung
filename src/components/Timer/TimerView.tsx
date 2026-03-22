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
    <div className="min-h-screen bg-slate-900 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">{t('nav.timer')}</h1>
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
        <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300">{t('timer.todayTotal')}</span>
            <span className="text-2xl font-bold text-cyan-400">
              {formatDurationHM(todayTotalMs)} / {formatDurationHM(dailyGoalMs)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                progressPercent >= 100
                  ? 'bg-green-500'
                  : progressPercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-cyan-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="text-xs text-slate-400 mt-2">
            {Math.round(progressPercent)}% {t('of')} 8:24
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Task Slots & Quick Shortcuts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Shortcuts */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <QuickShortcuts />
            </div>

            {/* Task Slots */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">{t('timer.tasks')}</h2>

              {taskSlots.length === 0 ? (
                <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 text-center">
                  <p className="text-slate-400 text-sm">{t('timer.startHint')}</p>
                </div>
              ) : (
                <>
                  {taskSlots.map((slot, index) => (
                    <TaskSlot key={slot.id} slot={slot} index={index} />
                  ))}

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
                      className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg border border-dashed border-slate-600 transition-colors"
                    >
                      {t('timer.addTask')}
                    </button>
                  )}
                </>
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
