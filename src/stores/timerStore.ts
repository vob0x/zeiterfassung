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
  restoreTimers: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Color palette for timer lanes — each new slot gets the next color
const TIMER_PALETTE = ['#C9A962', '#6EC49E', '#9B8EC4', '#D4706E', '#5BA4D9', '#E5A84B', '#7ECFCF', '#C97B9B'];
let colorCounter = 0;

function assignColor(existingColors: string[]): string {
  // Find the first palette color not in use
  for (const c of TIMER_PALETTE) {
    if (!existingColors.includes(c)) return c;
  }
  // Fallback: cycle
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

    // Sync removal to Supabase for cross-device visibility
    setTimeout(() => get().saveTimers(), 100);
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

    // Sync to Supabase for cross-device visibility
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

    // Sync to Supabase for cross-device visibility
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

    // Sync to Supabase for cross-device visibility
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

    // Remove the stopped slot entirely (don't just reset — other devices need to see it gone)
    set((state) => ({
      taskSlots: state.taskSlots.filter((s) => s.id !== id),
      activeSlotId: state.activeSlotId === id ? null : state.activeSlotId,
    }));

    // Check if any active timers remain
    const remaining = get().taskSlots;
    const hasActive = remaining.some((s) => !s.isPaused);
    if (!hasActive && state.tickInterval) {
      clearInterval(state.tickInterval);
      set({ tickInterval: null });
    }

    // Sync stopped state to Supabase for cross-device visibility
    // Use setTimeout to ensure state is settled, then sync
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
      // Also clear Supabase so other devices see no running timers
      syncTimersToSupabase([], Date.now());
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

    // Also push to Supabase for cross-device sync
    syncTimersToSupabase(serialized, now);
  },

  restoreTimers: async () => {
    // Try Supabase first (cross-device), then fall back to localStorage
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

    // Fall back to localStorage
    if (!saved) {
      saved = getUserData<SavedTimerState | null>('timerSlots', null);
    }

    if (!saved || !saved.slots || saved.slots.length === 0) return;

    const now = Date.now();
    const elapsed = now - saved.savedAt; // Time passed during refresh
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

// ── Supabase Sync Helper ───────────────────────────────────────────────

// Track our last save timestamp to skip our own Realtime echoes
let _lastLocalSavedAt: number = 0;

async function syncTimersToSupabase(slots: SerializedSlot[], savedAt: number): Promise<void> {
  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id || profile.id.startsWith('local_')) return;

  _lastLocalSavedAt = savedAt;

  try {
    // Delete all existing timers for this user first
    await supabaseClient
      .from('running_timers')
      .delete()
      .eq('user_id', profile.id);

    if (slots.length === 0) return;

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
      saved_at: savedAt,
    }));

    const { error } = await supabaseClient
      .from('running_timers')
      .insert(rows);

    if (error) {
      console.error('[TimerSync] Push to Supabase failed:', error.message);
    }
  } catch (e) {
    console.warn('[TimerSync] Supabase sync failed:', e);
  }
}

// ── Realtime Subscription for Cross-Device Sync ──────────────────────

let _realtimeChannel: any = null;
let _refreshTimeout: ReturnType<typeof setTimeout> | null = null;

async function refreshTimersFromSupabase(): Promise<void> {
  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id) return;

  try {
    const { data, error } = await supabaseClient
      .from('running_timers')
      .select('*')
      .eq('user_id', profile.id);

    if (error) {
      console.warn('[TimerSync] Refresh query failed:', error.message);
      return;
    }

    // Determine the remote saved_at timestamp
    const remoteSavedAt = data && data.length > 0
      ? Math.max(...data.map((r: any) => Number(r.saved_at) || 0))
      : 0;

    // Skip if this is an echo of our own save
    if (remoteSavedAt > 0 && remoteSavedAt === _lastLocalSavedAt) return;

    const localSlots = useTimerStore.getState().taskSlots;

    // ── Case 1: Remote has NO timers ─────────────────────────────
    if (!data || data.length === 0) {
      // Only clear local if we actually have timers (don't loop on empty→empty)
      if (localSlots.length > 0) {
        console.log('[TimerSync] Remote has no timers — clearing local slots');
        // Stop tick interval if running
        const state = useTimerStore.getState();
        if (state.tickInterval) {
          clearInterval(state.tickInterval);
        }
        useTimerStore.setState({ taskSlots: [], tickInterval: null, activeSlotId: null });
      }
      return;
    }

    // ── Case 2: Remote has timers — check if anything changed ────
    // Quick fingerprint: compare slot IDs + was_running states
    const remoteFingerprint = data
      .map((r: any) => `${r.id}:${r.was_running}:${r.paused_ms}`)
      .sort()
      .join('|');
    const localFingerprint = localSlots
      .map((s) => `${s.id}:${!s.isPaused}:${s.isPaused ? s.pausedMs : -1}`)
      .sort()
      .join('|');

    if (remoteFingerprint === localFingerprint) return; // No meaningful change

    console.log('[TimerSync] Remote change detected, updating local timers…');

    const now = Date.now();
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

    // Stop old tick interval before replacing state
    const oldState = useTimerStore.getState();
    if (oldState.tickInterval) {
      clearInterval(oldState.tickInterval);
    }

    useTimerStore.setState({ taskSlots: restored, tickInterval: null, activeSlotId: null });

    // Restart tick interval if any timers are running
    if (hasRunning) {
      const interval = setInterval(() => {
        useTimerStore.getState().tick();
      }, 500);
      useTimerStore.setState({ tickInterval: interval });
    }
  } catch (e) {
    console.warn('[TimerSync] Refresh failed:', e);
  }
}

let _pollInterval: ReturnType<typeof setInterval> | null = null;

export function subscribeToTimerSync(): void {
  const profile = useAuthStore.getState().profile;
  if (!isSupabaseAvailable() || !supabaseClient || !profile?.id || profile.id.startsWith('local_')) return;

  // Clean up existing subscription
  unsubscribeFromTimerSync();

  console.log('[TimerSync] Subscribing to Realtime changes + polling…');

  // 1) Realtime subscription for instant updates (best-effort)
  try {
    _realtimeChannel = supabaseClient
      .channel(`running-timers-${profile.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'running_timers',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          // Debounce: batch rapid changes (e.g. delete-all + insert-all)
          if (_refreshTimeout) clearTimeout(_refreshTimeout);
          _refreshTimeout = setTimeout(() => {
            refreshTimersFromSupabase();
          }, 800);
        }
      )
      .subscribe((status: string) => {
        console.log('[TimerSync] Realtime subscription status:', status);
      });
  } catch (e) {
    console.warn('[TimerSync] Realtime subscription failed, relying on polling:', e);
  }

  // 2) Polling fallback every 5 seconds — reliable regardless of Realtime status
  _pollInterval = setInterval(() => {
    refreshTimersFromSupabase();
  }, 5000);
}

export function unsubscribeFromTimerSync(): void {
  if (_realtimeChannel && supabaseClient) {
    try { supabaseClient.removeChannel(_realtimeChannel); } catch (_) {}
    _realtimeChannel = null;
  }
  if (_refreshTimeout) {
    clearTimeout(_refreshTimeout);
    _refreshTimeout = null;
  }
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}
