import { create } from 'zustand';
import { TimerSlot } from '@/types';
import { useEntriesStore } from './entriesStore';
import { useAuthStore } from './authStore';
import { getUserData, setUserData, removeUserData } from '@/lib/userStorage';
import { formatDateISO } from '@/lib/utils';
import { supabaseClient, isSupabaseAvailable } from '@/lib/supabase';

// Serializable version for localStorage (Date → ISO string)
interface SerializedSlot {
  id: string;
  date: string;
  stakeholder: string[];
  projekt: string;
  taetigkeit: string;
  format: string;
  start_time: string;
  elapsed_ms: number;
  notiz?: string;
  is_running: boolean;
  color: string;
  pausedMs: number;
  isPaused: boolean;
  wasRunning: boolean;
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
  addSlotStakeholder: (id: string, stakeholder: string) => void;
  removeSlotStakeholder: (id: string, stakeholder: string) => void;
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  stopAllTimers: () => void;
  getSlotElapsed: (id: string) => number;
  tick: () => void;
  saveTimers: () => void;
  restoreTimers: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Color palette for timer lanes — each new slot gets the next color
const TIMER_PALETTE = ['#C9A962', '#6EC49E', '#9B8EC4', '#D4706E', '#5BA4D9', '#E5A84B', '#7ECFCF', '#C97B9B'];
let colorCounter = 0;

function assignColor(existingColors: string[]): string {
  for (const c of TIMER_PALETTE) {
    if (!existingColors.includes(c)) return c;
  }
  return TIMER_PALETTE[colorCounter++ % TIMER_PALETTE.length];
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

// ── Cross-device sync state (module-level) ─────────────────────────────

// After a local save, suppress remote refresh for 3 seconds to avoid race conditions.
// The key race: saveTimers sets _suppressUntil, then starts async DELETE+INSERT.
// A poll firing before the DB operation completes would fetch stale data and undo the local change.
let _suppressUntil: number = 0;

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
    const existingColors = state.taskSlots.map((s) => s.color);
    const newSlot: TimerSlot = {
      stakeholder: slotData.stakeholder || [],
      projekt: slotData.projekt,
      taetigkeit: slotData.taetigkeit,
      format: slotData.format || 'Einzelarbeit',
      notiz: slotData.notiz,
      id: generateId(),
      date: formatDateISO(now),
      start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      elapsed_ms: 0,
      is_running: false,
      color: assignColor(existingColors),
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
    setTimeout(() => get().saveTimers(), 100);
  },

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

  addSlotStakeholder: (id, stakeholder) => {
    set((state) => ({
      taskSlots: state.taskSlots.map((slot) =>
        slot.id === id && !slot.stakeholder.includes(stakeholder)
          ? { ...slot, stakeholder: [...slot.stakeholder, stakeholder] }
          : slot
      ),
    }));
  },

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
    setTimeout(() => get().saveTimers(), 100);
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

    setTimeout(() => get().saveTimers(), 100);
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
    setTimeout(() => get().saveTimers(), 100);
  },

  stopTimer: (id: string) => {
    const state = get();
    const slot = state.taskSlots.find((s) => s.id === id);
    if (!slot) return;

    // Calculate final duration
    const totalMs =
      slot.pausedMs +
      (slot.isPaused ? 0 : Date.now() - slot.startTime.getTime());

    // Minimum 1 second to save
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
      stakeholder: slot.stakeholder || [],
      projekt: slot.projekt || '',
      taetigkeit: slot.taetigkeit || '',
      format: slot.format || 'Einzelarbeit',
      start_time: startTime,
      end_time: endTime,
      duration_ms: totalMs,
      notiz: slot.notiz || '',
      user_id: authStore.profile?.id || 'local',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Remove the stopped slot entirely
    set((st) => ({
      taskSlots: st.taskSlots.filter((s) => s.id !== id),
      activeSlotId: st.activeSlotId === id ? null : st.activeSlotId,
    }));

    // Check if any active timers remain
    const remaining = get().taskSlots;
    const hasActive = remaining.some((s) => !s.isPaused);
    if (!hasActive && state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }

    // Sync to Supabase — suppress MUST be set BEFORE the async save
    _suppressUntil = Date.now() + 5000;
    setTimeout(() => get().saveTimers(), 100);
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
    set((state) => ({
      taskSlots: state.taskSlots.length > 0 ? [...state.taskSlots] : [],
    }));

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

    // Suppress remote refresh to prevent race condition
    _suppressUntil = Date.now() + 3000;

    if (state.taskSlots.length === 0) {
      removeUserData('timerSlots');
      // Clear Supabase so other devices see no running timers
      pushTimersToSupabase([]);
      return;
    }

    const now = Date.now();
    const serialized: SerializedSlot[] = state.taskSlots.map((slot) => {
      const wasRunning = !slot.isPaused;
      const totalPaused = wasRunning
        ? slot.pausedMs + (now - slot.startTime.getTime())
        : slot.pausedMs;

      return {
        id: slot.id,
        date: slot.date,
        stakeholder: slot.stakeholder,
        projekt: slot.projekt,
        taetigkeit: slot.taetigkeit,
        format: slot.format,
        start_time: slot.start_time,
        elapsed_ms: slot.elapsed_ms,
        notiz: slot.notiz,
        is_running: slot.is_running,
        color: slot.color,
        pausedMs: totalPaused,
        isPaused: true,
        wasRunning,
      };
    });

    const saved: SavedTimerState = { slots: serialized, savedAt: now };
    setUserData('timerSlots', saved);
    pushTimersToSupabase(serialized);
  },

  restoreTimers: async () => {
    const profile = useAuthStore.getState().profile;
    let saved: SavedTimerState | null = null;

    if (isSupabaseAvailable() && supabaseClient && profile?.id && !profile.id.startsWith('local_')) {
      try {
        const { data, error } = await supabaseClient
          .from('running_timers')
          .select('*')
          .eq('user_id', profile.id);

        if (!error && data && data.length > 0) {
          const sbSlots: SerializedSlot[] = data.map((row: any) => ({
            id: row.id,
            date: row.date || '',
            stakeholder: JSON.parse(row.stakeholder || '[]'),
            projekt: row.projekt || '',
            taetigkeit: row.taetigkeit || '',
            format: row.format || 'Einzelarbeit',
            start_time: row.start_time || '',
            notiz: row.notiz || '',
            is_running: row.was_running,
            color: row.color || '',
            pausedMs: Number(row.paused_ms) || 0,
            isPaused: row.is_paused,
            wasRunning: row.was_running,
            elapsed_ms: 0,
          }));
          const savedAt = Math.max(...data.map((r: any) => Number(r.saved_at) || 0));
          saved = { slots: sbSlots, savedAt };
        }
      } catch (e) {
        console.warn('[TimerSync] Supabase restore failed, falling back to localStorage:', e);
      }
    }

    if (!saved) {
      saved = getUserData<SavedTimerState | null>('timerSlots', null);
    }

    if (!saved || !saved.slots || saved.slots.length === 0) return;

    const now = Date.now();
    const elapsed = now - saved.savedAt;
    let hasRunning = false;

    const restored: TimerSlot[] = saved.slots.map((s, idx) => {
      const wasRunning = s.wasRunning;

      if (wasRunning) {
        hasRunning = true;
        return {
          id: s.id,
          date: s.date,
          stakeholder: s.stakeholder,
          projekt: s.projekt,
          taetigkeit: s.taetigkeit,
          format: s.format || 'Einzelarbeit',
          start_time: s.start_time,
          elapsed_ms: s.elapsed_ms,
          notiz: s.notiz,
          is_running: true,
          color: s.color || TIMER_PALETTE[idx % TIMER_PALETTE.length],
          startTime: new Date(),
          pausedMs: s.pausedMs + elapsed,
          isPaused: false,
        };
      }

      return {
        id: s.id,
        date: s.date,
        stakeholder: s.stakeholder,
        projekt: s.projekt,
        taetigkeit: s.taetigkeit,
        format: s.format || 'Einzelarbeit',
        start_time: s.start_time,
        elapsed_ms: s.elapsed_ms,
        notiz: s.notiz,
        is_running: false,
        color: s.color || TIMER_PALETTE[idx % TIMER_PALETTE.length],
        startTime: new Date(),
        pausedMs: s.pausedMs,
        isPaused: true,
      };
    });

    set({ taskSlots: restored });

    if (hasRunning) {
      ensureTickInterval(get, set);
    }

    removeUserData('timerSlots');
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Save timers before unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useTimerStore.getState().saveTimers();
  });
}

// ── Supabase Push (fire-and-forget) ─────────────────────────────────────

async function pushTimersToSupabase(slots: SerializedSlot[]): Promise<void> {
  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id || profile.id.startsWith('local_')) return;

  try {
    // Delete all existing timers for this user
    const { error: delError } = await supabaseClient
      .from('running_timers')
      .delete()
      .eq('user_id', profile.id);

    if (delError) {
      console.error('[TimerSync] DELETE failed:', delError.message);
      return;
    }

    if (slots.length === 0) {
      console.log('[TimerSync] Cleared all remote timers');
      return;
    }

    // Insert current timer state
    const rows = slots.map((s) => ({
      id: s.id,
      user_id: profile.id,
      date: s.date,
      stakeholder: JSON.stringify(s.stakeholder),
      projekt: s.projekt,
      taetigkeit: s.taetigkeit,
      format: s.format,
      start_time: s.start_time,
      notiz: s.notiz || '',
      color: s.color,
      paused_ms: s.pausedMs,
      is_paused: s.isPaused,
      was_running: s.wasRunning,
      saved_at: Date.now(),
    }));

    const { error: insError } = await supabaseClient
      .from('running_timers')
      .insert(rows);

    if (insError) {
      console.error('[TimerSync] INSERT failed:', insError.message);
    }
  } catch (e) {
    console.warn('[TimerSync] Push failed:', e);
  }
}

// ── Cross-Device Polling ────────────────────────────────────────────────

let _pollInterval: ReturnType<typeof setInterval> | null = null;
let _realtimeChannel: any = null;

async function pullTimersFromSupabase(): Promise<void> {
  // Skip if we recently saved locally (prevents race condition where poll
  // fetches stale data before our DELETE+INSERT completes)
  if (Date.now() < _suppressUntil) return;

  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id) return;

  try {
    const { data, error } = await supabaseClient
      .from('running_timers')
      .select('*')
      .eq('user_id', profile.id);

    if (error) return;

    const localSlots = useTimerStore.getState().taskSlots;

    // ── Remote is empty → clear local timers ──────────────────────
    if (!data || data.length === 0) {
      if (localSlots.length > 0) {
        console.log('[TimerSync] Remote empty → clearing local timers');
        const s = useTimerStore.getState();
        if (s.tickInterval) clearInterval(s.tickInterval);
        useTimerStore.setState({ taskSlots: [], tickInterval: null, activeSlotId: null });
      }
      return;
    }

    // ── Quick check: has anything changed? ────────────────────────
    // Compare remote slot IDs + running states with local
    const remoteKey = data
      .map((r: any) => `${r.id}:${r.was_running}`)
      .sort()
      .join(',');
    const localKey = localSlots
      .map((s) => `${s.id}:${!s.isPaused}`)
      .sort()
      .join(',');

    if (remoteKey === localKey) return; // Nothing changed

    console.log('[TimerSync] Remote changed → updating local timers');

    // ── Rebuild local state from remote ───────────────────────────
    const now = Date.now();
    const remoteSavedAt = Math.max(...data.map((r: any) => Number(r.saved_at) || 0));
    const elapsed = remoteSavedAt > 0 ? now - remoteSavedAt : 0;
    let hasRunning = false;

    const restored: TimerSlot[] = data.map((row: any, idx: number) => {
      const wasRunning = row.was_running;
      const pausedMs = Number(row.paused_ms) || 0;

      if (wasRunning) {
        hasRunning = true;
        return {
          id: row.id,
          date: row.date || '',
          stakeholder: JSON.parse(row.stakeholder || '[]'),
          projekt: row.projekt || '',
          taetigkeit: row.taetigkeit || '',
          format: row.format || 'Einzelarbeit',
          start_time: row.start_time || '',
          elapsed_ms: 0,
          notiz: row.notiz || '',
          is_running: true,
          color: row.color || TIMER_PALETTE[idx % TIMER_PALETTE.length],
          startTime: new Date(),
          pausedMs: pausedMs + elapsed,
          isPaused: false,
        };
      }

      return {
        id: row.id,
        date: row.date || '',
        stakeholder: JSON.parse(row.stakeholder || '[]'),
        projekt: row.projekt || '',
        taetigkeit: row.taetigkeit || '',
        format: row.format || 'Einzelarbeit',
        start_time: row.start_time || '',
        elapsed_ms: 0,
        notiz: row.notiz || '',
        is_running: false,
        color: row.color || TIMER_PALETTE[idx % TIMER_PALETTE.length],
        startTime: new Date(),
        pausedMs,
        isPaused: true,
      };
    });

    // Clear old tick interval
    const oldState = useTimerStore.getState();
    if (oldState.tickInterval) clearInterval(oldState.tickInterval);

    useTimerStore.setState({ taskSlots: restored, tickInterval: null, activeSlotId: null });

    // Restart tick if needed
    if (hasRunning) {
      const interval = setInterval(() => {
        useTimerStore.getState().tick();
      }, 500);
      useTimerStore.setState({ tickInterval: interval });
    }
  } catch (e) {
    console.warn('[TimerSync] Pull failed:', e);
  }
}

export function subscribeToTimerSync(): void {
  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id || profile.id.startsWith('local_')) return;

  unsubscribeFromTimerSync();

  console.log('[TimerSync] Starting cross-device sync (poll every 3s)');

  // Primary: polling every 3 seconds (reliable)
  _pollInterval = setInterval(() => {
    pullTimersFromSupabase();
  }, 3000);

  // Bonus: Realtime for faster updates (best-effort)
  try {
    _realtimeChannel = supabaseClient
      .channel(`timers-${profile.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'running_timers',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          // On any remote change, pull immediately (if not suppressed)
          setTimeout(() => pullTimersFromSupabase(), 500);
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('[TimerSync] Realtime failed, relying on polling:', e);
  }
}

export function unsubscribeFromTimerSync(): void {
  if (_realtimeChannel && supabaseClient) {
    try { supabaseClient.removeChannel(_realtimeChannel); } catch (_) {}
    _realtimeChannel = null;
  }
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}
