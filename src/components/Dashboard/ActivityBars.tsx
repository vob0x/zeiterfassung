import React, { useMemo } from 'react';
import { TimeEntry } from '@/types';

interface ActivityBarsProps {
  entries: TimeEntry[];
}

const COLORS = [
  'bg-gradient-to-r from-cyan-500 to-blue-500',
  'bg-gradient-to-r from-purple-500 to-pink-500',
  'bg-gradient-to-r from-green-500 to-emerald-500',
  'bg-gradient-to-r from-yellow-500 to-orange-500',
  'bg-gradient-to-r from-red-500 to-pink-500',
  'bg-gradient-to-r from-blue-500 to-purple-500',
];

function computeUnionMs(dayEntries: TimeEntry[]): number {
  const intervals: [number, number][] = [];

  for (const e of dayEntries) {
    if (!e.start_time || !e.end_time) continue;

    const [sh, sm] = e.start_time.split(':').map(Number);
    const [eh, em] = e.end_time.split(':').map(Number);

    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;

    if (endMin < startMin) {
      endMin += 24 * 60;
    }

    if (endMin > startMin) {
      intervals.push([startMin, endMin]);
    }
  }

  if (!intervals.length) return 0;

  intervals.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [[...intervals[0]]];
  for (let i = 1; i < intervals.length; i++) {
    const [cs, ce] = intervals[i];
    const last = merged[merged.length - 1];

    if (cs <= last[1]) {
      last[1] = Math.max(last[1], ce);
    } else {
      merged.push([cs, ce]);
    }
  }

  return merged.reduce((sum, [start, end]) => sum + (end - start), 0) * 60000;
}

export function ActivityBars({ entries }: ActivityBarsProps) {
  const { activities, totalHours } = useMemo(() => {
    const activityMap: Record<string, number> = {};

    for (const entry of entries) {
      const dayEntries = entries.filter((e) => e.taetigkeit === entry.taetigkeit && e.date === entry.date);
      const hours = computeUnionMs(dayEntries) / (1000 * 60 * 60);
      activityMap[entry.taetigkeit] = (activityMap[entry.taetigkeit] || 0) + hours;
    }

    const sorted = Object.entries(activityMap)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours);

    const total = sorted.reduce((sum, a) => sum + a.hours, 0);

    return {
      activities: sorted,
      totalHours: total,
    };
  }, [entries]);

  if (activities.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>Keine Daten verfügbar</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const percentage = (activity.hours / totalHours) * 100;
        const colorClass = COLORS[index % COLORS.length];

        return (
          <div key={activity.name} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{activity.name}</span>
              <span className="font-semibold" style={{ color: 'var(--neon-cyan)' }}>{activity.hours.toFixed(1)}h</span>
            </div>
            <div className="w-full rounded-full h-8 overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'rgba(var(--border-rgb), 0.5)' }}>
              <div
                className={`h-full ${colorClass} flex items-center justify-end pr-3 transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              >
                {percentage > 10 && <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{percentage.toFixed(0)}%</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
