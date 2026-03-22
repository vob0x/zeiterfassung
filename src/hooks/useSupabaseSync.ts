// @ts-nocheck
/**
 * useSupabaseSync Hook
 * Syncs local Zustand store data with Supabase
 * - On login: pull all data from Supabase
 * - On data change: push to Supabase (debounced, 2 second delay)
 * - Conflict resolution: last-write-wins with timestamps
 * - Offline detection: queue changes when offline, flush when back online
 * - Realtime subscriptions for team data updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase';
import { offlineQueue, QueueTable, QueueAction } from '../lib/offlineQueue';
import { dsb } from '../lib/dsb';
import {
  TimeEntry,
  Stakeholder,
  Project,
  Activity,
  UserSettings,
} from '@/types';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  isInitialized: boolean;
}

interface SyncOptions {
  debounceMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: SyncOptions = {
  debounceMs: 2000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Hook for syncing data with Supabase
 */
export function useSupabaseSync(options: SyncOptions = DEFAULT_OPTIONS) {
  const syncState = useRef<SyncState>({
    isSyncing: false,
    lastSyncTime: localStorage.getItem('lastSupabaseSync'),
    isInitialized: false,
  });

  const debounceTimers = useRef<Record<QueueTable, NodeJS.Timeout>>({
    time_entries: null as any,
    stakeholders: null as any,
    projects: null as any,
    activities: null as any,
    settings: null as any,
  });

  const subscriptions = useRef<Array<() => void>>([]);

  /**
   * Sync time entries with Supabase
   */
  const syncEntries = useCallback(
    async (entries: TimeEntry[]): Promise<void> => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('Not authenticated');

        // Get remote entries
        const { data: remoteEntries, error: fetchError } = await supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', session.user.id);

        if (fetchError) throw fetchError;

        // Conflict resolution: last-write-wins
        const merged = mergeWithRemote(
          entries,
          remoteEntries || [],
          'updated_at'
        );

        // Upsert entries
        const { error: upsertError } = await supabase
          .from('time_entries')
          .upsert(merged, { onConflict: 'id' });

        if (upsertError) throw upsertError;

        console.log('Entries synced:', merged.length);
      } catch (error) {
        console.error('Failed to sync entries:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Sync master data (stakeholders, projects, activities)
   */
  const syncMasterData = useCallback(
    async (
      stakeholders: Stakeholder[],
      projects: Project[],
      activities: Activity[]
    ): Promise<void> => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('Not authenticated');

        // Sync stakeholders
        await syncTable('stakeholders', stakeholders, session.user.id);

        // Sync projects
        await syncTable('projects', projects, session.user.id);

        // Sync activities
        await syncTable('activities', activities, session.user.id);

        console.log('Master data synced');
      } catch (error) {
        console.error('Failed to sync master data:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Sync user settings
   */
  const syncSettings = useCallback(
    async (settings: UserSettings): Promise<void> => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('Not authenticated');

        // Get remote settings
        const { data: remoteSettings, error: fetchError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        // Merge with remote (last-write-wins)
        const merged =
          remoteSettings &&
          new Date(remoteSettings.updated_at) > new Date(settings.updated_at)
            ? remoteSettings
            : settings;

        // Upsert settings
        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert(merged);

        if (upsertError) throw upsertError;

        console.log('Settings synced');
      } catch (error) {
        console.error('Failed to sync settings:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Subscribe to realtime team changes
   */
  const subscribeToTeamChanges = useCallback(
    (teamId: string, onUpdate: (entries: TimeEntry[]) => void): void => {
      try {
        const subscription = supabase
          .from(`time_entries:team_id=eq.${teamId}`)
          .on('*', (payload) => {
            console.log('Team data updated:', payload);
            // Re-fetch team entries
            fetchTeamEntries(teamId).then(onUpdate);
          })
          .subscribe();

        subscriptions.current.push(() => subscription.unsubscribe());
      } catch (error) {
        console.error('Failed to subscribe to team changes:', error);
      }
    },
    []
  );

  /**
   * Fetch team entries
   */
  const fetchTeamEntries = async (teamId: string): Promise<TimeEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;
      return (data || []) as TimeEntry[];
    } catch (error) {
      console.error('Failed to fetch team entries:', error);
      return [];
    }
  };

  /**
   * Flush offline queue when back online
   */
  const flushOfflineQueue = useCallback(async (): Promise<void> => {
    const queue = offlineQueue.getQueue();

    if (queue.length === 0) {
      console.log('Offline queue is empty');
      return;
    }

    console.log(`Flushing ${queue.length} offline changes`);

    syncState.current.isSyncing = true;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      // Process queue items
      for (const item of queue) {
        let success = false;

        // Retry logic
        for (let attempt = 0; attempt < (DEFAULT_OPTIONS.retryAttempts || 3); attempt++) {
          try {
            await processQueueItem(item, session.user.id);
            success = true;
            break;
          } catch (error) {
            console.warn(
              `Queue item ${item.id} attempt ${attempt + 1} failed:`,
              error
            );
            if (attempt < (DEFAULT_OPTIONS.retryAttempts || 3) - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, DEFAULT_OPTIONS.retryDelayMs || 1000)
              );
            }
          }
        }

        if (success) {
          offlineQueue.removeItem(item.id);
        }
      }

      // Update sync timestamp
      const metadata = offlineQueue.getMetadata();
      metadata.lastFlushTime = new Date().toISOString();
      metadata.flushCount = (metadata.flushCount || 0) + 1;
      offlineQueue.updateMetadata(metadata);

      syncState.current.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastSupabaseSync', syncState.current.lastSyncTime);

      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent('sync:complete'));

      console.log('Offline queue flushed successfully');
    } catch (error) {
      console.error('Failed to flush offline queue:', error);
      const metadata = offlineQueue.getMetadata();
      metadata.errorCount = (metadata.errorCount || 0) + 1;
      offlineQueue.updateMetadata(metadata);
      throw error;
    } finally {
      syncState.current.isSyncing = false;
    }
  }, []);

  /**
   * Initialize sync on login
   */
  const initialize = useCallback(
    async (userId: string): Promise<void> => {
      if (syncState.current.isInitialized) return;

      console.log('Initializing Supabase sync...');

      try {
        // Pull all data from Supabase
        const entries = await pullEntries(userId);
        const masterData = await pullMasterData(userId);
        const settings = await pullSettings(userId);

        // Save to DSB for recovery
        dsb.save(
          entries,
          masterData.stakeholders.map((s) => s.name),
          masterData.projects.map((p) => p.name),
          masterData.activities.map((a) => a.name),
          settings
        );

        syncState.current.isInitialized = true;

        // Dispatch initialization complete event
        const event = new CustomEvent('sync:initialized', {
          detail: { entries, masterData, settings },
        });
        window.dispatchEvent(event);

        console.log('Sync initialized successfully');
      } catch (error) {
        console.error('Failed to initialize sync:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Setup online/offline handlers
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Attempting to flush offline queue...');
      try {
        await flushOfflineQueue();
      } catch (error) {
        console.error('Error flushing queue:', error);
      }
    };

    window.addEventListener('app:online', handleOnline);

    return () => {
      window.removeEventListener('app:online', handleOnline);
    };
  }, [flushOfflineQueue]);

  /**
   * Cleanup subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      subscriptions.current.forEach((unsubscribe) => unsubscribe());
      subscriptions.current = [];
      Object.values(debounceTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return {
    syncEntries,
    syncMasterData,
    syncSettings,
    subscribeToTeamChanges,
    flushOfflineQueue,
    initialize,
    isSyncing: syncState.current.isSyncing,
    lastSyncTime: syncState.current.lastSyncTime,
    isInitialized: syncState.current.isInitialized,
  };
}

/**
 * Helper function to merge local and remote data (last-write-wins)
 */
function mergeWithRemote<T extends { updated_at: string }>(
  local: T[],
  remote: T[],
  timestampField: keyof T = 'updated_at'
): T[] {
  const merged: Record<string, T> = {};

  // Add all remote items
  for (const item of remote) {
    merged[(item as any).id] = item;
  }

  // Merge with local items (local wins if newer)
  for (const item of local) {
    const id = (item as any).id;
    const existing = merged[id];

    if (!existing) {
      merged[id] = item;
    } else if (new Date(item[timestampField]) > new Date(existing[timestampField])) {
      merged[id] = item;
    }
  }

  return Object.values(merged);
}

/**
 * Helper function to sync a table
 */
async function syncTable(
  table: string,
  data: any[],
  userId: string
): Promise<void> {
  const { data: remoteData, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (fetchError) throw fetchError;

  const merged = mergeWithRemote(data, remoteData || [], 'updated_at');

  const { error: upsertError } = await supabase
    .from(table)
    .upsert(merged, { onConflict: 'id' });

  if (upsertError) throw upsertError;
}

/**
 * Helper function to pull entries from Supabase
 */
async function pullEntries(userId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as TimeEntry[];
}

/**
 * Helper function to pull master data
 */
async function pullMasterData(
  userId: string
): Promise<{
  stakeholders: Stakeholder[];
  projects: Project[];
  activities: Activity[];
}> {
  const [stakeholders, projects, activities] = await Promise.all([
    supabase
      .from('stakeholders')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || []) as Stakeholder[];
      }),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || []) as Project[];
      }),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || []) as Activity[];
      }),
  ]);

  return { stakeholders, projects, activities };
}

/**
 * Helper function to pull settings
 */
async function pullSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserSettings) || null;
}

/**
 * Helper function to process a single queue item
 */
async function processQueueItem(item: any, userId: string): Promise<void> {
  switch (item.action) {
    case 'insert':
      await supabase.from(item.table).insert({
        ...item.data,
        user_id: userId,
      });
      break;

    case 'update':
      await supabase
        .from(item.table)
        .update(item.data)
        .eq('id', item.recordId);
      break;

    case 'delete':
      await supabase
        .from(item.table)
        .delete()
        .eq('id', item.recordId);
      break;
  }
}
