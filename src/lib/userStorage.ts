/**
 * User-scoped localStorage utility.
 *
 * Problem: Without scoping, all users on the same browser share
 * the same localStorage keys (entries, stakeholders, timers, etc.).
 *
 * Solution: Prefix all keys with the user's profile ID so each user
 * has their own isolated data namespace.
 */

import { useAuthStore } from '@/stores/authStore';

// Get the current user's ID for key scoping
function getUserId(): string {
  const profile = useAuthStore.getState().profile;
  return profile?.id || 'anonymous';
}

// Generate a user-scoped localStorage key
export function getUserKey(key: string): string {
  const userId = getUserId();
  return `ze_${userId}_${key}`;
}

// Read from user-scoped localStorage with automatic migration
export function getUserData<T>(key: string, fallback: T): T {
  try {
    const scopedKey = getUserKey(key);
    const scopedData = localStorage.getItem(scopedKey);

    if (scopedData !== null) {
      return JSON.parse(scopedData);
    }

    // Migration 1: check if unscoped (legacy) data exists
    const legacyData = localStorage.getItem(key);
    if (legacyData !== null) {
      const parsed = JSON.parse(legacyData);
      localStorage.setItem(scopedKey, legacyData);
      return parsed;
    }

    // Migration 2: check for data under a different user ID prefix (e.g. local_ → supabase UUID)
    // Scan for any ze_*_{key} that has data
    const suffix = `_${key}`;
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (lsKey && lsKey.startsWith('ze_') && lsKey.endsWith(suffix) && lsKey !== scopedKey) {
        const oldData = localStorage.getItem(lsKey);
        if (oldData !== null) {
          const parsed = JSON.parse(oldData);
          // Migrate to current user's scoped key
          localStorage.setItem(scopedKey, oldData);
          return parsed;
        }
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

// Write to user-scoped localStorage
export function setUserData(key: string, data: any): void {
  try {
    const scopedKey = getUserKey(key);
    localStorage.setItem(scopedKey, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

// Remove from user-scoped localStorage
export function removeUserData(key: string): void {
  try {
    const scopedKey = getUserKey(key);
    localStorage.removeItem(scopedKey);
  } catch {
    // ignore
  }
}
