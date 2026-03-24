import { create } from 'zustand';
import { Team, TeamMember, TimeEntry, PeriodType } from '@/types';
import { getUserData, setUserData, removeUserData } from '@/lib/userStorage';
import { useAuthStore } from './authStore';

interface TeamState {
  team: Team | null;
  members: TeamMember[];
  memberEntries: Map<string, TimeEntry[]>;
  period: PeriodType;
  connected: boolean;
  loading: boolean;
  error: string | null;
  createTeam: (name: string) => Promise<void>;
  joinTeam: (inviteCode: string, teamName: string) => Promise<void>;
  leaveTeam: () => Promise<void>;
  syncTeamData: () => Promise<void>;
  setTeamPeriod: (period: PeriodType) => void;
  getTeamMemberEntries: (memberId: string) => TimeEntry[];
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  team: null,
  members: [],
  memberEntries: new Map(),
  period: 'week',
  connected: false,
  loading: false,
  error: null,

  createTeam: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const userId = profile?.id || 'anonymous';
      const displayName = profile?.codename || 'User';
      const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name,
        creator_id: userId,
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add the creator as first member
      const creatorMember: TeamMember = {
        id: `member_${Date.now()}`,
        team_id: newTeam.id,
        user_id: displayName,
        joined_at: new Date().toISOString(),
      };

      // Load current user's entries (user-scoped)
      const currentEntries = getUserData<TimeEntry[]>('entries', []);
      const memberEntriesMap = new Map<string, TimeEntry[]>();
      memberEntriesMap.set(displayName, currentEntries);

      set({
        team: newTeam,
        members: [creatorMember],
        memberEntries: memberEntriesMap,
        connected: true,
        loading: false,
      });

      setUserData('team', newTeam);
      setUserData('teamMembers', [creatorMember]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create team';
      set({ error: message, loading: false });
      throw error;
    }
  },

  joinTeam: async (inviteCode: string, teamName: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const displayName = profile?.codename || 'User';
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name: teamName,
        invite_code: inviteCode,
        creator_id: 'other_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newMember: TeamMember = {
        id: `member_${Date.now()}`,
        team_id: newTeam.id,
        user_id: displayName,
        joined_at: new Date().toISOString(),
      };

      set({
        team: newTeam,
        members: [newMember],
        connected: true,
        loading: false,
      });

      setUserData('team', newTeam);
      setUserData('teamMembers', [newMember]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join team';
      set({ error: message, loading: false });
      throw error;
    }
  },

  leaveTeam: async () => {
    set({ loading: true, error: null });
    try {
      removeUserData('team');
      removeUserData('teamMembers');
      removeUserData('memberEntries');

      set({
        team: null,
        members: [],
        memberEntries: new Map(),
        connected: false,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave team';
      set({ error: message, loading: false });
      throw error;
    }
  },

  syncTeamData: async () => {
    set({ loading: true, error: null });
    try {
      const team = getUserData<Team | null>('team', null);
      const members = getUserData<TeamMember[]>('teamMembers', []);
      const memberEntriesData = getUserData<Record<string, TimeEntry[]>>('memberEntries', {});

      if (team) {
        const memberEntriesMap = new Map<string, TimeEntry[]>();
        for (const [memberId, entries] of Object.entries(memberEntriesData)) {
          memberEntriesMap.set(memberId, entries as TimeEntry[]);
        }

        // Also load current user's entries into the map
        const profile = useAuthStore.getState().profile;
        const displayName = profile?.codename || 'User';
        const currentEntries = getUserData<TimeEntry[]>('entries', []);
        memberEntriesMap.set(displayName, currentEntries);

        set({
          team,
          members,
          memberEntries: memberEntriesMap,
          connected: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync team data';
      set({ error: message, loading: false });
      throw error;
    }
  },

  setTeamPeriod: (period: PeriodType) => {
    set({ period });
  },

  getTeamMemberEntries: (memberId: string): TimeEntry[] => {
    const state = get();
    return state.memberEntries.get(memberId) || [];
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// NOTE: Team sync is deferred to after auth (called from App.tsx),
// NOT on store creation, because we need the user ID for scoped keys.
