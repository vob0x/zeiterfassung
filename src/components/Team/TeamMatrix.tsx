import React, { useMemo } from 'react';
import { TimeEntry, TeamMember } from '@/types';

interface TeamMatrixProps {
  dimension: 'stakeholder' | 'project';
  entries: TimeEntry[];
  members: TeamMember[];
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

function getIntensityColor(hours: number): { background: string; borderColor: string } {
  if (hours === 0) return { background: 'var(--surface-hover)', borderColor: 'var(--border)' };
  if (hours < 2) return { background: 'rgba(16, 185, 129, 0.4)', borderColor: 'rgba(16, 185, 129, 0.3)' };
  if (hours < 5) return { background: 'rgba(16, 185, 129, 0.6)', borderColor: 'rgba(16, 185, 129, 0.4)' };
  if (hours < 10) return { background: 'rgba(234, 179, 8, 0.6)', borderColor: 'rgba(202, 138, 4, 0.4)' };
  if (hours < 20) return { background: 'rgba(234, 88, 12, 0.6)', borderColor: 'rgba(194, 65, 12, 0.4)' };
  return { background: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgba(220, 38, 38, 0.4)' };
}

export function TeamMatrix({ dimension, entries, members }: TeamMatrixProps) {
  const { items, memberIds, matrix, totals } = useMemo(() => {
    const dimensionKey = dimension === 'stakeholder' ? 'stakeholder' : 'projekt';
    const uniqueItems = [...new Set(entries.map((e) => e[dimensionKey]))].sort();
    const memberIdList = members.map((m) => m.user_id).sort();

    const matrix: Record<string, Record<string, number>> = {};
    const itemTotals: Record<string, number> = {};
    const memberTotals: Record<string, number> = {};

    // Initialize
    for (const item of uniqueItems) {
      matrix[item] = {};
      itemTotals[item] = 0;
      for (const memberId of memberIdList) {
        matrix[item][memberId] = 0;
      }
    }

    for (const memberId of memberIdList) {
      memberTotals[memberId] = 0;
    }

    // Fill matrix
    for (const item of uniqueItems) {
      for (const memberId of memberIdList) {
        const memberItemEntries = entries.filter(
          (e) => e[dimensionKey] === item && e.user_id === members.find((m) => m.user_id === memberId)?.user_id
        );

        let total = 0;
        for (const date of [...new Set(memberItemEntries.map((e) => e.date))]) {
          const dateEntries = memberItemEntries.filter((e) => e.date === date);
          total += computeUnionMs(dateEntries) / (1000 * 60 * 60);
        }

        matrix[item][memberId] = total;
        itemTotals[item] += total;
        memberTotals[memberId] += total;
      }
    }

    return { items: uniqueItems, memberIds: memberIdList, matrix, totals: { item: itemTotals, member: memberTotals } };
  }, [dimension, entries, members]);

  if (items.length === 0 || memberIds.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>Keine Daten verfügbar</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-semibold border" style={{ color: 'var(--text-muted)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              {dimension === 'stakeholder' ? 'Stakeholder' : 'Projekt'}
            </th>
            {memberIds.map((memberId) => (
              <th
                key={memberId}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
              >
                {memberId}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item}>
              <td className="p-2 text-sm font-medium border sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {item}
              </td>
              {memberIds.map((memberId) => {
                const hours = matrix[item][memberId];
                return (
                  <td
                    key={`${item}-${memberId}`}
                    className={`p-2 text-center text-sm font-medium border ${getIntensityColor(hours)}`}
                    style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                  >
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold border" style={{ color: '#cffafe', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
                {(totals.item[item] || 0).toFixed(1)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td className="p-2 text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
              Total
            </td>
            {memberIds.map((memberId) => (
              <td
                key={`total-${memberId}`}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: '#cffafe', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}
              >
                {(totals.member[memberId] || 0).toFixed(1)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              {Object.values(totals.member).reduce((a, b) => a + b, 0).toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
