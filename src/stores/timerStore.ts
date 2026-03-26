import { create } from 'zustand';
import { TimerSlot } from '@/types';
import { useEntriesStore } from './entriesStore';
import { useAuthStore } from './authStore';
import { getUserData, setUserData, removeUserData } from '@/lib/userStorage';
import { formatDateISO } from '@/lib/utils';

// Serializable version for localStorage (Date → ISO string)
interface SerializedSlot {
  id: string;
  date: string;
  stakeholder: string[]; // NEW: array of stakeholders
  projekt: string;
  taetigkeit: string;
  format: string; // NEW: format field
  start_time: string;
  elapsed_ms: number;
  notiz?: string;
  is_running: boolean;
  pausedMs: number;
  isPaused: boolean;
  wasRunning: boolean; // was this timer actively running at save time?
}

interface SavedTimerState {
  slots: SerializedSlot[];
  savedAt: number; // Date.now() at save time
}

interface TimerState {
  taskSlots: TimerSlot[];
  activeSlotId: string | null;
  tickInterval: ReturnType<typeof setInterval> | null;
  error: string | null;
  addSlot: (slot: { stakeholder: string[]; projekt: string; taetigkeit: string; format: string; notiz?: string }) => void;
  removeSlot: (id: string) => void;
  resetSlot: (id: string) => void;
  updateSlotField: (
    id: string,
    field: 'stakeholder' | 'projekt' | 'taetigkeit' | 'format' | 'notiz',
    value: string | string[]
  ) => void;
  addSlotStakeholder: (id: string, stakeholder: string) => void; // NEW: add stakeholder to array
  removeSlotStakeholder: (id: string, stakeholder: string) => void; // NEW: remove stakeholder from array
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  stopAllTimers: () => void;
  getSlotElapsed: (id: string) => number;
  tick: () => void;
  saveTimers: () => void;
  restoreTimers: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

function generateId(): string {
  return `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function ensureTickInterval(get: () => TimerState, set: (partial: Partial<TimerState>) => void) {
  const state = get();
  if (!state.tickInterval) {
    const interval = setInterval(() => {
      get().tick();
    }, 500);
    set({ tickInterval: interval });
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  taskSlots: [],
  activeSlotId: null,
  tickInterval: null,
  error: null,

  addSlot: (slotData) => {
    const state = get();
    if (state.taskSlots.length >= 8) {
      set({ error: 'Maximum 8 concurrent tasks allowed' });
      return;
    }

    const now = new Date();
    const newSlot: TimerSlot = {
      stakeholder: slotData.stakeholder || [], // NEW: ensure array
      projekt: slotData.projekt,
      taetigkeit: slotData.taetigkeit,
      format: slotData.format || 'Einzelarbeit', // NEW: format field (default)
      notiz: slotData.notiz,
      id: generateId(),
      date: formatDateISO(now),
      start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      elapsed_ms: 0,
      is_running: false,
      startTime: now,
      pausedMs: 0,
      isPaused: true,
    };

    set((state) => ({
      taskSlots: [...state.taskSlots, newSlot],
    }));
  },

  removeSlot: (id: string) => {
    set((state) => ({
      taskSlots: state.taskSlots.filter((slot) => slot.id !== id),
      activeSlotId: state.activeSlotId === id ? null : state.activeSlotId,
    }));
  },

  // Reset slot timer to 0 but keep slot visible with its fields
  resetSlot: (id: string) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              startTime: new Date(),
              pausedMs: 0,
              isPaused: true,
              is_running: false,
              elapsed_ms: 0,
            }
          : slot
      ),
      activeSlotId: state.activeSlotId === id ? null : state.activeSlotId,
    }));
  },

  updateSlotField: (id, field, value) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
      ),
    }));
  },

  // NEW: Add stakeholder to slot's stakeholder array
  addSlotStakeholder: (id, stakeholder) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id && !slot.stakeholder.includes(stakeholder)
          ? { ...slot, stakeholder: [...slot.stakeholder, stakeholder] }
          : slot
      ),
    }));
  },

  // NEW: Remove stakeholder from slot's stakeholder array
  removeSlotStakeholder: (id, stakeholder) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id
          ? { ...slot, stakeholder: slot.stakeholder.filter((s) => s !== stakeholder) }
          : slot
      ),
    }));
  },

  startTimer: (id: string) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              startTime: new Date(),
              pausedMs: 0,
              isPaused: false,
              is_running: true,
            }
          : slot
      ),
      activeSlotId: id,
    }));

    ensureTickInterval(get, set);
  },

  pauseTimer: (id: string) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) => {
        if (slot.id === id && !slot.isPaused) {
          const elapsed =
            Date.now() - slot.startTime.getTime() + slot.pausedMs;
          return {
            ...slot,
            pausedMs: elapsed,
            isPaused: true,
            is_running: false,
          };
        }
        return slot;
      }),
      activeSlotId: null,
    }));
  },

  resumeTimer: (id: string) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id && slot.isPaused
          ? {
              ...slot,
              startTime: new Date(),
              isPaused: false,
              is_running: true,
            }
          : slot
      ),
      activeSlotId: id,
    }));

    ensureTickInterval(get, set);
  },

  stopTimer: (id: string) => {
    const state = get();
    const slot = state.taskSlots.find((s) => s.id === id);
    if (!slot) return;

    // Calculate final duration
    const totalMs =
      slot.pausedMs +
      (slot.isPaused ? 0 : Date.now() - slot.startTime.getTime());

    // Minimum 1 second to save (matching V5.15)
    if (totalMs < 1000) {
      set({ error: 'Timer too short' });
      return;
    }

    // Calculate start and end times
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startDate = new Date(now.getTime() - totalMs);
    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    // Save entry to entries store
    const entriesStore = useEntriesStore.getState();
    const authStore = useAuthStore.getState();

    entriesStore.add({
      date: slot.date || now.toISOString().split('T')[0],
      stakeholder: slot.stakeholder || [], // NEW: array format
      projekt: slot.projekt || '',
      taetigkeit: slot.taetigkeit || '',
      format: slot.format || 'Einzelarbeit', // NEW: include format
      start_time: startTime,
      end_time: endTime,
      duration_ms: totalMs,
      notiz: slot.notiz || '',
      user_id: authStore.profile?.id || 'local',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Reset slot (keep visible)
    get().resetSlot(id);

    // Check if any active timers remain
    const remaining = get().taskSlots;
    const hasActive = remaining.some((s) => !s.isPaused);
    if (!hasActive && state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }
  },

  stopAllTimers: () => {
    const state = get();
    const runningSlots = state.taskSlots.filter((s) => !s.isPaused || s.pausedMs > 0);
    runningSlots.forEach((slot) => {
      const totalMs = slot.pausedMs + (slot.isPaused ? 0 : Date.now() - slot.startTime.getTime());
      if (totalMs >= 1000) {
        get().stopTimer(slot.id);
      }
    });

    if (state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }
  },

  getSlotElapsed: (id: string) => {
    const state = get();
    const slot = state.taskSlots.find((s) => s.id === id);
    if (!slot) return 0;

    if (slot.isPaused) {
      return slot.pausedMs;
    }

    return slot.pausedMs + (Date.now() - slot.startTime.getTime());
  },

  tick: () => {
    // Force a re-render by creating new taskSlots array reference
    set((state) => ({
      taskSlots: state.taskSlots.length > 0 ? [...state.taskSlots] : [],
    }));

    // Check if any timers are still running
    const state = get();
    const hasActive = state.taskSlots.some((s) => !s.isPaused);

    if (!hasActive && state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }
  },

  // ── Persistence ────────────────────────────────────────────────────

  saveTimers: () => {
    const state = get();
    if (state.taskSlots.length === 0) {
      removeUserData('timerSlots');
      return;
    }

    const now = Date.now();
    const serialized: SerializedSlot[] = state.taskSlots.map((slot) => {
      const wasRunning = !slot.isPaused;
      // For running timers: accumulate all elapsed into pausedMs
      const totalPaused = wasRunning
        ? slot.pausedMs + (now - slot.startTime.getTime())
        : slot.pausedMs;

      return {
        id: slot.id,
        date: slot.date,
        stakeholder: slot.stakeholder,
        projekt: slot.projekt,
        taetigkeit: slot.taetigkeit,
        format: slot.format, // NEW: save format
        start_time: slot.start_time,
        elapsed_ms: slot.elapsed_ms,
        notiz: slot.notiz,
        is_running: slot.is_running,
        pausedMs: totalPaused,
        isPaused: true, // All saved as paused
        wasRunning,
      };
    });

    const saved: SavedTimerState = { slots: serialized, savedAt: now };
    setUserData('timerSlots', saved);
  },

  restoreTimers: () => {
    const saved = getUserData<SavedTimerState | null>('timerSlots', null);
    if (!saved || !saved.slots || saved.slots.length === 0) return;

    const now = Date.now();
    const elapsed = now - saved.savedAt; // Time passed during refresh
    let hasRunning = false;

    const restored: TimerSlot[] = saved.slots.map((s) => {
      const wasRunning = s.wasRunning;

      if (wasRunning) {
        hasRunning = true;
        // Timer was running: add elapsed time since save, resume
        return {
          id: s.id,
          date: s.date,
          stakeholder: s.stakeholder,
          projekt: s.projekt,
          taetigkeit: s.taetigkeit,
          format: s.format || 'Einzelarbeit', // NEW: restore format (with default)
          start_time: s.start_time,
          elapsed_ms: s.elapsed_ms,
          notiz: s.notiz,
          is_running: true,
          startTime: new Date(), // Fresh start reference
          pausedMs: s.pausedMs + elapsed, // Include time during refresh
          isPaused: false,
        };
      }

      // Paused timer: restore as-is
      return {
        id: s.id,
        date: s.date,
        stakeholder: s.stakeholder,
        projekt: s.projekt,
        taetigkeit: s.taetigkeit,
        format: s.format || 'Einzelarbeit', // NEW: restore format (with default)
        start_time: s.start_time,
        elapsed_ms: s.elapsed_ms,
        notiz: s.notiz,
        is_running: false,
        startTime: new Date(),
        pausedMs: s.pausedMs,
        isPaused: true,
      };
    });

    set({ taskSlots: restored });

    // Restart tick interval if any timers are running
    if (hasRunning) {
      ensureTickInterval(get, set);
    }

    // Clean up saved state
    removeUserData('timerSlots');
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Save timers before unload (all slots, not just running)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useTimerStore.getState().saveTimers();
  });
}
