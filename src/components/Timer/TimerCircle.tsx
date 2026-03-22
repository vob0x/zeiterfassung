import React, { useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useI18n } from '../../i18n';
import { formatDuration, cn } from '../../lib/utils';

const TimerCircle: React.FC = () => {
  const { t } = useI18n();
  const { taskSlots, activeSlotId } = useTimerStore();

  const activeSlot = useMemo(() => {
    return taskSlots.find((s) => s.id === activeSlotId);
  }, [taskSlots, activeSlotId]);

  const getSlotElapsed = useTimerStore((state) => state.getSlotElapsed);

  // Calculate elapsed time for active slot or sum of all elapsed
  const elapsedMs = useMemo(() => {
    if (activeSlot) {
      return getSlotElapsed(activeSlot.id);
    }

    if (taskSlots.length === 0) return 0;

    return taskSlots.reduce((sum, slot) => sum + getSlotElapsed(slot.id), 0);
  }, [activeSlot, taskSlots, getSlotElapsed]);

  // Calculate rotation angle (1 hour = 1 full rotation)
  const rotationDegrees = ((elapsedMs / 3600000) % 1) * 360;

  // Status text
  const statusText = useMemo(() => {
    if (taskSlots.length === 0) {
      return t('timer.ready');
    }
    if (taskSlots.length > 1) {
      return t('timer.multipleTasks');
    }
    return activeSlot?.projekt || t('timer.ready');
  }, [taskSlots.length, activeSlot, t]);

  const isRunning = activeSlotId !== null;

  // SVG circle properties
  const radius = 94;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rotationDegrees / 360) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
      {/* SVG Circle */}
      <div className="relative w-48 h-48">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-700"
          />

          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              'text-cyan-500 transition-all duration-300',
              isRunning && 'filter drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse'
            )}
            strokeLinecap="round"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-cyan-400 font-mono">
            {formatDuration(elapsedMs)}
          </div>
        </div>
      </div>

      {/* Status label */}
      <div className="text-center">
        <div className="text-sm text-slate-400 mb-1">{statusText}</div>
        <div
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full',
            isRunning
              ? 'bg-green-500 text-white'
              : taskSlots.length > 0
                ? 'bg-yellow-500 text-slate-900'
                : 'bg-slate-600 text-slate-200'
          )}
        >
          {isRunning ? t('timer.running') : taskSlots.length > 0 ? t('timer.paused') : t('timer.ready')}
        </div>
      </div>
    </div>
  );
};

export default TimerCircle;
