import React, { useMemo } from 'react';
import { TimeEntry } from '@/types';

interface HeatmapProps {
  entries: TimeEntry[];
}

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

function getIntensityStyle(hours: number): React.CSSProperties {
  if (hours === 0) return { background: 'var(--surface-solid)' };
  if (hours < 1) return { background: 'rgba(110, 196, 158, 0.15)', border: '1px solid rgba(110, 196, 158, 0.2)' };
  if (hours < 3) return { background: 'rgba(110, 196, 158, 0.3)', border: '1px solid rgba(110, 196, 158, 0.4)' };
  if (hours < 6) return { background: 'rgba(201, 169, 98, 0.3)', border: '1px solid rgba(201, 169, 98, 0.4)' };
  if (hours < 10) return { background: 'rgba(229, 168, 75, 0.3)', border: '1px solid rgba(229, 168, 75, 0.4)' };
  return { background: 'rgba(212, 112, 110, 0.3)', border: '1px solid rgba(212, 112, 110, 0.4)' };
}

export function Heatmap({ entries }: HeatmapProps) {
  const { stakeholders, projects, matrix, totals } = useMemo(() => {
    const uniqueStakeholders = [...new Set(entries.map((e) => e.stakeholder))].sort();
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

    // Fill matrix
    for (const sh of uniqueStakeholders) {
      for (const pr of uniqueProjects) {
        const dayEntries = entries.filter(
          (e) => e.stakeholder === sh && e.projekt === pr
        );
        const totalMs = dayEntries.reduce((sum, e) => sum + computeUnionMs([e]), 0);
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
              Stakeholder
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
              Total
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
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
                {(totals.stakeholder[sh] || 0).toFixed(1)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTopColor: 'var(--surface-hover)', borderTopWidth: '2px' }}>
            <td className="p-2 text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              Total
            </td>
            {projects.map((pr) => (
              <td
                key={`total-${pr}`}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.5)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}
              >
                {(totals.project[pr] || 0).toFixed(1)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold border" style={{ color: 'var(--neon-cyan)', background: 'rgba(var(--surface-rgb), 0.7)', borderColor: 'rgba(var(--border-rgb), 0.3)' }}>
              {Object.values(totals.stakeholder).reduce((a, b) => a + b, 0).toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
