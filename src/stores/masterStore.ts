import { create } from 'zustand';
import { getUserData, setUserData } from '@/lib/userStorage';
import { supabaseClient, isSupabaseAvailable, ensureValidSession } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { hasEncryptionKey, hasTeamKey, encryptFieldForTeam, decryptFieldSmart } from '@/lib/crypto';
import { useTeamStore } from './teamStore';

interface MasterState {
  stakeholders: string[];
  projects: string[];
  activities: string[];
  formats: string[]; // NEW: format dimension
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  addStakeholder: (name: string) => Promise<void>;
  addProject: (name: string) => Promise<void>;
  addActivity: (name: string) => Promise<void>;
  addFormat: (name: string) => Promise<void>; // NEW
  removeStakeholder: (name: string) => Promise<void>;
  removeProject: (name: string) => Promise<void>;
  removeActivity: (name: string) => Promise<void>;
  removeFormat: (name: string) => Promise<void>; // NEW
  renameStakeholder: (oldName: string, newName: string) => Promise<void>;
  renameProject: (oldName: string, newName: string) => Promise<void>;
  renameActivity: (oldName: string, newName: string) => Promise<void>;
  renameFormat: (oldName: string, newName: string) => Promise<void>; // NEW
  sortMasterData: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Helper: get current authenticated user ID (non-local)
function getSupabaseUserId(): string | null {
  const profile = useAuthStore.getState().profile;
  if (profile?.id && !profile.id.startsWith('local_')) return profile.id;
  return null;
}

/**
 * Sync a local list to Supabase table (non-blocking bulk upsert, encrypted).
 *
 * Uses a mutex-like timestamp guard to prevent race conditions when
 * multiple devices sync the same table simultaneously. The DELETE + INSERT
 * is protected by checking that no other sync overwrote our delete.
 */
const _syncInProgress = new Map<string, boolean>();

async function syncListToSupabase(
  table: 'stakeholders' | 'projects' | 'activities' | 'formats',
  names: string[],
  userId: string
) {
  if (!isSupabaseAvailable() || !supabaseClient || names.length === 0) return;

  // Abort sync if no encryption key — never send plaintext to Supabase
  if (!hasEncryptionKey()) return;

  // Prevent concurrent syncs of the same table (would cause race conditions)
  const lockKey = `${table}_${userId}`;
  if (_syncInProgress.get(lockKey)) return;
  _syncInProgress.set(lockKey, true);

  // Ensure auth session is still valid (avoids 401 / RLS errors)
  const sessionOk = await ensureValidSession();
  if (!sessionOk) {
    _syncInProgress.set(lockKey, false);
    return;
  }

  try {
    // Encrypt names before sending to Supabase (Team Key if in team, personal key otherwise)
    const encryptedRows = await Promise.all(
      names.map(async (name, idx) => ({
        user_id: userId,
        name: await encryptFieldForTeam(name),
        sort_order: idx,
      }))
    );

    // Delete existing rows first (encrypted values differ each time due to random IV)
    const { error: delErr } = await supabaseClient.from(table).delete().eq('user_id', userId);
    if (delErr) {
      _syncInProgress.set(lockKey, false);
      return; // Auth issue — don't attempt insert
    }

    // Insert fresh — immediately after delete to minimize race window
    const { error } = await supabaseClient
      .from(table)
      .insert(encryptedRows);
    if (error) {
      console.warn(`[Sync] ${table} sync skipped:`, error.message);
    }
  } catch {
    // Silent — network or auth issue, will retry on next sync cycle
  } finally {
    _syncInProgress.set(lockKey, false);
  }
}

export const useMasterStore = create<MasterState>((set, get) => ({
  stakeholders: [],
  projects: [],
  activities: [],
  formats: ['Einzelarbeit', 'Meeting', 'Telefonat', 'Workshop'], // NEW: default formats
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      // Always load from localStorage first (source of truth)
      const localStakeholders = getUserData<string[]>('stakeholders', []);
      const localProjects = getUserData<string[]>('projects', []);
      const localActivities = getUserData<string[]>('activities', []);
      const localFormats = getUserData<string[]>('formats', ['Einzelarbeit', 'Meeting', 'Telefonat', 'Workshop']);

      // Show local data immediately
      set({
        stakeholders: localStakeholders,
        projects: localProjects,
        activities: localActivities,
        formats: localFormats,
        loading: false,
      });

      // Then try to merge with Supabase data (own + teammates via RLS)
      const userId = getSupabaseUserId();
      const sessionValid = userId ? await ensureValidSession() : false;

      if (isSupabaseAvailable() && supabaseClient && userId && sessionValid) {
        // RLS automatically includes teammates' data if user is in a team
        const [shRes, prRes, actRes, fmtRes] = await Promise.all([
          supabaseClient.from('stakeholders').select('name').order('sort_order'),
          supabaseClient.from('projects').select('name').order('sort_order'),
          supabaseClient.from('activities').select('name').order('sort_order'),
          supabaseClient.from('formats').select('name').order('sort_order'),
        ]);

        // If any query had an error, skip Supabase merge (keep localStorage as-is)
        const anyError = shRes.error || prRes.error || actRes.error || fmtRes.error;
        if (anyError) {
          console.warn('[Sync] Master data fetch had errors, keeping localStorage');
        } else {
          // All queries succeeded — Supabase is source of truth.
          // Decrypt names (smart: tries Team Key first, then personal key)
          const sbStakeholders = (await Promise.all(
            (shRes.data || []).map((r: any) => decryptFieldSmart(r.name))
          )).filter(Boolean) as string[];
          const sbProjects = (await Promise.all(
            (prRes.data || []).map((r: any) => decryptFieldSmart(r.name))
          )).filter(Boolean) as string[];
          const sbActivities = (await Promise.all(
            (actRes.data || []).map((r: any) => decryptFieldSmart(r.name))
          )).filter(Boolean) as string[];
          const sbFormats = (await Promise.all(
            (fmtRes.data || []).map((r: any) => decryptFieldSmart(r.name))
          )).filter(Boolean) as string[];

          // Supabase data replaces localStorage per category.
          // For formats: fall back to defaults if Supabase has no formats
          // (fresh account or formats table never populated).
          const DEFAULT_FORMATS = ['Einzelarbeit', 'Meeting', 'Telefonat', 'Workshop'];

          const finalStakeholders = [...new Set(sbStakeholders)].sort();
          const finalProjects = [...new Set(sbProjects)].sort();
          const finalActivities = [...new Set(sbActivities)].sort();
          const finalFormats = sbFormats.length > 0 ? [...new Set(sbFormats)].sort() : DEFAULT_FORMATS;

          set({
            stakeholders: finalStakeholders,
            projects: finalProjects,
            activities: finalActivities,
            formats: finalFormats,
          });

          // Persist Supabase result locally (replaces stale localStorage)
          setUserData('stakeholders', finalStakeholders);
          setUserData('projects', finalProjects);
          setUserData('activities', finalActivities);
          setUserData('formats', finalFormats);

          // Push data back to Supabase only if non-empty
          // (don't re-push empty lists after intentional cleanup)
          if (finalStakeholders.length > 0) syncListToSupabase('stakeholders', finalStakeholders, userId);
          if (finalProjects.length > 0) syncListToSupabase('projects', finalProjects, userId);
          if (finalActivities.length > 0) syncListToSupabase('activities', finalActivities, userId);
          if (finalFormats.length > 0) syncListToSupabase('formats', finalFormats, userId);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch master data';
      set({ error: message, loading: false });
    }
  },

  addStakeholder: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.stakeholders.includes(name)) {
        throw new Error('Stakeholder already exists');
      }
      const updated = [...state.stakeholders, name].sort();
      set({ stakeholders: updated });
      setUserData('stakeholders', updated);

      // Sync full list to Supabase (encrypted)
      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('stakeholders', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add stakeholder';
      set({ error: message });
      throw error;
    }
  },

  addProject: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.projects.includes(name)) {
        throw new Error('Project already exists');
      }
      const updated = [...state.projects, name].sort();
      set({ projects: updated });
      setUserData('projects', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('projects', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add project';
      set({ error: message });
      throw error;
    }
  },

  addActivity: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.activities.includes(name)) {
        throw new Error('Activity already exists');
      }
      const updated = [...state.activities, name].sort();
      set({ activities: updated });
      setUserData('activities', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('activities', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add activity';
      set({ error: message });
      throw error;
    }
  },

  removeStakeholder: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.stakeholders.filter((s) => s !== name);
      set({ stakeholders: updated });
      setUserData('stakeholders', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('stakeholders', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove stakeholder';
      set({ error: message });
      throw error;
    }
  },

  removeProject: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.projects.filter((p) => p !== name);
      set({ projects: updated });
      setUserData('projects', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('projects', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove project';
      set({ error: message });
      throw error;
    }
  },

  removeActivity: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.activities.filter((a) => a !== name);
      set({ activities: updated });
      setUserData('activities', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('activities', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove activity';
      set({ error: message });
      throw error;
    }
  },

  renameStakeholder: async (oldName: string, newName: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.stakeholders.includes(newName)) {
        throw new Error('Stakeholder name already exists');
      }
      const updated = state.stakeholders
        .map((s) => (s === oldName ? newName : s))
        .sort();
      set({ stakeholders: updated });
      setUserData('stakeholders', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('stakeholders', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename stakeholder';
      set({ error: message });
      throw error;
    }
  },

  renameProject: async (oldName: string, newName: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.projects.includes(newName)) {
        throw new Error('Project name already exists');
      }
      const updated = state.projects
        .map((p) => (p === oldName ? newName : p))
        .sort();
      set({ projects: updated });
      setUserData('projects', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('projects', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename project';
      set({ error: message });
      throw error;
    }
  },

  renameActivity: async (oldName: string, newName: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.activities.includes(newName)) {
        throw new Error('Activity name already exists');
      }
      const updated = state.activities
        .map((a) => (a === oldName ? newName : a))
        .sort();
      set({ activities: updated });
      setUserData('activities', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('activities', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename activity';
      set({ error: message });
      throw error;
    }
  },

  // NEW: Format methods (same pattern as activities/stakeholders/projects)
  addFormat: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.formats.includes(name)) {
        throw new Error('Format already exists');
      }
      const updated = [...state.formats, name].sort();
      set({ formats: updated });
      setUserData('formats', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('formats', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add format';
      set({ error: message });
      throw error;
    }
  },

  removeFormat: async (name: string) => {
    set({ error: null });
    try {
      const state = get();
      const updated = state.formats.filter((f) => f !== name);
      set({ formats: updated });
      setUserData('formats', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('formats', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove format';
      set({ error: message });
      throw error;
    }
  },

  renameFormat: async (oldName: string, newName: string) => {
    set({ error: null });
    try {
      const state = get();
      if (state.formats.includes(newName)) {
        throw new Error('Format name already exists');
      }
      const updated = state.formats
        .map((f) => (f === oldName ? newName : f))
        .sort();
      set({ formats: updated });
      setUserData('formats', updated);

      const userId = getSupabaseUserId();
      if (userId) syncListToSupabase('formats', updated, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename format';
      set({ error: message });
      throw error;
    }
  },

  sortMasterData: () => {
    const state = get();
    set({
      stakeholders: [...state.stakeholders].sort(),
      projects: [...state.projects].sort(),
      activities: [...state.activities].sort(),
      formats: [...state.formats].sort(),
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// ── Cross-Device Master Data Sync ──────────────────────────────────────

let _masterPollInterval: ReturnType<typeof setInterval> | null = null;
let _masterRealtimeChannels: any[] = [];
let _masterSuppressUntil: number = 0;

// Track last known state fingerprint to avoid unnecessary updates
let _lastMasterFingerprint: string = '';

function getMasterFingerprint(sh: string[], pr: string[], ac: string[], fm: string[]): string {
  return [sh.join(','), pr.join(','), ac.join(','), fm.join(',')].join('|');
}

async function pullMasterDataFromSupabase(): Promise<void> {
  if (Date.now() < _masterSuppressUntil) return;

  const userId = getSupabaseUserId();
  if (!isSupabaseAvailable() || !supabaseClient || !userId) return;

  // Ensure auth session is valid before querying (avoids 401 spam)
  const sessionOk = await ensureValidSession();
  if (!sessionOk) return;

  // If user is in a team, wait for Team Key before decrypting
  const { connected } = useTeamStore.getState();
  if (connected && !hasTeamKey()) return;

  try {
    const [shRes, prRes, actRes, fmtRes] = await Promise.all([
      supabaseClient.from('stakeholders').select('name').order('sort_order'),
      supabaseClient.from('projects').select('name').order('sort_order'),
      supabaseClient.from('activities').select('name').order('sort_order'),
      supabaseClient.from('formats').select('name').order('sort_order'),
    ]);

    // Re-check suppress after async query
    if (Date.now() < _masterSuppressUntil) return;

    const sbStakeholders = (await Promise.all(
      (shRes.data || []).map((r: any) => decryptFieldSmart(r.name))
    )).filter(Boolean) as string[];
    const sbProjects = (await Promise.all(
      (prRes.data || []).map((r: any) => decryptFieldSmart(r.name))
    )).filter(Boolean) as string[];
    const sbActivities = (await Promise.all(
      (actRes.data || []).map((r: any) => decryptFieldSmart(r.name))
    )).filter(Boolean) as string[];
    const sbFormats = (await Promise.all(
      (fmtRes.data || []).map((r: any) => decryptFieldSmart(r.name))
    )).filter(Boolean) as string[];

    // Supabase is source of truth — use its data directly, don't merge with local.
    // This matches the fetch() logic: once Supabase responds, local stale data is replaced.
    const DEFAULT_FORMATS = ['Einzelarbeit', 'Meeting', 'Telefonat', 'Workshop'];
    const hasAnySbData = sbStakeholders.length > 0 || sbProjects.length > 0
      || sbActivities.length > 0 || sbFormats.length > 0;

    const result = {
      stakeholders: [...new Set(sbStakeholders)].sort(),
      projects: [...new Set(sbProjects)].sort(),
      activities: [...new Set(sbActivities)].sort(),
      formats: sbFormats.length > 0 ? [...new Set(sbFormats)].sort() : (hasAnySbData ? DEFAULT_FORMATS : useMasterStore.getState().formats),
    };

    // Check fingerprint — skip if unchanged
    const newFp = getMasterFingerprint(result.stakeholders, result.projects, result.activities, result.formats);
    if (newFp === _lastMasterFingerprint) return;
    _lastMasterFingerprint = newFp;

    // Update store + localStorage
    useMasterStore.setState(result);
    setUserData('stakeholders', result.stakeholders);
    setUserData('projects', result.projects);
    setUserData('activities', result.activities);
    setUserData('formats', result.formats);
  } catch (e) {
    // silent
  }
}

export function subscribeToMasterSync(): void {
  const userId = getSupabaseUserId();
  if (!isSupabaseAvailable() || !supabaseClient || !userId) return;

  unsubscribeFromMasterSync();

  // Initialize fingerprint from current state
  const state = useMasterStore.getState();
  _lastMasterFingerprint = getMasterFingerprint(state.stakeholders, state.projects, state.activities, state.formats);

  // Poll every 5 seconds (master data changes less frequently than timers)
  _masterPollInterval = setInterval(() => {
    pullMasterDataFromSupabase();
  }, 5000);

  // Realtime subscriptions for each table
  const tables = ['stakeholders', 'projects', 'activities', 'formats'];
  for (const table of tables) {
    try {
      const channel = supabaseClient
        .channel(`master-${table}-${userId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${userId}`,
          },
          () => {
            setTimeout(() => pullMasterDataFromSupabase(), 500);
          }
        )
        .subscribe();
      _masterRealtimeChannels.push(channel);
    } catch (e) {
      // Realtime failed, polling is the fallback
    }
  }
}

export function unsubscribeFromMasterSync(): void {
  if (_masterRealtimeChannels.length > 0 && supabaseClient) {
    for (const ch of _masterRealtimeChannels) {
      try { supabaseClient.removeChannel(ch); } catch (_) {}
    }
    _masterRealtimeChannels = [];
  }
  if (_masterPollInterval) {
    clearInterval(_masterPollInterval);
    _masterPollInterval = null;
  }
}

// Subscribe to store changes to auto-suppress after local mutations
useMasterStore.subscribe((state, prevState) => {
  const changed =
    state.stakeholders !== prevState.stakeholders ||
    state.projects !== prevState.projects ||
    state.activities !== prevState.activities ||
    state.formats !== prevState.formats;

  if (changed) {
    _masterSuppressUntil = Date.now() + 3000;
    _lastMasterFingerprint = getMasterFingerprint(
      state.stakeholders, state.projects, state.activities, state.formats
    );
  }
});
