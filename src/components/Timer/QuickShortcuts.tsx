import React, { useState, useMemo } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useI18n } from '../../i18n';
import { Plus, Zap, Pin, PinOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ShortcutItem {
  stakeholder: string;
  projekt: string;
  frequency?: number;
  isPinned?: boolean;
}

const QuickShortcuts: React.FC = () => {
  const { t } = useI18n();
  const { taskSlots, addSlot } = useTimerStore();
  const [pinnedShortcuts, setPinnedShortcuts] = useState<ShortcutItem[]>(() => {
    const saved = localStorage.getItem('pinnedShortcuts');
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate frequency of stakeholder+project combinations
  const autoShortcuts = useMemo(() => {
    const freq: Record<string, number> = {};

    taskSlots.forEach((slot) => {
      const key = `${slot.stakeholder}|${slot.projekt}`;
      freq[key] = (freq[key] || 0) + 1;
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, frequency]) => {
        const [stakeholder, projekt] = key.split('|');
        return { stakeholder, projekt, frequency };
      });
  }, [taskSlots]);

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
      taetigkeit: '',
      notiz: '',
    });
  };

  // Toggle pin status
  const handleTogglePin = (shortcut: ShortcutItem) => {
    const isPinned = pinnedShortcuts.some(
      (p) => p.stakeholder === shortcut.stakeholder && p.projekt === shortcut.projekt
    );

    if (isPinned) {
      const updated = pinnedShortcuts.filter(
        (p) => !(p.stakeholder === shortcut.stakeholder && p.projekt === shortcut.projekt)
      );
      setPinnedShortcuts(updated);
      localStorage.setItem('pinnedShortcuts', JSON.stringify(updated));
    } else {
      if (pinnedShortcuts.length < 10) {
        const updated = [...pinnedShortcuts, { ...shortcut, isPinned: true }];
        setPinnedShortcuts(updated);
        localStorage.setItem('pinnedShortcuts', JSON.stringify(updated));
      }
    }
  };

  const allShortcuts = [...pinnedShortcuts, ...dedupedAutoShortcuts];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {pinnedShortcuts.length > 0 && <Pin className="w-4 h-4 text-yellow-400" />}
        {dedupedAutoShortcuts.length > 0 && <Zap className="w-4 h-4 text-cyan-400" />}
        <h3 className="text-sm font-semibold text-slate-300">
          {allShortcuts.length > 0 ? t('sc.addShort') : t('sc.needData')}
        </h3>
      </div>

      {/* Shortcuts Grid */}
      {allShortcuts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allShortcuts.map((shortcut, idx) => {
            const isPinned = pinnedShortcuts.some(
              (p) => p.stakeholder === shortcut.stakeholder && p.projekt === shortcut.projekt
            );

            return (
              <div
                key={`${shortcut.stakeholder}-${shortcut.projekt}-${idx}`}
                className="group relative"
              >
                <button
                  onClick={() => handleShortcutClick(shortcut)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors text-left truncate"
                >
                  {shortcut.stakeholder}/{shortcut.projekt}
                </button>

                {/* Pin toggle button (appears on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(shortcut);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-600 hover:bg-slate-500 rounded text-xs"
                  title={isPinned ? t('sc.unpin') : t('sc.pin')}
                >
                  {isPinned ? (
                    <PinOff className="w-3 h-3 text-yellow-400" />
                  ) : (
                    <Pin className="w-3 h-3 text-slate-300" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-slate-500 text-center py-4">
          {t('sc.needData')}
        </div>
      )}
    </div>
  );
};

export default QuickShortcuts;
