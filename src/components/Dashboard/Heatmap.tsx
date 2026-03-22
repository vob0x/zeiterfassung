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

function getIntensityColor(hours: number): string {
  if (hours === 0) return 'bg-slate-900';
  if (hours < 1) return 'bg-emerald-900/40 border-emerald-700/30';
  if (hours < 3) return 'bg-emerald-800/60 border-emerald-600/40';
  if (hours < 6) return 'bg-yellow-700/60 border-yellow-600/40';
  if (hours < 10) return 'bg-orange-700/60 border-orange-600/40';
  return 'bg-red-700/60 border-red-600/40';
}

export function Heatmap({ entries }: HeatmapProps) {
  const { stakeholders, projects, matrix, totals } = useMemo(() => {
    const uniqueStakeholders = [...new Set(entries.map((e) => e.stakeholder))].sort();
    const uniqueProjects = [...new Set(entries.map((e) => e.project))].sort();

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
          (e) => e.stakeholder === sh && e.project === pr
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
            <th className="p-2 text-left text-sm font-semibold text-slate-400 bg-slate-900/50 border border-slate-700/30">
              Stakeholder
            </th>
            {projects.map((pr) => (
              <th
                key={pr}
                className="p-2 text-center text-sm font-semibold text-slate-300 bg-slate-900/50 border border-slate-700/30"
              >
                {pr}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-semibold text-cyan-400 bg-slate-900/50 border border-slate-700/30">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {stakeholders.map((sh) => (
            <tr key={sh}>
              <td className="p-2 text-sm font-medium text-slate-300 bg-slate-900/30 border border-slate-700/30 sticky left-0">
                {sh}
              </td>
              {projects.map((pr) => {
                const hours = matrix[sh][pr];
                return (
                  <td
                    key={`${sh}-${pr}`}
                    className={`p-2 text-center text-sm font-medium text-white border border-slate-700/30 ${getIntensityColor(hours)}`}
                  >
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold text-cyan-300 bg-slate-900/50 border border-slate-700/30">
                {(totals.stakeholder[sh] || 0).toFixed(1)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-600">
            <td className="p-2 text-sm font-semibold text-cyan-400 bg-slate-900/50 border border-slate-700/30">
              Total
            </td>
            {projects.map((pr) => (
              <td
                key={`total-${pr}`}
                className="p-2 text-center text-sm font-semibold text-cyan-300 bg-slate-900/50 border border-slate-700/30"
              >
                {(totals.project[pr] || 0).toFixed(1)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold text-cyan-400 bg-slate-900/70 border border-slate-700/30">
              {Object.values(totals.stakeholder).reduce((a, b) => a + b, 0).toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
