import React, { useMemo } from 'react';
import { TimeEntry } from '@/types';
import { useI18n } from '../../i18n';
import { computeUnionMs, formatHoursAdaptive } from '../../lib/utils';

interface HeatmapProps {
  entries: TimeEntry[];
}

function getIntensityStyle(hours: number): React.CSSProperties {
  if (hours === 0) return { background: 'var(--surface-solid)' };
  if (hours < 1) return { background: 'rgba(110, 196, 158, 0.15)', border: '1px solid rgba(110, 196, 158, 0.2)' };
  if (hours < 3) return { background: 'rgba(110, 196, 158, 0.3)', border: '1px solid rgba(110, 196, 158, 0.4)' };
  if (hours < 6) return { background: 'rgba(201, 169, 98, 0.3)', border: '1px solid rgba(201, 169, 98, 0.4)' };
  if (hours < 10) return { background: 'rgba(229, 168, 75, 0.3)', border: '1px solid rgba(229, 168, 75, 0.4)' };
  return { background: 'rgba(212, 112, 110, 0.3)', border: '1px solid rgba(212, 112, 110, 0.4)' };
}

export function Heatmap({ entries }: HeatmapProps) {
  const { t } = useI18n();
  const { stakeholders, projects, matrix, totals } = useMemo(() => {
    // Handle stakeholder as array: flatten all stakeholders
    const allStakeholders = new Set<string>();
    entries.forEach((e) => {
      const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
      shArray.forEach((sh) => allStakeholders.add(sh));
    });
    const uniqueStakeholders = Array.from(allStakeholders).sort();
    const uniqueProjects = [...new Set(entries.map((e) => e.projekt))].sort();

    const matrix: Record<string, Record<string, number>> = {};
    const stakeholderTotals: Record<string, number> = {};
    const projectTotals: Record<string, number> = {};

    // Initialize
    for (const sh of uniqueStakeholders) {
      matrix[sh] = {};
      stakeholderTotals[sh] = 0;
      for (const pr of uniqueProjects) {
        matrix[sh][pr] = 0;
      }
    }

    // Fill matrix - compute union per stakeholder × project × day
    for (const sh of uniqueStakeholders) {
      for (const pr of uniqueProjects) {
        const matchingEntries = entries.filter((e) => {
          const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
          return shArray.includes(sh) && e.projekt === pr;
        });
        // Group by date, compute union per day, then sum
        const byDate = new Map<string, TimeEntry[]>();
        matchingEntries.forEach((e) => {
          if (!byDate.has(e.date)) byDate.set(e.date, []);
          byDate.get(e.date)!.push(e);
        });
        let totalMs = 0;
        byDate.forEach((dayEntries) => {
          totalMs += computeUnionMs(dayEntries);
        });
        const hours = totalMs / (1000 * 60 * 60);
        matrix[sh][pr] = hours;
        stakeholderTotals[sh] += hours;
        projectTotals[pr] = (projectTotals[pr] || 0) + hours;
      }
    }

    return {
      stakeholders: uniqueStakeholders,
      projects: uniqueProjects,
      matrix,
      totals: { stakeholder: stakeholderTotals, project: projectTotals },
    };
  }, [entries]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-semibold border" style={{ color: 'var(--text-muted)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              {t('label.stakeholder')}
            </th>
            {projects.map((pr) => (
              <th
                key={pr}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: 'var(--text-secondary)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}
              >
                {pr}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              {t('team.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {stakeholders.map((sh) => (
            <tr key={sh}>
              <td className="p-2 text-sm font-medium border sticky left-0" style={{ color: 'var(--text-secondary)', background: 'rgba(var(--surface-rgb), 0.3)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
                {sh}
              </td>
              {projects.map((pr) => {
                const hours = matrix[sh][pr];
                return (
                  <td
                    key={`${sh}-${pr}`}
                    className="p-2 text-center text-sm font-medium rounded"
                    style={{ ...getIntensityStyle(hours), color: 'var(--text)' }}
                  >
                    {hours > 0 ? formatHoursAdaptive(hours) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
                {formatHoursAdaptive(totals.stakeholder[sh] || 0)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTopColor: 'var(--surface-hover)', borderTopWidth: '2px' }}>
            <td className="p-2 text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              {t('team.total')}
            </td>
            {projects.map((pr) => (
              <td
                key={`total-${pr}`}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}
              >
                {formatHoursAdaptive(totals.project[pr] || 0)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.7)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              {formatHoursAdaptive(Object.values(totals.stakeholder).reduce((a, b) => a + b, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
