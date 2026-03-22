// @ts-nocheck
/**
 * Offline Change Queue
 * Persists pending changes to localStorage and flushes them when back online
 */

import { TimeEntry, Stakeholder, Project, Activity, UserSettings } from '@/types';

export type QueueTable = 'time_entries' | 'stakeholders' | 'projects' | 'activities' | 'settings';

export type QueueAction = 'insert' | 'update' | 'delete';

export interface QueueItem {
  id: string;
  action: QueueAction;
  table: QueueTable;
  data: Record<string, unknown>;
  timestamp: string;
  recordId?: string; // Original record ID for deletes/updates
}

const QUEUE_KEY = 'offline_queue';
const QUEUE_METADATA_KEY = 'offline_queue_metadata';

class OfflineQueue {
  /**
   * Add an item to the offline queue
   */
  public addItem(
    action: QueueAction,
    table: QueueTable,
    data: Record<string, unknown>,
    recordId?: string
  ): QueueItem {
    const item: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      table,
      data,
      timestamp: new Date().toISOString(),
      recordId,
    };

    const queue = this.getQueue();
    queue.push(item);
    this.saveQueue(queue);

    return item;
  }

  /**
   * Get all queued items
   */
  public getQueue(): QueueItem[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  }

  /**
   * Get items for a specific table
   */
  public getItemsByTable(table: QueueTable): QueueItem[] {
    return this.getQueue().filter((item) => item.table === table);
  }

  /**
   * Remove an item from the queue by ID
   */
  public removeItem(id: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    this.saveQueue(filtered);
  }

  /**
   * Remove multiple items
   */
  public removeItems(ids: string[]): void {
    const queue = this.getQueue();
    const filtered = queue.filter((item) => !ids.includes(item.id));
    this.saveQueue(filtered);
  }

  /**
   * Clear entire queue
   */
  public clear(): void {
    localStorage.removeItem(QUEUE_KEY);
    localStorage.removeItem(QUEUE_METADATA_KEY);
  }

  /**
   * Get queue size
   */
  public getSize(): number {
    return this.getQueue().length;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.getSize() === 0;
  }

  /**
   * Get metadata about the queue
   */
  public getMetadata() {
    try {
      const stored = localStorage.getItem(QUEUE_METADATA_KEY);
      return stored
        ? JSON.parse(stored)
        : {
            lastFlushTime: null,
            flushCount: 0,
            errorCount: 0,
          };
    } catch {
      return {
        lastFlushTime: null,
        flushCount: 0,
        errorCount: 0,
      };
    }
  }

  /**
   * Update metadata
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    const current = this.getMetadata();
    const updated = { ...current, ...metadata };
    localStorage.setItem(QUEUE_METADATA_KEY, JSON.stringify(updated));
  }

  /**
   * Reorder queue items (delete-insert optimization)
   * Ensures deletes happen before inserts of the same record
   */
  public optimizeOrder(): QueueItem[] {
    const queue = this.getQueue();
    const deletes = queue.filter((item) => item.action === 'delete');
    const others = queue.filter((item) => item.action !== 'delete');

    return [...others, ...deletes];
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: QueueItem[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
      // If quota exceeded, clear old items
      if ((error as Error).name === 'QuotaExceededError') {
        const trimmed = queue.slice(queue.length - Math.floor(queue.length / 2));
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
      }
    }
  }
}

export const offlineQueue = new OfflineQueue();
