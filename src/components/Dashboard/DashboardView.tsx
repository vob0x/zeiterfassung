import { useMemo, useState, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useUiStore } from '../../stores/uiStore';
import { PeriodType, FilterState } from '@/types';
import { formatDateISO } from '../../lib/utils';
import { KpiCards } from './KpiCards';
import { Heatmap } from './Heatmap';
import { ActivityBars } from './ActivityBars';
import { TimelineChart } from './TimelineChart';
import { Inbox } from 'lucide-react';

export default function DashboardView() {
  const { t } = useI18n();
  const entries = useEntriesStore((state) => state.entries);
  const { setFilter, clearFilters, filters } = useEntriesStore();
  const { stakeholders, projects, activities, formats } = useMasterStore();
  const [period, setPeriod] = useState<PeriodType>('day');

  // Compute date range based on period
  // Uses formatDateISO (local time) — NOT toISOString (UTC) to avoid
  // date shift issues in CET/CEST timezone (Switzerland)
  const dateRange = useMemo(() => {
    const today = new Date();
    const todayISO = formatDateISO(today); // Local YYYY-MM-DD

    switch (period) {
      case 'day':
        return { start: todayISO, end: todayISO };
      case 'week': {
        // European week: Monday = start (ISO 8601)
        const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diff = day === 0 ? 6 : day - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diff);
        return { start: formatDateISO(monday), end: todayISO };
      }
      case 'month': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatDateISO(first), end: todayISO };
      }
      case 'year': {
        const jan1 = new Date(today.getFullYear(), 0, 1);
        return { start: formatDateISO(jan1), end: todayISO };
      }
      case 'all':
        return { start: null, end: null };
    }
  }, [period]);

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (dateRange?.start && entry.date < dateRange.start) return false;
      if (dateRange?.end && entry.date > dateRange.end) return false;

      // Handle stakeholder as array
      if (filters.stakeholder) {
        const stakeholderArray = Array.isArray(entry.stakeholder) ? entry.stakeholder : [entry.stakeholder];
        if (!stakeholderArray.includes(filters.stakeholder)) return false;
      }
      if (filters.project && entry.projekt !== filters.project) return false;
      if (filters.activity && entry.taetigkeit !== filters.activity) return false;
      if (filters.format && entry.format !== filters.format) return false;

      if (filters.notiz) {
        const searchTerm = filters.notiz.toLowerCase();
        const entryNotiz = (entry.notiz || '').toLowerCase();
        if (!entryNotiz.includes(searchTerm)) return false;
      }

      return true;
    });
  }, [entries, dateRange, filters]);

  // Compute today's entries (using local date, not UTC)
  const todayStr = formatDateISO(new Date());
  const todayEntries = entries.filter((e) => e.date === todayStr);

  // Sum of duration_ms — consistent with team dashboard and respects parallel timers
  const kpiToday = todayEntries.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / (1000 * 60 * 60);

  const kpiPeriod = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / (1000 * 60 * 60);
  }, [filteredEntries]);

  const kpiEntries = filteredEntries.length;

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const { setCurrentView } = useUiStore();

  // Drill-down: set filters and navigate to entries view
  const drillDown = useCallback((drillFilters: Partial<FilterState>) => {
    clearFilters();
    // Apply date range from current period
    if (dateRange?.start) setFilter('from', dateRange.start);
    if (dateRange?.end) setFilter('to', dateRange.end);
    // Apply any active dashboard filters first
    if (filters.stakeholder) setFilter('stakeholder', filters.stakeholder);
    if (filters.project) setFilter('project', filters.project);
    if (filters.activity) setFilter('activity', filters.activity);
    if (filters.format) setFilter('format', filters.format);
    // Then override with drill-down specific filters
    for (const [key, value] of Object.entries(drillFilters)) {
      if (value) setFilter(key as keyof FilterState, value);
    }
    setCurrentView('entries');
  }, [dateRange, filters, clearFilters, setFilter, setCurrentView]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {(['day', 'week', 'month', 'year', 'all'] as PeriodType[]).map((p) => (
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
            value={filters.format}
            onChange={(e) => setFilter('format', e.target.value)}
            className="select"
          >
            <option value="">{t('all.formate')}</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
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
      <KpiCards today={kpiToday} period={kpiPeriod} entries={kpiEntries} onDrillDown={() => drillDown({})} />

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="card text-center py-16 px-6">
          <Inbox className="w-10 h-10 mx-auto mb-4" style={{ opacity: 0.4, color: 'var(--text-muted)' }} />
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('dash.noEntries')}
          </p>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.shxpr')}</h2>
            <Heatmap entries={filteredEntries} onDrillDown={drillDown} />
          </div>

          {/* Activity Breakdown */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.byActivity')}</h2>
            <ActivityBars entries={filteredEntries} onDrillDown={drillDown} />
          </div>

          {/* Format Breakdown */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.byFormat')}</h2>
            <ActivityBars entries={filteredEntries} isFormat onDrillDown={drillDown} />
          </div>

          {/* Timeline Chart */}
          <div className="card p-4">
            <h2 style={{ color: 'var(--text)' }} className="text-lg font-semibold mb-4">{t('dash.timeline')}</h2>
            <TimelineChart entries={filteredEntries} onDrillDown={drillDown} />
          </div>
        </>
      )}
    </div>
  );
}
