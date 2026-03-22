import React, { useState } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDateDE, formatDurationHM, cn } from '../../lib/utils';

interface EntryRowProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
}

const EntryRow: React.FC<EntryRowProps> = ({ entry, onEdit }) => {
  const { t } = useI18n();
  const { delete: deleteEntry } = useEntriesStore();
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate duration in milliseconds
  const [startH, startM] = entry.start_time.split(':').map(Number);
  const [endH, endM] = entry.end_time.split(':').map(Number);
  let startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;

  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const durationMs = (endMins - startMins) * 60000;

  const handleDelete = async () => {
    if (confirm(t('confirm.delete'))) {
      try {
        await deleteEntry(entry.id);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const getColorClass = (value: string) => {
    // Different colors for different categories
    const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-600/30 text-blue-300',
      'bg-purple-600/30 text-purple-300',
      'bg-pink-600/30 text-pink-300',
      'bg-indigo-600/30 text-indigo-300',
      'bg-cyan-600/30 text-cyan-300',
    ];
    return colors[hash % colors.length];
  };

  return (
    <tr className="hover:bg-slate-750 transition-colors border-b border-slate-700">
      {/* Date */}
      <td className="px-4 py-3 text-sm text-slate-300">{formatDateDE(entry.date)}</td>

      {/* Stakeholder Badge */}
      <td className="px-4 py-3">
        <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-semibold', getColorClass(entry.stakeholder))}>
          {entry.stakeholder}
        </span>
      </td>

      {/* Project Badge */}
      <td className="px-4 py-3">
        <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-semibold', getColorClass(entry.projekt))}>
          {entry.projekt}
        </span>
      </td>

      {/* Activity Badge */}
      <td className="px-4 py-3">
        <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-semibold', getColorClass(entry.taetigkeit))}>
          {entry.taetigkeit}
        </span>
      </td>

      {/* Start Time */}
      <td className="px-4 py-3 text-sm text-slate-400">{entry.start_time}</td>

      {/* End Time */}
      <td className="px-4 py-3 text-sm text-slate-400">{entry.end_time}</td>

      {/* Duration */}
      <td className="px-4 py-3 text-sm font-semibold text-cyan-400">
        {formatDurationHM(durationMs)}
      </td>

      {/* Note */}
      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate" title={entry.notiz || ''}>
        {entry.notiz || '-'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 flex gap-2">
        <button
          onClick={() => onEdit(entry)}
          className="p-2 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title={t('title.edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-red-600/30 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
          title={t('confirm.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default EntryRow;
