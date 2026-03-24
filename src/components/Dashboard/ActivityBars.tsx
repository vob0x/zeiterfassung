import { useMemo } from 'react';
import { TimeEntry } from '@/types';
import { useI18n } from '../../i18n';
import { computeUnionMs } from '../../lib/utils';

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

export function ActivityBars({ entries }: ActivityBarsProps) {
  const { t } = useI18n();
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
    return <div style={{ color: 'var(--text-muted)' }}>{t('dash.noData')}</div>;
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
