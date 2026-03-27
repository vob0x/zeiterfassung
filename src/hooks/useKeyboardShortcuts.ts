import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useEntriesStore } from '../stores/entriesStore';

export function useKeyboardShortcuts() {
  const { switchView, showToast } = useUiStore();
  const { entries } = useEntriesStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow ESC to close dialogs even when focused
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Keyboard shortcuts
      switch (event.key.toLowerCase()) {
        case ' ':
          // Space: Start/pause timer (would need timer store integration)
          event.preventDefault();
          showToast('Timer toggle', 'info');
          break;

        case 's':
          // S: Stop & save timer
          event.preventDefault();
          showToast('Timer saved', 'success');
          break;

        case 'n':
          // N: Add new task/entry
          event.preventDefault();
          showToast('New entry dialog would open', 'info');
          break;

        case '?':
          // ?: Show keyboard shortcuts overlay
          event.preventDefault();
          showToast(
            'Shortcuts: Space=Start/Pause, S=Save, N=New, 1-5=Switch View, F=Filter, Esc=Close',
            'info',
            5000
          );
          break;

        case 'escape':
        case 'esc':
          // ESC: Close modal/overlay
          const closeButtons = document.querySelectorAll('[data-close-shortcut]');
          if (closeButtons.length > 0) {
            (closeButtons[0] as HTMLButtonElement).click();
          }
          break;

        case 'f':
          // F: Focus filter input (not navigate)
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            const filterInput = document.querySelector('[data-filter-input]') as HTMLInputElement;
            if (filterInput) {
              filterInput.focus();
            }
          }
          break;

        case '1':
          event.preventDefault();
          switchView('timer');
          break;

        case '2':
          event.preventDefault();
          switchView('entries');
          break;

        case '3':
          event.preventDefault();
          switchView('dashboard');
          break;

        case '4':
          event.preventDefault();
          switchView('manage');
          break;

        case '5':
          event.preventDefault();
          switchView('team');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [switchView, showToast, entries]);
}
