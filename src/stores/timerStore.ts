import { create } from 'zustand';
import { TimerSlot } from '@/types';
import { useEntriesStore } from './entriesStore';
import { useAuthStore } from './authStore';

interface TimerState {
  taskSlots: TimerSlot[];
  activeSlotId: string | null;
  tickInterval: NodeJS.Timer | null;
  error: string | null;
  addSlot: (slot: { stakeholder: string; projekt: string; taetigkeit: string; notiz?: string }) => void;
  removeSlot: (id: string) => void;
  updateSlotField: (
    id: string,
    field: 'stakeholder' | 'projekt' | 'taetigkeit' | 'notiz',
    value: string
  ) => void;
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  stopAllTimers: () => void;
  getSlotElapsed: (id: string) => number; // Returns milliseconds
  tick: () => void;
  saveRunningTimers: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

function generateId(): string {
  return `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const newSlot: any = {
      ...slotData,
      id: generateId(),
      date: now.toISOString().split('T')[0],
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

  updateSlotField: (id, field, value) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
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
            }
          : slot
      ),
      activeSlotId: id,
    }));

    // Start tick interval if not already running
    const state = get();
    if (!state.tickInterval) {
      const interval = setInterval(() => {
        get().tick();
      }, 500);
      set({ tickInterval: interval });
    }
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
            }
          : slot
      ),
      activeSlotId: id,
    }));

    // Ensure tick interval is running
    const state = get();
    if (!state.tickInterval) {
      const interval = setInterval(() => {
        get().tick();
      }, 500);
      set({ tickInterval: interval });
    }
  },

  stopTimer: (id: string) => {
    const state = get();
    const slot = state.taskSlots.find((s) => s.id === id);
    if (!slot) return;

    // Calculate final duration
    const totalMs =
      slot.pausedMs +
      (slot.isPaused ? 0 : Date.now() - slot.startTime.getTime());

    // Minimum 1 minute to save
    if (totalMs < 60000) {
      set({ error: 'Timer must be at least 1 minute' });
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
      stakeholder: slot.stakeholder || '',
      projekt: slot.projekt || '',
      taetigkeit: slot.taetigkeit || '',
      start_time: startTime,
      end_time: endTime,
      duration_ms: totalMs,
      notiz: slot.notiz || '',
      user_id: authStore.profile?.id || 'local',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Remove slot
    get().removeSlot(id);

    // Check if any active timers remain
    const remaining = get().taskSlots;
    if (remaining.length === 0 && state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }
  },

  stopAllTimers: () => {
    const state = get();
    const ids = state.taskSlots.map((s) => s.id);
    ids.forEach((id) => get().stopTimer(id));

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
    // Force a re-render by updating a dummy value
    // This ensures getSlotElapsed returns updated times
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

  saveRunningTimers: () => {
    const state = get();
    const running = state.taskSlots.filter((s) => !s.isPaused);
    if (running.length > 0) {
      localStorage.setItem('runningTimers', JSON.stringify(running));
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Save running timers before unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useTimerStore.getState().saveRunningTimers();
  });
}
