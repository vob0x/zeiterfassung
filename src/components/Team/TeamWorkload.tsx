import React, { useMemo } from 'react';
import { TimeEntry } from '@/types';

interface TeamWorkloadProps {
  memberEntries: Map<string, TimeEntry[]>;
  entries: TimeEntry[];
}

const COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#6366f1', // indigo
  '#14b8a6', // teal
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

export function TeamWorkload({ memberEntries, entries }: TeamWorkloadProps) {
  const { memberWorkload, uniqueProjects, maxHours } = useMemo(() => {
    const uniqueProjects = [...new Set(entries.map((e) => e.project))].sort();
    const memberIds = Array.from(memberEntries.keys()).sort();

    let maxHours = 0;

    const memberWorkload = memberIds.map((memberId) => {
      const memberEntries_ = memberEntries.get(memberId) || [];
      const projectHours: Record<string, number> = {};

      for (const project of uniqueProjects) {
        const projectEntries = memberEntries_.filter((e) => e.project === project);
        let total = 0;

        for (const date of [...new Set(projectEntries.map((e) => e.date))]) {
          const dateEntries = projectEntries.filter((e) => e.date === date);
          total += computeUnionMs(dateEntries) / (1000 * 60 * 60);
        }

        projectHours[project] = total;
      }

      const totalHours = Object.values(projectHours).reduce((a, b) => a + b, 0);
      maxHours = Math.max(maxHours, totalHours);

      return { memberId, projectHours, totalHours };
    });

    return { memberWorkload, uniqueProjects, maxHours };
  }, [memberEntries, entries]);

  if (memberWorkload.length === 0) {
    return <div className="text-slate-400">Keine Daten verfügbar</div>;
  }

  return (
    <div className="space-y-4">
      {memberWorkload.map((item) => (
        <div key={item.memberId} className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">{item.memberId}</span>
            <span className="text-cyan-400 font-semibold">{item.totalHours.toFixed(1)}h</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-8 overflow-hidden border border-slate-700/50 flex">
            {item.totalHours > 0 &&
              uniqueProjects.map((project, idx) => {
                const hours = item.projectHours[project] || 0;
                const percentage = (hours / item.totalHours) * 100;

                return (
                  <div
                    key={project}
                    className="h-full transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                      opacity: 0.85,
                    }}
                    title={`${project}: ${hours.toFixed(1)}h`}
                  >
                    {percentage > 15 && (
                      <span className="text-xs font-semibold text-white">{project.slice(0, 3)}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700/50">
        {uniqueProjects.map((project, idx) => (
          <div key={project} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-sm text-slate-300">{project}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
