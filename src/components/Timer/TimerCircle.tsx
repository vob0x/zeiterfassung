import React from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useI18n } from '../../i18n';
import { formatDuration } from '../../lib/utils';

const TimerCircle: React.FC = () => {
  const { t } = useI18n();
  const { taskSlots, activeSlotId, getSlotElapsed } = useTimerStore();

  const activeSlot = taskSlots.find((s) => s.id === activeSlotId);

  // Calculate elapsed time for active slot or sum of all elapsed
  const elapsedMs = activeSlot
    ? getSlotElapsed(activeSlot.id)
    : taskSlots.length === 0
      ? 0
      : taskSlots.reduce((sum, slot) => sum + getSlotElapsed(slot.id), 0);

  // Calculate rotation angle (1 hour = 1 full rotation)
  const rotationDegrees = ((elapsedMs / 3600000) % 1) * 360;

  // Status text
  const statusText = taskSlots.length === 0
    ? t('timer.ready')
    : taskSlots.length > 1
      ? t('timer.multipleTasks')
      : activeSlot?.projekt || t('timer.ready');

  const isRunning = activeSlotId !== null;
  const hasPaused = taskSlots.some((s) => s.isPaused && getSlotElapsed(s.id) > 0);

  // SVG circle properties
  const radius = 94;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rotationDegrees / 360) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {/* SVG Circle */}
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        <svg
          style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.3s ease',
              filter: isRunning ? 'drop-shadow(0 0 14px rgba(201,169,98,0.30))' : 'none',
            }}
          />
        </svg>

        {/* Center time display */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="font-mono font-bold"
            style={{
              fontSize: '42px',
              color: 'var(--neon-cyan)',
              lineHeight: 1,
              textShadow: isRunning ? '0 0 20px rgba(201,169,98,0.25)' : 'none',
            }}
          >
            {formatDuration(elapsedMs)}
          </div>
        </div>
      </div>

      {/* Status label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
          {statusText}
        </div>
        <span
          style={{
            display: 'inline-block',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            padding: '2px 10px',
            borderRadius: '12px',
            background: isRunning
              ? 'rgba(110,196,158,0.12)'
              : hasPaused
                ? 'rgba(229,168,75,0.12)'
                : 'var(--surface-solid)',
            color: isRunning
              ? 'var(--success)'
              : hasPaused
                ? 'var(--warning)'
                : 'var(--text-secondary)',
          }}
        >
          {isRunning ? t('timer.running') : hasPaused ? t('timer.paused') : t('timer.ready')}
        </span>
      </div>
    </div>
  );
};

export default TimerCircle;
