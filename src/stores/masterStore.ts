import { create } from 'zustand';
import { getUserData, setUserData } from '@/lib/userStorage';
import { supabaseClient, isSupabaseAvailable } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { encryptField, decryptField, hasEncryptionKey } from '@/lib/crypto';

interface MasterState {
  stakeholders: string[];
  projects: string[];
  activities: string[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  addStakeholder: (name: string) => Promise<void>;
  addProject: (name: string) => Promise<void>;
  addActivity: (name: string) => Promise<void>;
  removeStakeholder: (name: string) => Promise<void>;
  removeProject: (name: string) => Promise<void>;
  removeActivity: (name: string) => Promise<void>;
  renameStakeholder: (oldName: string, newName: string) => Promise<void>;
  renameProject: (oldName: string, newName: string) => Promise<void>;
  renameActivity: (oldName: string, newName: string) => Promise<void>;
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

// Helper: merge and deduplicate names from Supabase + local, sorted
function mergeNames(supabaseNames: string[], localNames: string[]): string[] {
  const set = new Set([...supabaseNames, ...localNames]);
  return Array.from(set).sort();
}

// Helper: sync a local list to Supabase table (non-blocking bulk upsert, encrypted)
async function syncListToSupabase(
  table: 'stakeholders' | 'projects' | 'activities',
  names: string[],
  userId: string
) {
  if (!isSupabaseAvailable() || !supabaseClient || names.length === 0) return;

  // Encrypt names before sending to Supabase
  const encryptedRows = await Promise.all(
    names.map(async (name, idx) => ({
      user_id: userId,
      name: hasEncryptionKey() ? await encryptField(name) : name,
      sort_order: idx,
    }))
  );

  // Delete existing rows first (encrypted values differ each time due to random IV)
  await supabaseClient.from(table).delete().eq('user_id', userId);

  // Insert fresh
  supabaseClient
    .from(table)
    .insert(encryptedRows)
    .then(({ error }) => {
      if (error) console.warn(`Supabase ${table} sync failed:`, error.message);
    });
}

export const useMasterStore = create<MasterState>((set, get) => ({
  stakeholders: [],
  projects: [],
  activities: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      // Always load from localStorage first (source of truth)
      const localStakeholders = getUserData<string[]>('stakeholders', []);
      const localProjects = getUserData<string[]>('projects', []);
      const localActivities = getUserData<string[]>('activities', []);

      // Show local data immediately
      set({
        stakeholders: localStakeholders,
        projects: localProjects,
        activities: localActivities,
        loading: false,
      });

      // Then try to merge with Supabase data (own + teammates via RLS)
      const userId = getSupabaseUserId();

      if (isSupabaseAvailable() && supabaseClient && userId) {
        // RLS automatically includes teammates' data if user is in a team
        const [shRes, prRes, actRes] = await Promise.all([
          supabaseClient.from('stakeholders').select('name').order('sort_order'),
          supabaseClient.from('projects').select('name').order('sort_order'),
          supabaseClient.from('activities').select('name').order('sort_order'),
        ]);

        // Decrypt names from Supabase (filter out empty/failed decryptions)
        const sbStakeholders = (await Promise.all(
          (shRes.data || []).map((r: any) => decryptField(r.name))
        )).filter(Boolean);
        const sbProjects = (await Promise.all(
          (prRes.data || []).map((r: any) => decryptField(r.name))
        )).filter(Boolean);
        const sbActivities = (await Promise.all(
          (actRes.data || []).map((r: any) => decryptField(r.name))
        )).filter(Boolean);

        // Merge: Supabase + local (dedup)
        const mergedStakeholders = mergeNames(sbStakeholders, localStakeholders);
        const mergedProjects = mergeNames(sbProjects, localProjects);
        const mergedActivities = mergeNames(sbActivities, localActivities);

        set({
          stakeholders: mergedStakeholders,
          projects: mergedProjects,
          activities: mergedActivities,
        });

        // Persist merged result locally
        setUserData('stakeholders', mergedStakeholders);
        setUserData('projects', mergedProjects);
        setUserData('activities', mergedActivities);

        // Push any local-only items to Supabase
        syncListToSupabase('stakeholders', mergedStakeholders, userId);
        syncListToSupabase('projects', mergedProjects, userId);
        syncListToSupabase('activities', mergedActivities, userId);
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

  sortMasterData: () => {
    const state = get();
    set({
      stakeholders: [...state.stakeholders].sort(),
      projects: [...state.projects].sort(),
      activities: [...state.activities].sort(),
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
