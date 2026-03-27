import { create } from 'zustand';
import { TimeEntry, FilterState } from '@/types';
import { getUserData, setUserData } from '@/lib/userStorage';
import { computeUnionMs, formatDateISO } from '@/lib/utils';
import { supabaseClient, isSupabaseAvailable } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { encryptField, decryptField, hasEncryptionKey, encryptFieldForTeam, decryptFieldSmart } from '@/lib/crypto';

// Generate a proper UUID v4 (required by Supabase)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Fields to encrypt in time_entries
const ENCRYPTED_ENTRY_FIELDS = ['stakeholder', 'projekt', 'taetigkeit', 'format', 'notiz'] as const;

async function encryptEntryForSupabase(row: Record<string, any>): Promise<Record<string, any>> {
  if (!hasEncryptionKey()) return row;
  const encrypted = { ...row };
  for (const field of ENCRYPTED_ENTRY_FIELDS) {
    if (encrypted[field]) {
      // For stakeholder (now an array), serialize before encrypting
      let valueToEncrypt = encrypted[field];
      if (field === 'stakeholder' && Array.isArray(valueToEncrypt)) {
        valueToEncrypt = JSON.stringify(valueToEncrypt);
      }
      // Use encryptFieldForTeam: uses Team Key if available, personal key otherwise
      // This ensures team members can decrypt each other's entries
      encrypted[field] = await encryptFieldForTeam(valueToEncrypt);
    }
  }
  return encrypted;
}

async function decryptEntryFromSupabase(row: any): Promise<any> {
  const decrypted = { ...row };
  for (const field of ENCRYPTED_ENTRY_FIELDS) {
    if (decrypted[field]) {
      // Use decryptFieldSmart: tries Team Key first, then personal key
      // This handles entries encrypted with either key
      const decryptedValue = await decryptFieldSmart(decrypted[field]);
      // For stakeholder, parse JSON array if it was serialized
      if (field === 'stakeholder' && decryptedValue && decryptedValue.startsWith('[')) {
        try {
          decrypted[field] = JSON.parse(decryptedValue);
        } catch {
          decrypted[field] = decryptedValue;
        }
      } else {
        decrypted[field] = decryptedValue;
      }
    }
  }
  return decrypted;
}

interface EntriesState {
  entries: TimeEntry[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  fetch: () => Promise<void>;
  add: (entry: Record<string, any>) => Promise<void>;
  bulkAdd: (entries: Record<string, any>[]) => Promise<void>;
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
    format: '', // NEW: format filter
    notiz: '',
  },

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      // Load from localStorage first (immediate)
      const localEntries = getUserData<TimeEntry[]>('entries', []);
      set({ entries: localEntries, loading: false });

      // Then merge with Supabase data (only if encryption key is available for decryption)
      const profile = useAuthStore.getState().profile;
      if (isSupabaseAvailable() && supabaseClient && hasEncryptionKey() && profile?.id && !profile.id.startsWith('local_')) {
        const { data, error: sbErr } = await supabaseClient
          .from('time_entries')
          .select('*')
          .eq('user_id', profile.id)
          .order('date', { ascending: false });

        if (!sbErr && data) {
          // Decrypt entries from Supabase
          const sbEntries: TimeEntry[] = await Promise.all(
            data.map(async (row: any) => {
              const decrypted = await decryptEntryFromSupabase(row);
              // Migrate old string stakeholder to array
              let stakeholder: string | string[] = decrypted.stakeholder || '';
              if (typeof stakeholder === 'string' && stakeholder) {
                stakeholder = [stakeholder];
              }
              return {
                id: decrypted.id,
                user_id: decrypted.user_id,
                date: typeof decrypted.date === 'string' ? decrypted.date : formatDateISO(new Date(decrypted.date)),
                stakeholder: stakeholder,
                projekt: decrypted.projekt || '',
                taetigkeit: decrypted.taetigkeit || '',
                format: decrypted.format || 'Einzelarbeit', // NEW: default format
                start_time: decrypted.start_time || '',
                end_time: decrypted.end_time || '',
                duration_ms: decrypted.duration_ms || 0,
                notiz: decrypted.notiz || '',
                created_at: decrypted.created_at || '',
                updated_at: decrypted.updated_at || '',
              };
            })
          );

          // Merge: use Supabase as base, add any local-only entries
          const sbIds = new Set(sbEntries.map((e) => e.id));
          const localOnly = localEntries.filter((e) => !sbIds.has(e.id));
          const merged = [...sbEntries, ...localOnly];

          set({ entries: merged });
          setUserData('entries', merged);

          // Push local-only entries to Supabase (fix non-UUID IDs first)
          if (localOnly.length > 0 && hasEncryptionKey()) {
            let needsLocalUpdate = false;
            const fixedEntries = localOnly.map((e) => {
              if (!isValidUUID(e.id)) {
                needsLocalUpdate = true;
                return { ...e, id: generateUUID() };
              }
              return e;
            });

            // If we generated new UUIDs, update local storage
            if (needsLocalUpdate) {
              const oldIdMap = new Map(localOnly.map((old, i) => [old.id, fixedEntries[i].id]));
              const updatedMerged = merged.map((e) => {
                const newId = oldIdMap.get(e.id);
                return newId ? { ...e, id: newId } : e;
              });
              set({ entries: updatedMerged });
              setUserData('entries', updatedMerged);
            }

            // Encrypt before pushing to Supabase
            const rows = await Promise.all(
              fixedEntries.map(async (e) => {
                const row = {
                  id: e.id,
                  user_id: profile.id,
                  date: e.date,
                  stakeholder: e.stakeholder,
                  projekt: e.projekt,
                  format: (e as any).format || 'Einzelarbeit',
                  taetigkeit: e.taetigkeit,
                  start_time: e.start_time,
                  end_time: e.end_time,
                  duration_ms: e.duration_ms,
                  notiz: e.notiz || '',
                  created_at: e.created_at,
                  updated_at: e.updated_at,
                };
                return encryptEntryForSupabase(row);
              })
            );
            const { error: pushErr } = await supabaseClient
              .from('time_entries')
              .upsert(rows, { onConflict: 'id' });
            if (pushErr) {
              console.error('[Sync] Local→Supabase push failed:', pushErr.message, pushErr.details);
            }
          }
        }
      }
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

      // Normalize stakeholder to array for consistency
      let stakeholder: string | string[] = entry.stakeholder || '';
      if (typeof stakeholder === 'string' && stakeholder) {
        stakeholder = [stakeholder];
      } else if (!stakeholder || (Array.isArray(stakeholder) && stakeholder.length === 0)) {
        stakeholder = '';
      }

      const newEntry: TimeEntry = {
        id: generateUUID(),
        user_id: (entry as any).user_id || 'local',
        date: entry.date,
        stakeholder: stakeholder,
        projekt: entry.projekt || (entry as any).project || '',
        taetigkeit: entry.taetigkeit || (entry as any).activity || '',
        format: entry.format || (entry as any).format || 'Einzelarbeit', // NEW: default format
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

      // Sync to Supabase (non-blocking — local is source of truth, but log errors visibly)
      if (isSupabaseAvailable() && supabaseClient && hasEncryptionKey()) {
        const profile = useAuthStore.getState().profile;
        if (profile?.id && !profile.id.startsWith('local_')) {
          const row = await encryptEntryForSupabase({
            id: newEntry.id,
            user_id: profile.id,
            date: newEntry.date,
            stakeholder: newEntry.stakeholder,
            projekt: newEntry.projekt,
            taetigkeit: newEntry.taetigkeit,
            format: newEntry.format,
            start_time: newEntry.start_time,
            end_time: newEntry.end_time,
            duration_ms: newEntry.duration_ms,
            notiz: newEntry.notiz || '',
            created_at: newEntry.created_at,
            updated_at: newEntry.updated_at,
          });
          const { error: sbErr } = await supabaseClient
            .from('time_entries')
            .upsert(row, { onConflict: 'id' });
          if (sbErr) {
            console.error('[Sync] Entry upsert failed:', sbErr.message, sbErr.details);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add entry';
      set({ error: message });
      throw error;
    }
  },

  bulkAdd: async (rawEntries: Record<string, any>[]) => {
    set({ error: null });
    try {
      const state = get();
      const now = new Date().toISOString();
      const newEntries: TimeEntry[] = rawEntries.map((entry) => {
        let duration_ms = (entry as any).duration_ms || 0;
        if (!duration_ms && entry.start_time && entry.end_time) {
          const [sh, sm] = entry.start_time.split(':').map(Number);
          const [eh, em] = entry.end_time.split(':').map(Number);
          let startMins = sh * 60 + sm;
          let endMins = eh * 60 + em;
          if (endMins < startMins) endMins += 24 * 60;
          duration_ms = (endMins - startMins) * 60000;
        }
        // Normalize stakeholder to array
        let stakeholder: string | string[] = entry.stakeholder || '';
        if (typeof stakeholder === 'string' && stakeholder) {
          stakeholder = [stakeholder];
        } else if (!stakeholder || (Array.isArray(stakeholder) && stakeholder.length === 0)) {
          stakeholder = '';
        }
        return {
          id: generateUUID(),
          user_id: (entry as any).user_id || 'local',
          date: entry.date,
          stakeholder: stakeholder,
          projekt: entry.projekt || (entry as any).project || '',
          taetigkeit: entry.taetigkeit || (entry as any).activity || '',
          format: entry.format || 'Einzelarbeit', // NEW: default format
          start_time: entry.start_time || (entry as any).startTime || '',
          end_time: entry.end_time || (entry as any).endTime || '',
          duration_ms,
          notiz: entry.notiz || '',
          created_at: (entry as any).created_at || now,
          updated_at: (entry as any).updated_at || now,
        };
      });

      const updated = [...state.entries, ...newEntries];
      set({ entries: updated });
      setUserData('entries', updated);

      // Bulk sync to Supabase (encrypted)
      if (isSupabaseAvailable() && supabaseClient && hasEncryptionKey()) {
        const profile = useAuthStore.getState().profile;
        if (profile?.id && !profile.id.startsWith('local_')) {
          const rows = await Promise.all(
            newEntries.map(async (e) => {
              const row = {
                id: e.id,
                user_id: profile.id,
                date: e.date,
                stakeholder: e.stakeholder,
                projekt: e.projekt,
                taetigkeit: e.taetigkeit,
                format: e.format,
                start_time: e.start_time,
                end_time: e.end_time,
                duration_ms: e.duration_ms,
                notiz: e.notiz || '',
                created_at: e.created_at,
                updated_at: e.updated_at,
              };
              return encryptEntryForSupabase(row);
            })
          );
          const { error: sbErr } = await supabaseClient
            .from('time_entries')
            .upsert(rows, { onConflict: 'id' });
          if (sbErr) {
            console.error('[Sync] Bulk entry sync failed:', sbErr.message, sbErr.details);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk add entries';
      set({ error: message });
      throw error;
    }
  },

  update: async (id, updates) => {
    set({ error: null });
    try {
      const state = get();
      const updatedAt = new Date().toISOString();
      const updated = state.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              ...updates,
              updated_at: updatedAt,
            }
          : e
      );
      set({ entries: updated });
      setUserData('entries', updated);

      // Sync to Supabase (non-blocking)
      if (isSupabaseAvailable() && supabaseClient && hasEncryptionKey()) {
        const profile = useAuthStore.getState().profile;
        if (profile?.id && !profile.id.startsWith('local_')) {
          const entry = updated.find((e) => e.id === id);
          if (entry) {
            const row = await encryptEntryForSupabase({
              id: entry.id,
              user_id: profile.id,
              date: entry.date,
              stakeholder: entry.stakeholder,
              projekt: entry.projekt,
              taetigkeit: entry.taetigkeit,
              format: entry.format,
              start_time: entry.start_time,
              end_time: entry.end_time,
              duration_ms: entry.duration_ms,
              notiz: entry.notiz || '',
              created_at: entry.created_at,
              updated_at: updatedAt,
            });
            const { error: sbErr } = await supabaseClient
              .from('time_entries')
              .upsert(row, { onConflict: 'id' });
            if (sbErr) {
              console.error('[Sync] Entry update failed:', sbErr.message, sbErr.details);
            }
          }
        }
      }
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

      // Sync delete to Supabase
      if (isSupabaseAvailable() && supabaseClient) {
        const profile = useAuthStore.getState().profile;
        if (profile?.id && !profile.id.startsWith('local_')) {
          const { error: sbErr } = await supabaseClient
            .from('time_entries')
            .delete()
            .eq('id', id);
          if (sbErr) {
            console.error('[Sync] Entry delete failed:', sbErr.message, sbErr.details);
          }
        }
      }
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
        format: '', // NEW: format filter
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

      // Stakeholder filter (handle array)
      if (filters.stakeholder) {
        const entryStakeholders = Array.isArray(entry.stakeholder) ? entry.stakeholder : [entry.stakeholder];
        if (!entryStakeholders.includes(filters.stakeholder)) return false;
      }

      // Other dimension filters (case-insensitive, empty means all)
      if (filters.project && entry.projekt !== filters.project) return false;
      if (filters.activity && entry.taetigkeit !== filters.activity) return false;
      if (filters.format && entry.format !== filters.format) return false; // NEW: format filter

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
