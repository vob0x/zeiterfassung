import { useState } from 'react';
import { TimeEntry } from '@/types';
import { useI18n } from '../../i18n';
import { formatDateDE, formatDurationHM, getEffectiveDurationMs } from '../../lib/utils';
import { X, Trash2, Zap } from 'lucide-react';

interface DuplicateGroup {
  fingerprint: string;
  entries: TimeEntry[];
}

interface DuplicateReviewProps {
  groups: DuplicateGroup[];
  onRemove: (ids: string[]) => void;
  onClose: () => void;
}

export default function DuplicateReview({ groups, onRemove, onClose }: DuplicateReviewProps) {
  const { t } = useI18n();
  // Track which entry IDs are selected for removal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Pre-select all but the first (newest) entry per group
    const ids = new Set<string>();
    for (const group of groups) {
      // Sort by updated_at desc — keep the most recently updated
      const sorted = [...group.entries].sort((a, b) =>
        (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')
      );
      // Mark all except the first (newest) for removal
      for (let i = 1; i < sorted.length; i++) {
        ids.add(sorted[i].id);
      }
    }
    return ids;
  });
  const [isRemoving, setIsRemoving] = useState(false);

  const totalSelected = selectedIds.size;

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAutoAll = () => {
    const ids = new Set<string>();
    for (const group of groups) {
      const sorted = [...group.entries].sort((a, b) =>
        (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')
      );
      for (let i = 1; i < sorted.length; i++) {
        ids.add(sorted[i].id);
      }
    }
    setSelectedIds(ids);
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsRemoving(true);
    try {
      await onRemove(Array.from(selectedIds));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-lg border shadow-xl w-full max-w-2xl mx-4 sm:mx-6 flex flex-col"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          maxHeight: 'calc(100vh - 2rem)',
          maxWidth: '42rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header — fixed at top */}
          <div className="flex items-center justify-between p-4 sm:p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {groups.length} {t('manage.dupFound')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('manage.dupHint')}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Groups — scrollable middle */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {groups.map((group, gi) => (
              <div
                key={group.fingerprint}
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                <div
                  className="px-3 py-2 text-xs font-semibold flex items-center gap-2"
                  style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                >
                  <span>{t('manage.dupGroup')} {gi + 1}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{group.entries.length} {t('entries.count')}</span>
                </div>

                {/* Sort entries: newest first */}
                {[...group.entries]
                  .sort((a, b) =>
                    (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')
                  )
                  .map((entry, ei) => {
                    const isSelected = selectedIds.has(entry.id);
                    const isKept = !isSelected;
                    const durationMs = getEffectiveDurationMs(entry);
                    const stakeholderStr = Array.isArray(entry.stakeholder)
                      ? entry.stakeholder.join(', ')
                      : entry.stakeholder || '';

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                        style={{
                          borderTop: ei > 0 ? '1px solid var(--border)' : 'none',
                          background: isSelected ? 'rgba(212, 112, 110, 0.06)' : 'transparent',
                          opacity: isSelected ? 0.7 : 1,
                        }}
                        onClick={() => toggleId(entry.id)}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `2px solid ${isSelected ? 'var(--danger)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--danger)' : 'transparent',
                          }}
                        >
                          {isSelected && <X className="w-3 h-3 text-white" />}
                        </div>

                        {/* Entry details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium" style={{ color: 'var(--text)' }}>
                              {formatDateDE(entry.date)}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {entry.start_time}–{entry.end_time}
                            </span>
                            <span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>
                              {formatDurationHM(durationMs)}
                            </span>
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {stakeholderStr} · {entry.projekt} · {entry.taetigkeit}
                            {entry.format ? ` · ${entry.format}` : ''}
                            {entry.notiz ? ` — ${entry.notiz}` : ''}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: isKept ? 'rgba(110, 196, 158, 0.12)' : 'rgba(212, 112, 110, 0.12)',
                            color: isKept ? 'var(--success)' : 'var(--danger)',
                          }}
                        >
                          {isKept ? t('manage.dupKeep') : t('manage.dupRemove')}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>

          {/* Footer actions — fixed at bottom */}
          <div
            className="p-4 sm:p-5 flex flex-wrap gap-2 items-center justify-between flex-shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex gap-2">
              <button
                onClick={handleAutoAll}
                className="btn btn-sm btn-secondary flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                {t('manage.dupAutoAll')}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="btn btn-sm btn-secondary"
              >
                {t('manage.dupCancel')}
              </button>
              <button
                onClick={handleRemoveSelected}
                disabled={totalSelected === 0 || isRemoving}
                className="btn btn-sm flex items-center gap-1"
                style={{
                  background: totalSelected > 0 ? 'var(--danger)' : 'var(--surface-hover)',
                  color: totalSelected > 0 ? 'white' : 'var(--text-muted)',
                  opacity: isRemoving ? 0.6 : 1,
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isRemoving ? '...' : `${totalSelected} ${t('manage.dupRemoveSelected')}`}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
