import React, { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { TimeEntry, PeriodType } from '@/types';
import { KpiCards } from './KpiCards';
import { Heatmap } from './Heatmap';
import { ActivityBars } from './ActivityBars';
import { TimelineChart } from './TimelineChart';

export default function DashboardView() {
  const { t } = useI18n();
  const entries = useEntriesStore((state) => state.entries);
  const { setFilter, clearFilters, filters } = useEntriesStore();
  const { stakeholders, projects, activities } = useMasterStore();
  const [period, setPeriod] = useState<PeriodType>('week');

  // Compute date range based on period
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setFullYear(today.getFullYear(), 0, 1);
        break;
      case 'all':
        return { start: null, end: null };
    }

    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, [period]);

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (dateRange.start && entry.date < dateRange.start) return false;
      if (dateRange.end && entry.date > dateRange.end) return false;

      if (filters.stakeholder && entry.stakeholder !== filters.stakeholder) return false;
      if (filters.project && entry.projekt !== filters.project) return false;
      if (filters.activity && entry.taetigkeit !== filters.activity) return false;

      if (filters.notiz) {
        const searchTerm = filters.notiz.toLowerCase();
        const entryNotiz = (entry.notiz || '').toLowerCase();
        if (!entryNotiz.includes(searchTerm)) return false;
      }

      return true;
    });
  }, [entries, dateRange, filters]);

  // Compute today's entries
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => e.date === today);

  // Compute union of overlapping intervals per day (CRITICAL ALGORITHM)
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

  const kpiToday = computeUnionMs(todayEntries) / (1000 * 60 * 60);

  // Fix: compute kpiPeriod correctly by grouping by date first
  const kpiPeriod = useMemo(() => {
    const byDate = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      if (!byDate.has(entry.date)) {
        byDate.set(entry.date, []);
      }
      byDate.get(entry.date)!.push(entry);
    });

    let total = 0;
    byDate.forEach((dayEntries) => {
      total += computeUnionMs(dayEntries) / (1000 * 60 * 60);
    });
    return total;
  }, [filteredEntries]);

  const kpiEntries = filteredEntries.length;

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {(['week', 'month', 'year', 'all'] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === p
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {t(`dash.${p}`)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 backdrop-blur-sm border border-slate-700/50">
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.stakeholder}
            onChange={(e) => setFilter('stakeholder', e.target.value)}
            className="px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">{t('all.stakeholder')}</option>
            {stakeholders.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filters.project}
            onChange={(e) => setFilter('project', e.target.value)}
            className="px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">{t('all.projekte')}</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filters.activity}
            onChange={(e) => setFilter('activity', e.target.value)}
            className="px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">{t('all.taetigkeiten')}</option>
            {activities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={t('filter.notiz')}
            value={filters.notiz}
            onChange={(e) => setFilter('notiz', e.target.value)}
            className="px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none flex-1"
          />

          {hasActiveFilters && (
            <button
              onClick={() => clearFilters()}
              className="px-3 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded border border-slate-600"
            >
              {t('filter.clearAll')}
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="text-sm text-cyan-400">
            {t('filter.notiz')} {t('filter.notiz')}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <KpiCards today={kpiToday} period={kpiPeriod} entries={kpiEntries} />

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {t('dash.noEntries')}
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">{t('dash.shxpr')}</h2>
            <Heatmap entries={filteredEntries} />
          </div>

          {/* Activity Breakdown */}
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">{t('dash.byActivity')}</h2>
            <ActivityBars entries={filteredEntries} />
          </div>

          {/* Timeline Chart */}
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">{t('dash.timeline')}</h2>
            <TimelineChart entries={filteredEntries} />
          </div>
        </>
      )}
    </div>
  );
}
