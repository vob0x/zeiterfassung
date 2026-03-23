import React, { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { PeriodType } from '@/types';
import { computeUnionMs } from '../../lib/utils';
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
            className={`btn btn-sm rounded-lg font-medium transition-all ${
              period === p
                ? 'btn-primary'
                : 'btn-secondary'
            }`}
          >
            {t(`dash.${p}`)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.stakeholder}
            onChange={(e) => setFilter('stakeholder', e.target.value)}
            className="select"
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
            className="select"
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
            className="select"
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
            className="input flex-1"
          />

          {hasActiveFilters && (
            <button
              onClick={() => clearFilters()}
              className="btn btn-secondary btn-sm"
            >
              {t('filter.clearAll')}
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div style={{ color: 'var(--primary)' }} className="text-sm">
            {filteredEntries.length} {t('entries.count')}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <KpiCards today={kpiToday} period={kpiPeriod} entries={kpiEntries} />

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="card text-center py-16 px-6">
          <div className="text-4xl mb-4" style={{ opacity: 0.4 }}>📭</div>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('dash.noEntries')}
          </p>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.shxpr')}</h2>
            <Heatmap entries={filteredEntries} />
          </div>

          {/* Activity Breakdown */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.byActivity')}</h2>
            <ActivityBars entries={filteredEntries} />
          </div>

          {/* Timeline Chart */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.timeline')}</h2>
            <TimelineChart entries={filteredEntries} />
          </div>
        </>
      )}
    </div>
  );
}
