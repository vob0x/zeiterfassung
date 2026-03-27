import React from 'react';
import { useI18n } from '../../i18n';
import { formatDurationHM } from '../../lib/utils';

interface Segment {
  color: string;
  ms: number;
  label?: string;
}

interface DayRingProps {
  segments: Segment[];
  totalMs: number;
  goalMs: number;
}

const DayRing: React.FC<DayRingProps> = ({ segments, totalMs, goalMs }) => {
  const { t } = useI18n();
  const r = 58;
  const cx = 74;
  const cy = 74;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(totalMs / goalMs, 1.15); // Allow slight overshoot for visual
  const overGoal = totalMs >= goalMs;

  // Build segment arcs
  const arcs: { color: string; dashoffset: number }[] = [];
  let offset = 0;
  const total = Math.max(totalMs, 1);

  segments.forEach((seg) => {
    const p = (seg.ms / total) * pct;
    arcs.push({ color: seg.color, dashoffset: circ * (1 - offset - p) });
    offset += p;
  });

  return (
    <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
      <svg width={148} height={148} viewBox="0 0 148 148">
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={9}
          opacity={0.08}
          style={{ color: 'var(--text)' }}
        />
        {/* Colored segments */}
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={a.dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s ease', opacity: 0.8 }}
          />
        ))}
        {/* Goal marker dot at 12 o'clock */}
        <circle
          cx={cx}
          cy={cy - r}
          r={2.5}
          fill={overGoal ? '#6EC49E' : '#4D4941'}
        />
      </svg>
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
        <span
          className="font-mono"
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          {formatDurationHM(totalMs)}
        </span>
        <span
          style={{
            fontSize: 10,
            color: overGoal ? 'var(--success)' : 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {overGoal ? `✓ ${t('timer.goalReached')}` : `/ ${formatDurationHM(goalMs)}`}
        </span>
      </div>
    </div>
  );
};

export default DayRing;
