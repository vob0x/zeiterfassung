import { useMemo } from 'react';
import { TimeEntry, FilterState } from '@/types';
import { useI18n } from '../../i18n';
import { formatHoursAdaptive, getEffectiveDurationMs } from '../../lib/utils';

interface ActivityBarsProps {
  entries: TimeEntry[];
  isFormat?: boolean;
  onDrillDown?: (filters: Partial<FilterState>) => void;
}

// Muted palette matching the app's earth/gold design language
const BAR_COLORS = [
  '#C9A962', // gold (--primary)
  '#6EC49E', // sage green (--success)
  '#9B8EC4', // soft violet (--neon-violet)
  '#D4706E', // muted coral (--danger)
  '#E5A84B', // warm amber (--warning)
  '#5BA4D9', // soft steel blue
];

export function ActivityBars({ entries, isFormat = false, onDrillDown }: ActivityBarsProps) {
  const { t } = useI18n();
  const { activities, totalHours } = useMemo(() => {
    // Group entries by key, sum duration_ms
    const itemMap: Record<string, number> = {};

    for (const entry of entries) {
      const rawKey = isFormat ? (entry.format || 'Einzelarbeit') : entry.taetigkeit;
      const key = rawKey && rawKey.trim() ? rawKey.trim() : (isFormat ? 'Einzelarbeit' : '(ohne Bezeichnung)');
      itemMap[key] = (itemMap[key] || 0) + getEffectiveDurationMs(entry);
    }

    const sorted = Object.entries(itemMap)
      .map(([name, ms]) => ({ name, hours: ms / (1000 * 60 * 60) }))
      .sort((a, b) => b.hours - a.hours);

    const total = sorted.reduce((sum, a) => sum + a.hours, 0);

    return {
      activities: sorted,
      totalHours: total,
    };
  }, [entries, isFormat]);

  if (activities.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>{t('dash.noData')}</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const percentage = (activity.hours / totalHours) * 100;
        const barColor = BAR_COLORS[index % BAR_COLORS.length];

        return (
          <div
            key={activity.name}
            className="space-y-1 transition-opacity"
            style={{ cursor: onDrillDown ? 'pointer' : undefined }}
            onClick={() => onDrillDown?.(isFormat ? { format: activity.name } : { activity: activity.name })}
            onMouseEnter={(e) => { if (onDrillDown) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { if (onDrillDown) e.currentTarget.style.opacity = '1'; }}
            title={onDrillDown ? t('dash.clickToFilter') : undefined}
          >
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{activity.name}</span>
              <span className="font-semibold" style={{ color: 'var(--neon-cyan)' }}>{formatHoursAdaptive(activity.hours)}</span>
            </div>
            <div className="w-full rounded-full h-8 overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'rgba(var(--border-rgb), 0.5)' }}>
              <div
                className="h-full flex items-center justify-end pr-3 transition-all duration-500"
                style={{ width: `${percentage}%`, background: barColor, opacity: 0.75 }}
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
