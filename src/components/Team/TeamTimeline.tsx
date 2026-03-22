import React, { useMemo } from 'react';
import { TimeEntry, TeamMember } from '@/types';

interface TeamTimelineProps {
  memberEntries: Map<string, TimeEntry[]>;
  members: TeamMember[];
}

const MEMBER_COLORS = [
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

export function TeamTimeline({ memberEntries, members }: TeamTimelineProps) {
  const { chartData, memberColorMap, maxHours } = useMemo(() => {
    const allEntries = Array.from(memberEntries.values()).flat();

    if (allEntries.length === 0) {
      return { chartData: [], memberColorMap: {}, maxHours: 0 };
    }

    const uniqueDates = [...new Set(allEntries.map((e) => e.date))].sort();
    const chartDates = uniqueDates.slice(Math.max(0, uniqueDates.length - 14));

    const memberColorMap_ = Object.fromEntries(
      members.map((m, i) => [m.user_id, MEMBER_COLORS[i % MEMBER_COLORS.length]])
    );

    let maxHours = 0;

    const chartData = chartDates.map((date) => {
      const memberHours: Record<string, number> = {};

      for (const [memberId, entries_] of memberEntries) {
        const dateEntries = entries_.filter((e) => e.date === date);
        const hours = computeUnionMs(dateEntries) / (1000 * 60 * 60);
        memberHours[memberId] = hours;
      }

      const totalHours = Object.values(memberHours).reduce((a, b) => a + b, 0);
      maxHours = Math.max(maxHours, totalHours);

      const dateObj = new Date(date);
      const dayShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dateObj.getDay()];
      const dayNum = dateObj.getDate();

      return {
        date,
        dayLabel: `${dayShort} ${dayNum}`,
        memberHours,
        totalHours,
      };
    });

    return { chartData, memberColorMap: memberColorMap_, maxHours };
  }, [memberEntries, members]);

  if (chartData.length === 0) {
    return <div className="text-slate-400">Keine Daten verfügbar</div>;
  }

  const canvasWidth = Math.max(600, chartData.length * 40);
  const canvasHeight = 300;
  const padding = 40;
  const chartWidth = canvasWidth - padding * 2;
  const chartHeight = canvasHeight - padding * 2;
  const barWidth = chartWidth / chartData.length * 0.8;
  const barSpacing = chartWidth / chartData.length;

  return (
    <div className="overflow-x-auto pb-4">
      <svg width={canvasWidth} height={canvasHeight} className="mx-auto">
        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={canvasHeight - padding}
          stroke="#475569"
          strokeWidth="1"
        />

        {/* X-axis */}
        <line
          x1={padding}
          y1={canvasHeight - padding}
          x2={canvasWidth - padding}
          y2={canvasHeight - padding}
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Y-axis labels and grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const hours = maxHours * ratio;
          const y = canvasHeight - padding - ratio * chartHeight;

          return (
            <g key={`y-${ratio}`}>
              <line
                x1={padding - 5}
                y1={y}
                x2={padding}
                y2={y}
                stroke="#475569"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#94a3b8"
              >
                {hours.toFixed(0)}h
              </text>
              {ratio > 0 && (
                <line
                  x1={padding}
                  y1={y}
                  x2={canvasWidth - padding}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              )}
            </g>
          );
        })}

        {/* Bars */}
        {chartData.map((data, idx) => {
          let bottomY = canvasHeight - padding;
          const xPos = padding + idx * barSpacing + (barSpacing - barWidth) / 2;

          return (
            <g key={data.date}>
              {/* Stacked bars by member */}
              {data.totalHours > 0 &&
                Object.entries(data.memberHours).map(([memberId, hours]) => {
                  if (hours === 0) return null;

                  const barHeight = (hours / maxHours) * chartHeight;
                  const color = memberColorMap[memberId];

                  const rect = (
                    <rect
                      key={`bar-${data.date}-${memberId}`}
                      x={xPos}
                      y={bottomY - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill={color}
                      opacity="0.85"
                      rx="2"
                    />
                  );

                  bottomY -= barHeight;
                  return rect;
                })}

              {/* X-axis label */}
              <text
                x={xPos + barWidth / 2}
                y={canvasHeight - padding + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#cbd5e1"
              >
                {data.dayLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {members.map((member, idx) => (
          <div key={member.id} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
            />
            <span className="text-sm text-slate-300">{member.user_id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
