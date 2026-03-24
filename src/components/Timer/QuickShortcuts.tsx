import { useState, useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { Pin, X } from 'lucide-react';
import { getUserData, setUserData } from '@/lib/userStorage';

interface ShortcutItem {
  stakeholder: string;
  projekt: string;
  taetigkeit?: string;
  frequency?: number;
  isPinned?: boolean;
}

const QuickShortcuts: React.FC = () => {
  const { t } = useI18n();
  const { addSlot } = useTimerStore();
  const { entries } = useEntriesStore();
  const [pinnedShortcuts, setPinnedShortcuts] = useState<ShortcutItem[]>(() => {
    return getUserData<ShortcutItem[]>('pinnedShortcuts', []);
  });

  // Calculate frequency of stakeholder+project combinations from actual entries
  const autoShortcuts = useMemo(() => {
    const freq: Record<string, number> = {};

    entries.forEach((entry) => {
      if (entry.stakeholder && entry.projekt) {
        const key = `${entry.stakeholder}|${entry.projekt}`;
        freq[key] = (freq[key] || 0) + 1;
      }
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, frequency]) => {
        const [stakeholder, projekt] = key.split('|');
        return { stakeholder, projekt, frequency };
      });
  }, [entries]);

  // Deduplicate: filter out auto shortcuts that are already pinned
  const dedupedAutoShortcuts = autoShortcuts.filter(
    (auto) =>
      !pinnedShortcuts.some((p) => p.stakeholder === auto.stakeholder && p.projekt === auto.projekt)
  );

  // Handle shortcut click
  const handleShortcutClick = (shortcut: ShortcutItem) => {
    addSlot({
      stakeholder: shortcut.stakeholder,
      projekt: shortcut.projekt,
      taetigkeit: shortcut.taetigkeit || '',
      notiz: '',
    });
  };

  // Delete a shortcut (remove from pinned and hide from auto)
  const handleDelete = (shortcut: ShortcutItem) => {
    const updated = pinnedShortcuts.filter(
      (p) => !(p.stakeholder === shortcut.stakeholder && p.projekt === shortcut.projekt)
    );
    setPinnedShortcuts(updated);
    setUserData('pinnedShortcuts', updated);
  };

  const allShortcuts = [...pinnedShortcuts, ...dedupedAutoShortcuts];

  if (allShortcuts.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '4px 0' }}>
        {t('sc.needData')}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allShortcuts.map((shortcut, idx) => {
        const isPinned = pinnedShortcuts.some(
          (p) => p.stakeholder === shortcut.stakeholder && p.projekt === shortcut.projekt
        );

        return (
          <div
            key={`${shortcut.stakeholder}-${shortcut.projekt}-${idx}`}
            className="group"
            style={{ position: 'relative', display: 'inline-flex' }}
          >
            {/* V5.15 quick-chip style */}
            <button
              onClick={() => handleShortcutClick(shortcut)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                paddingRight: '28px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${isPinned ? 'rgba(229,168,75,0.25)' : 'var(--border)'}`,
                background: isPinned ? 'rgba(229,168,75,0.06)' : 'var(--surface)',
                color: isPinned ? 'var(--warning)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isPinned ? 'rgba(229,168,75,0.25)' : 'var(--border)';
                e.currentTarget.style.color = isPinned ? 'var(--warning)' : 'var(--text-secondary)';
              }}
            >
              {isPinned && <Pin className="w-3 h-3" />}
              {shortcut.stakeholder}/{shortcut.projekt}
            </button>

            {/* Delete button (always visible on hover) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(shortcut);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                position: 'absolute',
                right: '2px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(212, 112, 110, 0.15)',
                color: 'var(--danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              title={t('timer.removeTask')}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default QuickShortcuts;
