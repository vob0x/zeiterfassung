import { create } from 'zustand';

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

export const useMasterStore = create<MasterState>((set, get) => ({
  stakeholders: [],
  projects: [],
  activities: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      // Load from localStorage if available
      const storedStakeholders = localStorage.getItem('stakeholders');
      const storedProjects = localStorage.getItem('projects');
      const storedActivities = localStorage.getItem('activities');

      set({
        stakeholders: storedStakeholders
          ? JSON.parse(storedStakeholders)
          : [],
        projects: storedProjects ? JSON.parse(storedProjects) : [],
        activities: storedActivities ? JSON.parse(storedActivities) : [],
        loading: false,
      });

      // In a real app, this would fetch from Supabase
      // For now, we just use localStorage
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
      localStorage.setItem('stakeholders', JSON.stringify(updated));
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
      localStorage.setItem('projects', JSON.stringify(updated));
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
      localStorage.setItem('activities', JSON.stringify(updated));
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
      localStorage.setItem('stakeholders', JSON.stringify(updated));
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
      localStorage.setItem('projects', JSON.stringify(updated));
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
      localStorage.setItem('activities', JSON.stringify(updated));
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
      localStorage.setItem('stakeholders', JSON.stringify(updated));
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
      localStorage.setItem('projects', JSON.stringify(updated));
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
      localStorage.setItem('activities', JSON.stringify(updated));
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
