import React, { useState, useMemo } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/uiStore';
import { X, Clock, Search } from 'lucide-react';
import { formatDurationHM, getEffectiveDurationMs } from '../../lib/utils';
import EntryRow from './EntryRow';
import EditEntryModal from './EditEntryModal';

type SortField = 'date' | 'stakeholder' | 'projekt' | 'format' | 'taetigkeit' | 'duration';
type SortDirection = 'asc' | 'desc';

const EntriesView: React.FC = () => {
  const { t } = useI18n();
  const { entries, filters, setFilter, clearFilters } = useEntriesStore();
  const { setCurrentView } = useUiStore();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get unique values for filter dropdowns
  const uniqueStakeholders = useMemo(() => {
    const stakeholders = new Set<string>();
    entries.forEach((e) => {
      const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
      shArray.forEach((sh) => stakeholders.add(sh));
    });
    return Array.from(stakeholders).sort();
  }, [entries]);

  const uniqueProjects = useMemo(
    () => [...new Set(entries.map((e) => e.projekt))].sort(),
    [entries]
  );

  const uniqueFormats = useMemo(
    () => [...new Set(entries.map((e) => e.format || 'Einzelarbeit'))].sort(),
    [entries]
  );

  const uniqueActivities = useMemo(
    () => [...new Set(entries.map((e) => e.taetigkeit))].sort(),
    [entries]
  );

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Date range filter
    if (filters.from) {
      result = result.filter((e) => e.date >= filters.from);
    }
    if (filters.to) {
      result = result.filter((e) => e.date <= filters.to);
    }

    // Dimension filters
    if (filters.stakeholder) {
      result = result.filter((e) => {
        const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
        return shArray.includes(filters.stakeholder);
      });
    }
    if (filters.project) {
      result = result.filter((e) => e.projekt === filters.project);
    }
    if (filters.format) {
      result = result.filter((e) => (e.format || 'Einzelarbeit') === filters.format);
    }
    if (filters.activity) {
      result = result.filter((e) => e.taetigkeit === filters.activity);
    }

    // Text search
    if (filters.notiz) {
      const searchTerm = filters.notiz.toLowerCase();
      result = result.filter((e) => (e.notiz || '').toLowerCase().includes(searchTerm));
    }

    return result;
  }, [entries, filters]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];

    sorted.sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];

      // Special case for duration
      if (sortField === 'duration') {
        const [aStartH, aStartM] = a.start_time.split(':').map(Number);
        const [aEndH, aEndM] = a.end_time.split(':').map(Number);
        let aStartMins = aStartH * 60 + aStartM;
        let aEndMins = aEndH * 60 + aEndM;
        if (aEndMins < aStartMins) aEndMins += 24 * 60;
        aVal = aEndMins - aStartMins;

        const [bStartH, bStartM] = b.start_time.split(':').map(Number);
        const [bEndH, bEndM] = b.end_time.split(':').map(Number);
        let bStartMins = bStartH * 60 + bStartM;
        let bEndMins = bEndH * 60 + bEndM;
        if (bEndMins < bStartMins) bEndMins += 24 * 60;
        bVal = bEndMins - bStartMins;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  // Calculate total duration
  const totalDurationMs = useMemo(() => {
    return sortedEntries.reduce((sum, e) => sum + getEffectiveDurationMs(e), 0);
  }, [sortedEntries]);

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle edit entry
  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.from ||
    filters.to ||
    filters.stakeholder ||
    filters.project ||
    filters.format ||
    filters.activity ||
    filters.notiz;

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <h1 style={{ color: 'var(--text)' }} className="text-3xl font-bold mb-8">{t('entries.title')}</h1>

        {/* Filter Bar */}
        <div className="card p-6 mb-6">
          <h2 style={{ color: 'var(--text-secondary)' }} className="text-sm font-semibold mb-4">{t('filter.from')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Date From */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('filter.from')}
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilter('from', e.target.value)}
                className="input text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('filter.to')}
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilter('to', e.target.value)}
                className="input text-sm"
              />
            </div>

            {/* Stakeholder */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('label.stakeholder')}
              </label>
              <select
                value={filters.stakeholder}
                onChange={(e) => setFilter('stakeholder', e.target.value)}
                className="select text-sm"
              >
                <option value="">{t('all.stakeholder')}</option>
                {uniqueStakeholders.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('label.projekt')}
              </label>
              <select
                value={filters.project}
                onChange={(e) => setFilter('project', e.target.value)}
                className="select text-sm"
              >
                <option value="">{t('all.projekte')}</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('label.format')}
              </label>
              <select
                value={filters.format}
                onChange={(e) => setFilter('format', e.target.value)}
                className="select text-sm"
              >
                <option value="">{t('all.formate')}</option>
                {uniqueFormats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('label.taetigkeit')}
              </label>
              <select
                value={filters.activity}
                onChange={(e) => setFilter('activity', e.target.value)}
                className="select text-sm"
              >
                <option value="">{t('all.taetigkeiten')}</option>
                {uniqueActivities.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold mb-1">
                {t('filter.notiz')}
              </label>
              <input
                type="text"
                placeholder={t('filter.notiz')}
                value={filters.notiz}
                onChange={(e) => setFilter('notiz', e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>

          {/* Active Filters Tags & Clear Button */}
          {hasActiveFilters && (
            <div style={{ borderColor: 'var(--border)' }} className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              {filters.from && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {t('filter.from')}: {filters.from}
                  <button
                    onClick={() => setFilter('from', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.to && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {t('filter.to')}: {filters.to}
                  <button
                    onClick={() => setFilter('to', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stakeholder && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {filters.stakeholder}
                  <button
                    onClick={() => setFilter('stakeholder', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.project && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {filters.project}
                  <button
                    onClick={() => setFilter('project', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.format && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {filters.format}
                  <button
                    onClick={() => setFilter('format', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.activity && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {filters.activity}
                  <button
                    onClick={() => setFilter('activity', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.notiz && (
                <span style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs">
                  {filters.notiz}
                  <button
                    onClick={() => setFilter('notiz', '')}
                    style={{ color: 'var(--text)' }}
                    className="hover:opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={clearFilters}
                style={{ background: 'rgba(212, 112, 110, 0.3)', color: 'var(--danger)' }}
                className="ml-auto px-3 py-1 rounded text-xs font-semibold transition-colors hover:opacity-80"
              >
                {t('filter.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ color: 'var(--text-secondary)' }} className="mb-6 flex items-center gap-4 text-sm">
          <span>
            <strong style={{ color: 'var(--text)' }}>{sortedEntries.length}</strong> {t('entries.count')}
          </span>
          <span>
            <strong style={{ color: 'var(--primary)' }}>{formatDurationHM(totalDurationMs)}</strong> {t('entries.total')}
          </span>
        </div>

        {/* Entries Table */}
        {sortedEntries.length === 0 ? (
          <div className="card text-center py-16 px-6">
            {hasActiveFilters ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('entries.noMatch')}
                </p>
                <button
                  onClick={clearFilters}
                  className="btn btn-primary btn-sm mt-4"
                >
                  {t('filter.clearAll')}
                </button>
              </>
            ) : (
              <>
                <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('entries.nodata')}
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {t('welcome.hint')}
                </p>
                <button
                  onClick={() => setCurrentView('timer')}
                  className="btn btn-primary btn-sm"
                >
                  {t('nav.timer')}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="table">
              <thead style={{ backgroundColor: 'rgba(201, 169, 98, 0.03)' }}>
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.datum')}
                      {sortField === 'date' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('stakeholder')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.stakeholder')}
                      {sortField === 'stakeholder' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('projekt')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.projekt')}
                      {sortField === 'projekt' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('format')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.format')}
                      {sortField === 'format' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('taetigkeit')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.taetigkeit')}
                      {sortField === 'taetigkeit' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-xs font-semibold">
                    {t('th.von')}
                  </th>
                  <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-xs font-semibold">
                    {t('th.bis')}
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('duration')}
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      {t('th.dauer')}
                      {sortField === 'duration' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-xs font-semibold">
                    {t('th.notiz')}
                  </th>
                  <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-xs font-semibold">
                    {t('title.edit')}
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderColor: 'var(--border)' }} className="divide-y">
                {sortedEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEditEntry}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
};

export default EntriesView;
