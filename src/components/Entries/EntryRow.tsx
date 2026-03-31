import React, { useState } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDateDE, formatDurationHM, getEffectiveDurationMs } from '../../lib/utils';
import ConfirmDialog from '../UI/ConfirmDialog';

interface EntryRowProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
}

const EntryRow: React.FC<EntryRowProps> = ({ entry, onEdit }) => {
  const { t } = useI18n();
  const { delete: deleteEntry } = useEntriesStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use effective duration: duration_ms if plausible, else Von-Bis
  const durationMs = getEffectiveDurationMs(entry);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(entry.id);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setIsDeleting(false);
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
          className="inline-block px-2 py-0.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(201, 169, 98, 0.07)', color: 'var(--neon-cyan)', border: '1px solid rgba(201, 169, 98, 0.08)', whiteSpace: 'nowrap' }}
        >
          {(Array.isArray(entry.stakeholder) ? entry.stakeholder.join(', ') : entry.stakeholder) || '–'}
        </span>
      </td>

      {/* Project Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2 py-0.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(155, 142, 196, 0.07)', color: 'var(--neon-violet, #9B8EC4)', border: '1px solid rgba(155, 142, 196, 0.08)', whiteSpace: 'nowrap' }}
        >
          {entry.projekt || '–'}
        </span>
      </td>

      {/* Format Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2 py-0.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(168, 162, 198, 0.08)', color: '#B8ACDC', border: '1px solid rgba(168, 162, 198, 0.08)', whiteSpace: 'nowrap' }}
        >
          {entry.format || 'Einzelarbeit'}
        </span>
      </td>

      {/* Activity Badge */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2 py-0.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(110, 196, 158, 0.08)', color: 'var(--success)', border: '1px solid rgba(110, 196, 158, 0.08)', whiteSpace: 'nowrap' }}
        >
          {entry.taetigkeit || '–'}
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
      <td className="px-4 py-3 flex gap-1">
        <button
          onClick={() => onEdit(entry)}
          className="p-2.5 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={t('title.edit')}
          aria-label={`${t('title.edit')} ${entry.stakeholder} ${entry.projekt} ${entry.start_time}-${entry.end_time}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="p-2.5 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={t('title.delete')}
          aria-label={`${t('title.delete')} ${entry.stakeholder} ${entry.projekt} ${entry.start_time}-${entry.end_time}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('confirm.delete')}
        message={`${entry.stakeholder} — ${entry.projekt} (${entry.start_time}–${entry.end_time})`}
        confirmText={t('title.delete')}
        cancelText={t('btn.cancel')}
        onConfirm={handleDelete}
        isDanger
      />
    </tr>
  );
};

export default EntryRow;
