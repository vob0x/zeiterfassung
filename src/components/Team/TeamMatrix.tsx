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

function getIntensityColor(hours: number): string {
  if (hours === 0) return 'bg-slate-900';
  if (hours < 2) return 'bg-emerald-900/40 border-emerald-700/30';
  if (hours < 5) return 'bg-emerald-800/60 border-emerald-600/40';
  if (hours < 10) return 'bg-yellow-700/60 border-yellow-600/40';
  if (hours < 20) return 'bg-orange-700/60 border-orange-600/40';
  return 'bg-red-700/60 border-red-600/40';
}

export function TeamMatrix({ dimension, entries, members }: TeamMatrixProps) {
  const { items, memberIds, matrix, totals } = useMemo(() => {
    const dimensionKey = dimension === 'stakeholder' ? 'stakeholder' : 'project';
    const uniqueItems = [...new Set(entries.map((e) => e[dimensionKey]))].sort();
    const memberIdList = members.map((m) => m.userCodename).sort();

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
          (e) => e[dimensionKey] === item && e.userId === members.find((m) => m.userCodename === memberId)?.userId
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
    return <div className="text-slate-400">Keine Daten verfügbar</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-semibold text-slate-400 bg-slate-900/50 border border-slate-700/30">
              {dimension === 'stakeholder' ? 'Stakeholder' : 'Projekt'}
            </th>
            {memberIds.map((memberId) => (
              <th
                key={memberId}
                className="p-2 text-center text-sm font-semibold text-slate-300 bg-slate-900/50 border border-slate-700/30"
              >
                {memberId}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-semibold text-cyan-400 bg-slate-900/50 border border-slate-700/30">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item}>
              <td className="p-2 text-sm font-medium text-slate-300 bg-slate-900/30 border border-slate-700/30 sticky left-0">
                {item}
              </td>
              {memberIds.map((memberId) => {
                const hours = matrix[item][memberId];
                return (
                  <td
                    key={`${item}-${memberId}`}
                    className={`p-2 text-center text-sm font-medium text-white border border-slate-700/30 ${getIntensityColor(hours)}`}
                  >
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold text-cyan-300 bg-slate-900/50 border border-slate-700/30">
                {(totals.item[item] || 0).toFixed(1)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-600">
            <td className="p-2 text-sm font-semibold text-cyan-400 bg-slate-900/50 border border-slate-700/30">
              Total
            </td>
            {memberIds.map((memberId) => (
              <td
                key={`total-${memberId}`}
                className="p-2 text-center text-sm font-semibold text-cyan-300 bg-slate-900/50 border border-slate-700/30"
              >
                {(totals.member[memberId] || 0).toFixed(1)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold text-cyan-400 bg-slate-900/70 border border-slate-700/30">
              {Object.values(totals.member).reduce((a, b) => a + b, 0).toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
