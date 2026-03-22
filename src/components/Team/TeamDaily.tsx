import React, { useMemo } from 'react';
import { TimeEntry, TeamMember } from '@/types';

interface TeamDailyProps {
  memberEntries: Map<string, TimeEntry[]>;
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

function getIntensityColor(hours: number): { background: string; color: string } {
  if (hours === 0) return { background: 'var(--surface-solid)', color: 'var(--text-muted)' };
  if (hours < 4) return { background: 'var(--surface-hover)', color: '#e5e7eb' };
  if (hours < 8) return { background: '#1e3a8a', color: '#dbeafe' };
  if (hours < 12) return { background: '#155e75', color: '#cffafe' };
  return { background: '#15803d', color: '#dcfce7' };
}

export function TeamDaily({ memberEntries, entries }: TeamDailyProps) {
  const { dates, memberIds, matrix, averages } = useMemo(() => {
    const uniqueDates = [...new Set(entries.map((e) => e.date))].sort();
    const uniqueMemberIds = Array.from(memberEntries.keys()).sort();

    const matrix: Record<string, Record<string, number>> = {};
    const averages: Record<string, number> = {};

    for (const memberId of uniqueMemberIds) {
      matrix[memberId] = {};
      let total = 0;
      let dayCount = 0;

      for (const date of uniqueDates) {
        const memberDateEntries = (memberEntries.get(memberId) || []).filter((e) => e.date === date);
        const hours = computeUnionMs(memberDateEntries) / (1000 * 60 * 60);
        matrix[memberId][date] = hours;
        if (hours > 0) {
          total += hours;
          dayCount += 1;
        }
      }

      averages[memberId] = dayCount > 0 ? total / dayCount : 0;
    }

    return { dates: uniqueDates, memberIds: uniqueMemberIds, matrix, averages };
  }, [memberEntries, entries]);

  if (dates.length === 0 || memberIds.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>Keine Daten verfügbar</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-semibold border sticky left-0 z-10" style={{ color: 'var(--text-muted)', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
              Person
            </th>
            {dates.map((date) => {
              const dateObj = new Date(date);
              const dayShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dateObj.getDay()];
              const day = dateObj.getDate();

              return (
                <th
                  key={date}
                  className="p-2 text-center font-semibold border"
                  style={{ color: 'var(--text-secondary)', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}
                >
                  <div className="text-xs">{dayShort}</div>
                  <div>{day}</div>
                </th>
              );
            })}
            <th className="p-2 text-center font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
              ⌀
            </th>
          </tr>
        </thead>
        <tbody>
          {memberIds.map((memberId) => (
            <tr key={memberId}>
              <td className="p-2 font-medium border sticky left-0 z-10" style={{ color: 'var(--text-secondary)', background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {memberId}
              </td>
              {dates.map((date) => {
                const hours = matrix[memberId][date] || 0;
                const colorStyle = getIntensityColor(hours);
                return (
                  <td
                    key={`${memberId}-${date}`}
                    className="p-2 text-center font-semibold border"
                    style={{ ...colorStyle, borderColor: 'var(--border)' }}
                  >
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center font-semibold border" style={{ color: '#cffafe', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
                {averages[memberId].toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
