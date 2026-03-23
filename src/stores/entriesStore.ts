import { create } from 'zustand';
import { TimeEntry, FilterState } from '@/types';
import { getUserData, setUserData } from '@/lib/userStorage';
import { computeUnionMs } from '@/lib/utils';

interface EntriesState {
  entries: TimeEntry[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  fetch: () => Promise<void>;
  add: (entry: Record<string, any>) => Promise<void>;
  update: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setFilter: (key: keyof FilterState, value: string) => void;
  clearFilters: () => void;
  getFilteredEntries: () => TimeEntry[];
  getFilteredEntriesByDay: (date: string) => TimeEntry[];
  getDayTotal: (date: string) => number;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  filters: {
    from: '',
    to: '',
    stakeholder: '',
    project: '',
    activity: '',
    notiz: '',
  },

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const entries = getUserData<TimeEntry[]>('entries', []);
      set({ entries, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch entries';
      set({ error: message, loading: false });
    }
  },

  add: async (entry) => {
    set({ error: null });
    try {
      const state = get();

      // Calculate duration_ms if not provided
      let duration_ms = (entry as any).duration_ms || 0;
      if (!duration_ms && entry.start_time && entry.end_time) {
        const [sh, sm] = entry.start_time.split(':').map(Number);
        const [eh, em] = entry.end_time.split(':').map(Number);
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60;
        duration_ms = (endMins - startMins) * 60000;
      }

      const newEntry: TimeEntry = {
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: (entry as any).user_id || 'local',
        date: entry.date,
        stakeholder: entry.stakeholder || '',
        projekt: entry.projekt || (entry as any).project || '',
        taetigkeit: entry.taetigkeit || (entry as any).activity || '',
        start_time: entry.start_time || (entry as any).startTime || '',
        end_time: entry.end_time || (entry as any).endTime || '',
        duration_ms: duration_ms,
        notiz: entry.notiz || (entry as any).notiz || '',
        created_at: (entry as any).created_at || new Date().toISOString(),
        updated_at: (entry as any).updated_at || new Date().toISOString(),
      };

      const updated = [...state.entries, newEntry];
      set({ entries: updated });
      setUserData('entries', updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add entry';
      set({ error: message });
      throw error;
    }
  },

  update: async (id, updates) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              ...updates,
              updated_at: new Date().toISOString(),
            }
          : e
      );
      set({ entries: updated });
      setUserData('entries', updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update entry';
      set({ error: message });
      throw error;
    }
  },

  delete: async (id) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.entries.filter((e) => e.id !== id);
      set({ entries: updated });
      setUserData('entries', updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete entry';
      set({ error: message });
      throw error;
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        from: '',
        to: '',
        stakeholder: '',
        project: '',
        activity: '',
        notiz: '',
      },
    });
  },

  getFilteredEntries: () => {
    const state = get();
    return state.entries.filter((entry) => {
      const filters = state.filters;

      // Date range filter
      if (filters.from && entry.date < filters.from) return false;
      if (filters.to && entry.date > filters.to) return false;

      // Dimension filters (case-insensitive, empty means all)
      if (filters.stakeholder && entry.stakeholder !== filters.stakeholder)
        return false;
      if (filters.project && entry.projekt !== filters.project) return false;
      if (filters.activity && entry.taetigkeit !== filters.activity) return false;

      // Text search in notiz
      if (filters.notiz) {
        const searchTerm = filters.notiz.toLowerCase();
        const entryNotiz = (entry.notiz || '').toLowerCase();
        if (!entryNotiz.includes(searchTerm)) return false;
      }

      return true;
    });
  },

  getFilteredEntriesByDay: (date: string) => {
    const state = get();
    return state.entries.filter((e) => e.date === date);
  },

  getDayTotal: (date: string) => {
    const state = get();
    const dayEntries = state.entries.filter((e) => e.date === date);
    return computeUnionMs(dayEntries) / (1000 * 60 * 60); // Convert to hours
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
