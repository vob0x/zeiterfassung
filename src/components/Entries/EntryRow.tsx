import React, { useState } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDateDE, formatDurationHM } from '../../lib/utils';

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
      setIsDeleting(true);
      try {
        await deleteEntry(entry.id);
      } catch (error) {
        console.error('Failed to delete entry:', error);
        setIsDeleting(false);
      }
    }
  };

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Date */}
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDateDE(entry.date)}</td>

      {/* Stakeholder Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(201, 169, 98, 0.12)', color: 'var(--primary)' }}
        >
          {entry.stakeholder}
        </span>
      </td>

      {/* Project Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(110, 196, 158, 0.12)', color: 'var(--success)' }}
        >
          {entry.projekt}
        </span>
      </td>

      {/* Activity Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(129, 140, 248, 0.12)', color: '#818cf8' }}
        >
          {entry.taetigkeit}
        </span>
      </td>

      {/* Start Time */}
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{entry.start_time}</td>

      {/* End Time */}
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{entry.end_time}</td>

      {/* Duration */}
      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--neon-cyan)' }}>
        {formatDurationHM(durationMs)}
      </td>

      {/* Note */}
      <td className="px-4 py-3 text-sm max-w-xs truncate" style={{ color: 'var(--text-muted)' }} title={entry.notiz || ''}>
        {entry.notiz || '-'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 flex gap-2">
        <button
          onClick={() => onEdit(entry)}
          className="p-2 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={t('title.edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={t('confirm.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default EntryRow;
