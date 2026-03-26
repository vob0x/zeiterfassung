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

    // Migration: check if unscoped (legacy) data exists from before user-scoping was added
    const legacyData = localStorage.getItem(key);
    if (legacyData !== null) {
      const parsed = JSON.parse(legacyData);
      // Copy to scoped key, remove legacy key to prevent leaking to future users
      localStorage.setItem(scopedKey, legacyData);
      localStorage.removeItem(key);
      return parsed;
    }

    // NOTE: We intentionally do NOT scan ze_{otherUserId}_{key} entries.
    // That would leak data from a previous user to a new user.
    // The local_ → Supabase UUID migration is handled in authStore instead.

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

// Migrate data from one user ID to another (e.g. local_ → Supabase UUID)
export function migrateUserData(oldUserId: string, newUserId: string): void {
  const oldPrefix = `ze_${oldUserId}_`;
  const newPrefix = `ze_${newUserId}_`;
  const keysToMigrate: [string, string][] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(oldPrefix)) {
      const suffix = key.slice(oldPrefix.length);
      const newKey = newPrefix + suffix;
      // Only migrate if new key doesn't already have data
      if (!localStorage.getItem(newKey)) {
        keysToMigrate.push([key, newKey]);
      }
    }
  }

  for (const [oldKey, newKey] of keysToMigrate) {
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
      localStorage.removeItem(oldKey);
    }
  }

  if (keysToMigrate.length > 0) {
    console.log(`[UserStorage] Migrated ${keysToMigrate.length} keys from ${oldUserId} to ${newUserId}`);
  }
}

// Clear ALL data for the current user (for "Reset data" feature)
export function clearAllUserData(): void {
  const userId = getUserId();
  const prefix = `ze_${userId}_`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  console.log(`[UserStorage] Cleared ${keysToRemove.length} keys for user ${userId}`);
}
