import { create } from 'zustand';
import { Team, TeamMember, TimeEntry, PeriodType } from '@/types';
import { getUserData, setUserData, removeUserData } from '@/lib/userStorage';
import { useAuthStore } from './authStore';
import { supabaseClient, isSupabaseAvailable } from '@/lib/supabase';
import { decryptField } from '@/lib/crypto';

interface TeamState {
  team: Team | null;
  members: TeamMember[];
  memberEntries: Map<string, TimeEntry[]>;
  period: PeriodType;
  connected: boolean;
  loading: boolean;
  error: string | null;
  createTeam: (name: string) => Promise<void>;
  joinTeam: (inviteCode: string, displayName?: string) => Promise<void>;
  leaveTeam: () => Promise<void>;
  removeMember: (memberUserId: string) => Promise<void>;
  syncTeamData: () => Promise<void>;
  setTeamPeriod: (period: PeriodType) => void;
  getTeamMemberEntries: (memberId: string) => TimeEntry[];
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Generate a unique 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  team: null,
  members: [],
  memberEntries: new Map(),
  period: 'week',
  connected: false,
  loading: false,
  error: null,

  // ========================================================================
  // CREATE TEAM
  // ========================================================================
  createTeam: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const userId = profile?.id || 'anonymous';
      const displayName = profile?.codename || 'User';

      // ── Supabase mode ──
      if (isSupabaseAvailable() && supabaseClient) {
        const inviteCode = generateInviteCode();

        // Insert team
        const { data: teamData, error: teamErr } = await supabaseClient
          .from('teams')
          .insert({
            name,
            creator_id: userId,
            invite_code: inviteCode,
          })
          .select()
          .single();

        if (teamErr) throw new Error(teamErr.message);

        // Insert creator as first member
        const { error: memberErr } = await supabaseClient
          .from('team_members')
          .insert({
            team_id: teamData.id,
            user_id: userId,
          });

        if (memberErr) throw new Error(memberErr.message);

        const team: Team = {
          id: teamData.id,
          name: teamData.name,
          creator_id: teamData.creator_id,
          invite_code: teamData.invite_code,
          created_at: teamData.created_at,
          updated_at: teamData.updated_at,
        };

        const member: TeamMember = {
          id: `${teamData.id}_${userId}`,
          team_id: teamData.id,
          user_id: displayName,
          joined_at: new Date().toISOString(),
        };

        const memberEntriesMap = new Map<string, TimeEntry[]>();
        memberEntriesMap.set(displayName, []);

        set({
          team,
          members: [member],
          memberEntries: memberEntriesMap,
          connected: true,
          loading: false,
        });

        // Also persist locally for offline recovery
        setUserData('team', team);
        setUserData('teamMembers', [member]);
        return;
      }

      // ── Offline/local mode ──
      const inviteCode = generateInviteCode();
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name,
        creator_id: userId,
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const creatorMember: TeamMember = {
        id: `member_${Date.now()}`,
        team_id: newTeam.id,
        user_id: displayName,
        joined_at: new Date().toISOString(),
      };

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

  // ========================================================================
  // JOIN TEAM
  // ========================================================================
  joinTeam: async (inviteCode: string, displayName?: string) => {
    set({ loading: true, error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const userName = displayName || profile?.codename || 'User';
      const userId = profile?.id || 'anonymous';

      // ── Supabase mode ──
      if (isSupabaseAvailable() && supabaseClient) {
        // Call RPC function to validate code and join
        const { data, error: rpcError } = await supabaseClient
          .rpc('join_team_by_code', {
            p_invite_code: inviteCode.toUpperCase(),
          });

        if (rpcError) {
          if (rpcError.message?.includes('INVALID_INVITE_CODE')) {
            throw new Error('INVALID_INVITE_CODE');
          }
          throw new Error(rpcError.message);
        }

        const teamData = data as Record<string, any>;
        const team: Team = {
          id: teamData.id,
          name: teamData.name,
          creator_id: teamData.creator_id,
          invite_code: teamData.invite_code,
          created_at: teamData.created_at,
          updated_at: teamData.updated_at,
        };

        const member: TeamMember = {
          id: `${team.id}_${userId}`,
          team_id: team.id,
          user_id: userName,
          joined_at: new Date().toISOString(),
        };

        set({
          team,
          members: [member],
          connected: true,
          loading: false,
        });

        setUserData('team', team);
        setUserData('teamMembers', [member]);

        // Immediately sync to get all members and their entries
        await get().syncTeamData();
        return;
      }

      // ── Offline/local mode ──
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name: userName,
        invite_code: inviteCode.toUpperCase(),
        creator_id: 'other_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newMember: TeamMember = {
        id: `member_${Date.now()}`,
        team_id: newTeam.id,
        user_id: userName,
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

  // ========================================================================
  // LEAVE TEAM
  // ========================================================================
  leaveTeam: async () => {
    set({ loading: true, error: null });
    try {
      // ── Supabase mode ──
      if (isSupabaseAvailable() && supabaseClient) {
        const profile = useAuthStore.getState().profile;
        const team = get().team;

        if (profile?.id && team?.id) {
          // Delete team_member row (RLS ensures only own rows)
          await supabaseClient
            .from('team_members')
            .delete()
            .eq('team_id', team.id)
            .eq('user_id', profile.id);

          // If creator, delete the entire team
          if (team.creator_id === profile.id) {
            await supabaseClient
              .from('teams')
              .delete()
              .eq('id', team.id);
          }
        }
      }

      // Clear local state
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

  // ========================================================================
  // REMOVE MEMBER (creator only)
  // ========================================================================
  removeMember: async (memberUserId: string) => {
    set({ error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const team = get().team;

      if (!profile?.id || !team?.id) throw new Error('Not authenticated or no team');
      if (team.creator_id !== profile.id) throw new Error('Only the team creator can remove members');

      if (isSupabaseAvailable() && supabaseClient) {
        // Delete from team_members directly by user_id (no codename lookup needed)
        const { error: delErr } = await supabaseClient
          .from('team_members')
          .delete()
          .eq('team_id', team.id)
          .eq('user_id', memberUserId);

        if (delErr) throw new Error(delErr.message);
      }

      // Update local state — find display_name for memberEntries cleanup
      const removedMember = get().members.find((m) => m.user_id === memberUserId);
      const members = get().members.filter((m) => m.user_id !== memberUserId);
      const memberEntries = new Map(get().memberEntries);
      if (removedMember?.display_name) {
        memberEntries.delete(removedMember.display_name);
      }

      set({ members, memberEntries });
      setUserData('teamMembers', members);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      set({ error: message });
      throw error;
    }
  },

  // ========================================================================
  // SYNC TEAM DATA
  // ========================================================================
  syncTeamData: async () => {
    set({ loading: true, error: null });
    try {
      const profile = useAuthStore.getState().profile;
      const displayName = profile?.codename || 'User';

      // ── Supabase mode ──
      if (isSupabaseAvailable() && supabaseClient && profile?.id) {
        // Check if user is in any team
        const { data: membershipData } = await supabaseClient
          .from('team_members')
          .select('team_id')
          .eq('user_id', profile.id)
          .limit(1);

        if (!membershipData || membershipData.length === 0) {
          // Check localStorage fallback
          const localTeam = getUserData<Team | null>('team', null);
          if (localTeam) {
            // We have a local team but no Supabase membership — load local data
            await syncLocalData(set, get, displayName);
          } else {
            set({ loading: false, connected: false });
          }
          return;
        }

        const teamId = membershipData[0].team_id;

        // Fetch team details
        const { data: teamData } = await supabaseClient
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();

        if (!teamData) {
          set({ loading: false, connected: false });
          return;
        }

        const team: Team = {
          id: teamData.id,
          name: teamData.name,
          creator_id: teamData.creator_id,
          invite_code: teamData.invite_code,
          created_at: teamData.created_at,
          updated_at: teamData.updated_at,
        };

        // Fetch all team members with their profiles
        const { data: membersData } = await supabaseClient
          .from('team_members')
          .select(`
            id,
            team_id,
            user_id,
            joined_at
          `)
          .eq('team_id', teamId);

        // Fetch codenames for each member (decrypt from DB)
        const memberUserIds = (membersData || []).map((m: any) => m.user_id);
        const { data: profilesData } = await supabaseClient
          .from('profiles')
          .select('id, codename')
          .in('id', memberUserIds);

        const profileMap = new Map<string, string>();
        for (const p of (profilesData || [])) {
          const decrypted = await decryptField(p.codename || p.id);
          profileMap.set(p.id, decrypted);
        }

        const members: TeamMember[] = (membersData || []).map((m: any) => ({
          id: m.id,
          team_id: m.team_id,
          user_id: m.user_id, // Keep real UUID
          display_name: profileMap.get(m.user_id) || m.user_id,
          joined_at: m.joined_at,
        }));

        // Fetch all team members' entries directly (RLS handles visibility)
        const memberEntriesMap = new Map<string, TimeEntry[]>();
        for (const uid of memberUserIds) {
          const displayName_member = profileMap.get(uid) || uid;
          const { data: entriesData } = await supabaseClient
            .from('time_entries')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: false });

          if (entriesData) {
            const entries: TimeEntry[] = await Promise.all(
              entriesData.map(async (row: any) => ({
                id: row.id,
                user_id: row.user_id,
                date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0],
                stakeholder: await decryptField(row.stakeholder || ''),
                projekt: await decryptField(row.projekt || ''),
                taetigkeit: await decryptField(row.taetigkeit || ''),
                start_time: row.start_time || '',
                end_time: row.end_time || '',
                duration_ms: row.duration_ms || 0,
                notiz: await decryptField(row.notiz || ''),
                created_at: row.created_at || '',
                updated_at: row.updated_at || '',
              }))
            );
            memberEntriesMap.set(displayName_member, entries);
          }
        }

        // Also include current user's local entries if they're not in Supabase yet
        const localEntries = getUserData<TimeEntry[]>('entries', []);
        if (localEntries.length > 0) {
          const existing = memberEntriesMap.get(displayName) || [];
          const existingIds = new Set(existing.map((e) => e.id));
          const newLocal = localEntries.filter((e) => !existingIds.has(e.id));
          memberEntriesMap.set(displayName, [...existing, ...newLocal]);
        }

        set({
          team,
          members,
          memberEntries: memberEntriesMap,
          connected: true,
          loading: false,
        });

        // Persist locally for offline recovery
        setUserData('team', team);
        setUserData('teamMembers', members);
        return;
      }

      // ── Offline/local mode ──
      await syncLocalData(set, get, displayName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync team data';
      set({ error: message, loading: false });
      // Don't throw — sync failures should not crash the app
      console.error('Team sync error:', message);
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

// ========================================================================
// Helper: Sync from localStorage (offline fallback)
// ========================================================================
async function syncLocalData(
  set: (state: Partial<TeamState>) => void,
  _get: () => TeamState,
  displayName: string
) {
  const team = getUserData<Team | null>('team', null);
  const members = getUserData<TeamMember[]>('teamMembers', []);
  const memberEntriesData = getUserData<Record<string, TimeEntry[]>>('memberEntries', {});

  if (team) {
    const memberEntriesMap = new Map<string, TimeEntry[]>();
    for (const [memberId, entries] of Object.entries(memberEntriesData)) {
      memberEntriesMap.set(memberId, entries as TimeEntry[]);
    }

    // Load current user's entries
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
    set({ loading: false, connected: false });
  }
}

// NOTE: Team sync is deferred to after auth (called from App.tsx),
// NOT on store creation, because we need the user ID for scoped keys.
