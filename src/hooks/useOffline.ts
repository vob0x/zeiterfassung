/**
 * useOffline Hook
 * Tracks online/offline status and manages offline state
 */

import { useEffect, useState, useCallback } from 'react';
import { offlineQueue } from '../lib/offlineQueue';

interface OfflineState {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncTime: string | null;
  isCheckingConnection: boolean;
}

/**
 * Hook to track online/offline status and pending changes
 */
export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingChanges: offlineQueue.getSize(),
    lastSyncTime: localStorage.getItem('lastSyncTime'),
    isCheckingConnection: false,
  });

  // Update pending changes when queue changes
  const updatePendingChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingChanges: offlineQueue.getSize(),
    }));
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online');
      setState((prev) => ({
        ...prev,
        isOnline: true,
        isCheckingConnection: false,
      }));

      // Trigger sync when coming back online
      const event = new CustomEvent('app:online');
      window.dispatchEvent(event);
    };

    const handleOffline = () => {
      console.log('App is offline');
      setState((prev) => ({
        ...prev,
        isOnline: false,
      }));

      // Trigger offline handler
      const event = new CustomEvent('app:offline');
      window.dispatchEvent(event);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      if (!navigator.onLine) {
        // If navigator says offline, don't check
        return;
      }

      setState((prev) => ({
        ...prev,
        isCheckingConnection: true,
      }));

      try {
        // Simple connectivity check
        const response = await fetch('/__/fast-check', {
          method: 'HEAD',
          cache: 'no-store',
        }).catch(() => null);

        const isOnline = response?.ok ?? navigator.onLine;

        setState((prev) => ({
          ...prev,
          isOnline,
          isCheckingConnection: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isCheckingConnection: false,
        }));
      }
    };

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  // Listen for sync completion
  useEffect(() => {
    const handleSyncComplete = (_e: Event) => {
      setState((prev) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        pendingChanges: offlineQueue.getSize(),
      }));
      localStorage.setItem('lastSyncTime', new Date().toISOString());
    };

    window.addEventListener('sync:complete', handleSyncComplete);

    return () => {
      window.removeEventListener('sync:complete', handleSyncComplete);
    };
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    // Check queue size periodically
    const interval = setInterval(updatePendingChanges, 1000);

    return () => clearInterval(interval);
  }, [updatePendingChanges]);

  return {
    isOnline: state.isOnline,
    pendingChanges: state.pendingChanges,
    lastSyncTime: state.lastSyncTime,
    isCheckingConnection: state.isCheckingConnection,
    // Get the last sync time in a human readable format
    getLastSyncString: () => {
      if (!state.lastSyncTime) return null;
      const date = new Date(state.lastSyncTime);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return date.toLocaleDateString();
    },
  };
}
