import React, { useState, useMemo } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { X } from 'lucide-react';
import { formatDurationHM, computeUnionMs, cn } from '../../lib/utils';
import EntryRow from './EntryRow';
import EditEntryModal from './EditEntryModal';

type SortField = 'date' | 'stakeholder' | 'projekt' | 'taetigkeit' | 'duration';
type SortDirection = 'asc' | 'desc';

const EntriesView: React.FC = () => {
  const { t } = useI18n();
  const { entries, filters, setFilter, clearFilters } = useEntriesStore();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get unique values for filter dropdowns
  const uniqueStakeholders = useMemo(
    () => [...new Set(entries.map((e) => e.stakeholder))].sort(),
    [entries]
  );

  const uniqueProjects = useMemo(
    () => [...new Set(entries.map((e) => e.projekt))].sort(),
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
      result = result.filter((e) => e.stakeholder === filters.stakeholder);
    }
    if (filters.project) {
      result = result.filter((e) => e.projekt === filters.project);
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
    // Group by date and compute union per day
    const byDate = new Map<string, TimeEntry[]>();
    sortedEntries.forEach((e) => {
      if (!byDate.has(e.date)) {
        byDate.set(e.date, []);
      }
      byDate.get(e.date)!.push(e);
    });

    let total = 0;
    byDate.forEach((dayEntries) => {
      total += computeUnionMs(dayEntries);
    });
    return total;
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
    filters.activity ||
    filters.notiz;

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <h1 className="text-3xl font-bold text-white mb-8">{t('entries.title')}</h1>

        {/* Filter Bar */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('filter.from')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('filter.from')}
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilter('from', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('filter.to')}
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilter('to', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>

            {/* Stakeholder */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('label.stakeholder')}
              </label>
              <select
                value={filters.stakeholder}
                onChange={(e) => setFilter('stakeholder', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('label.projekt')}
              </label>
              <select
                value={filters.project}
                onChange={(e) => setFilter('project', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">{t('all.projekte')}</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('label.taetigkeit')}
              </label>
              <select
                value={filters.activity}
                onChange={(e) => setFilter('activity', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t('filter.notiz')}
              </label>
              <input
                type="text"
                placeholder={t('filter.notiz')}
                value={filters.notiz}
                onChange={(e) => setFilter('notiz', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
          </div>

          {/* Active Filters Tags & Clear Button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-700">
              {filters.from && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {t('filter.from')}: {filters.from}
                  <button
                    onClick={() => setFilter('from', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.to && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {t('filter.to')}: {filters.to}
                  <button
                    onClick={() => setFilter('to', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stakeholder && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {filters.stakeholder}
                  <button
                    onClick={() => setFilter('stakeholder', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.project && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {filters.project}
                  <button
                    onClick={() => setFilter('project', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.activity && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {filters.activity}
                  <button
                    onClick={() => setFilter('activity', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.notiz && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {filters.notiz}
                  <button
                    onClick={() => setFilter('notiz', '')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={clearFilters}
                className="ml-auto px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-400 rounded text-xs font-semibold transition-colors"
              >
                {t('filter.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-6 flex items-center gap-4 text-sm text-slate-300">
          <span>
            <strong className="text-white">{sortedEntries.length}</strong> {t('entries.count')}
          </span>
          <span>
            <strong className="text-cyan-400">{formatDurationHM(totalDurationMs)}</strong> {t('entries.total')}
          </span>
        </div>

        {/* Entries Table */}
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400">
              {hasActiveFilters ? t('entries.noMatch') : t('entries.nodata')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
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
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
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
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {t('th.projekt')}
                      {sortField === 'projekt' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('taetigkeit')}
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {t('th.taetigkeit')}
                      {sortField === 'taetigkeit' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    {t('th.von')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    {t('th.bis')}
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('duration')}
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {t('th.dauer')}
                      {sortField === 'duration' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    {t('th.notiz')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    {t('title.edit')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
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
