import { create } from 'zustand';
import { Team, TeamMember, TimeEntry, PeriodType } from '@/types';

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
      const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name,
        creator_id: 'current_user',
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add the creator as first member
      const creatorMember: TeamMember = {
        id: `member_${Date.now()}`,
        team_id: newTeam.id,
        user_id: 'current_user',
        joined_at: new Date().toISOString(),
      };

      // Load current user's entries from localStorage
      const storedEntries = localStorage.getItem('entries');
      const currentEntries: TimeEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      const memberEntriesMap = new Map<string, TimeEntry[]>();
      memberEntriesMap.set('current_user', currentEntries);

      set({
        team: newTeam,
        members: [creatorMember],
        memberEntries: memberEntriesMap,
        connected: true,
        loading: false,
      });

      localStorage.setItem('team', JSON.stringify(newTeam));
      localStorage.setItem('teamMembers', JSON.stringify([creatorMember]));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create team';
      set({ error: message, loading: false });
      throw error;
    }
  },

  joinTeam: async (inviteCode: string, teamName: string) => {
    set({ loading: true, error: null });
    try {
      // In a real app, this would validate the invite code with Supabase
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
        user_id: 'current_user', // Will be replaced with actual user ID
        joined_at: new Date().toISOString(),
      };

      set({
        team: newTeam,
        members: [newMember],
        connected: true,
        loading: false,
      });

      localStorage.setItem('team', JSON.stringify(newTeam));
      localStorage.setItem('teamMembers', JSON.stringify([newMember]));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join team';
      set({ error: message, loading: false });
      throw error;
    }
  },

  leaveTeam: async () => {
    set({ loading: true, error: null });
    try {
      localStorage.removeItem('team');
      localStorage.removeItem('teamMembers');
      localStorage.removeItem('memberEntries');

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
      // Load team data from localStorage
      const storedTeam = localStorage.getItem('team');
      const storedMembers = localStorage.getItem('teamMembers');
      const storedMemberEntries = localStorage.getItem('memberEntries');

      if (storedTeam) {
        const team = JSON.parse(storedTeam);
        const members: TeamMember[] = storedMembers ? JSON.parse(storedMembers) : [];
        const memberEntriesData = storedMemberEntries
          ? JSON.parse(storedMemberEntries)
          : {};

        const memberEntriesMap = new Map<string, TimeEntry[]>();
        for (const [memberId, entries] of Object.entries(memberEntriesData)) {
          memberEntriesMap.set(memberId, entries as TimeEntry[]);
        }

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

      // In a real app, this would fetch from Supabase and sync with team members
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

// Initialize team data on store creation
if (typeof window !== 'undefined') {
  useTeamStore.getState().syncTeamData();
}
