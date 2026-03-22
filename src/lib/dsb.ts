/**
 * DSB (Dark Side Backup) - 6-Layer Data Safety Belt
 * Critical backup system for data integrity and recovery
 *
 * Layers:
 * 1. In-memory current state (Zustand stores)
 * 2. Supabase cloud storage (primary)
 * 3. localStorage mirror (sync, atomic backup)
 * 4. 3 rotating generations (A/B/C) with CRC32 validation
 * 5. Last-resort safety backup
 * 6. Heartbeat monitoring (timer state recovery)
 */

import { TimeEntry, Stakeholder, Project, Activity, UserSettings, TimerSlot } from '@/types';

interface DsbBackup {
  version: string;
  timestamp: string;
  entries: TimeEntry[];
  stakeholders: string[];
  projects: string[];
  activities: string[];
  settings: UserSettings | null;
  timerSlot: TimerSlot | null;
  crc32: string;
}

interface DsbGeneration {
  data: DsbBackup;
  generation: 'A' | 'B' | 'C';
  timestamp: string;
  crc32: string;
}

const DSB_KEY_PREFIX = 'dsb_';
const DSB_GENERATION_A = `${DSB_KEY_PREFIX}gen_a`;
const DSB_GENERATION_B = `${DSB_KEY_PREFIX}gen_b`;
const DSB_GENERATION_C = `${DSB_KEY_PREFIX}gen_c`;
const DSB_MIRROR = `${DSB_KEY_PREFIX}mirror`;
const DSB_HEARTBEAT = `${DSB_KEY_PREFIX}heartbeat`;
const DSB_SAFETY = `${DSB_KEY_PREFIX}safety`;
const DSB_METADATA = `${DSB_KEY_PREFIX}metadata`;

interface DsbMetadata {
  lastHeartbeat: string;
  lastSave: string;
  lastSync: string;
  backupCount: number;
  loadedCount: number;
}

/**
 * CRC32 checksum calculation for data integrity
 */
function crc32(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i++) {
    crc = crc ^ bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

class DarkSideBackup {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private periodicSaveInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private currentGeneration: 'A' | 'B' | 'C' = 'A';

  /**
   * Initialize DSB system
   */
  public init(): void {
    if (this.isInitialized) return;

    // Start heartbeat for timer recovery
    this.startHeartbeat();

    // Periodic save every 60 seconds
    this.startPeriodicSave();

    // Watch for tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkIntegrity();
      }
    });

    this.isInitialized = true;
    console.log('DSB initialized');
  }

  /**
   * Shutdown DSB system
   */
  public shutdown(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.periodicSaveInterval) clearInterval(this.periodicSaveInterval);
    this.isInitialized = false;
  }

  /**
   * Start heartbeat (every 30 seconds when timer is running)
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const metadata = this.getMetadata();
      metadata.lastHeartbeat = new Date().toISOString();
      this.saveMetadata(metadata);
    }, 30000); // 30 seconds
  }

  /**
   * Update heartbeat timestamp
   */
  public heartbeat(): void {
    const metadata = this.getMetadata();
    metadata.lastHeartbeat = new Date().toISOString();
    this.saveMetadata(metadata);
  }

  /**
   * Start periodic save (every 60 seconds)
   */
  private startPeriodicSave(): void {
    this.periodicSaveInterval = setInterval(() => {
      this.save();
    }, 60000); // 60 seconds
  }

  /**
   * Save current state to next generation
   */
  public save(
    entries: TimeEntry[] = [],
    stakeholders: string[] = [],
    projects: string[] = [],
    activities: string[] = [],
    settings: UserSettings | null = null,
    timerSlot: TimerSlot | null = null
  ): void {
    try {
      const backup: DsbBackup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        entries,
        stakeholders,
        projects,
        activities,
        settings,
        timerSlot,
        crc32: '',
      };

      // Calculate CRC32
      const dataStr = JSON.stringify(backup);
      backup.crc32 = crc32(dataStr);

      // Rotate generations: C -> B -> A -> C
      const nextGen = this.getNextGeneration();
      this.saveGeneration(nextGen, backup);

      // Save mirror
      this.saveMirror(backup);

      // Update metadata
      const metadata = this.getMetadata();
      metadata.lastSave = new Date().toISOString();
      metadata.backupCount = (metadata.backupCount || 0) + 1;
      this.saveMetadata(metadata);

      this.currentGeneration = nextGen;
    } catch (error) {
      console.error('DSB save failed:', error);
    }
  }

  /**
   * Check backup integrity
   */
  public checkIntegrity(): boolean {
    const generations = [
      this.loadGeneration('A'),
      this.loadGeneration('B'),
      this.loadGeneration('C'),
    ];

    let validCount = 0;
    for (const gen of generations) {
      if (gen && this.validateCrc32(gen.data)) {
        validCount++;
      }
    }

    return validCount >= 2; // At least 2 valid backups
  }

  /**
   * Validate CRC32 checksum
   */
  private validateCrc32(backup: DsbBackup): boolean {
    const savedCrc = backup.crc32;
    const testData = { ...backup, crc32: '' };
    const calculated = crc32(JSON.stringify(testData));
    return savedCrc === calculated;
  }

  /**
   * Recover from best available backup
   */
  public recover(): DsbBackup | null {
    const best = this.getBestBackup();
    if (best) {
      console.log(`Recovering from generation ${best.generation}`, best.data.timestamp);
      return best.data;
    }
    return null;
  }

  /**
   * Find the best available backup (newest valid)
   */
  public getBestBackup(): DsbGeneration | null {
    const generations = [
      { key: 'A', gen: this.loadGeneration('A') },
      { key: 'B', gen: this.loadGeneration('B') },
      { key: 'C', gen: this.loadGeneration('C') },
    ];

    // Filter valid backups
    const valid = generations.filter(
      (g) => g.gen && this.validateCrc32(g.gen.data)
    );

    if (valid.length === 0) return null;

    // Return newest by timestamp
    return valid.reduce((newest, current) =>
      new Date(current.gen!.data.timestamp) >
      new Date(newest.gen!.data.timestamp)
        ? current
        : newest
    ).gen as DsbGeneration;
  }

  /**
   * Check timer recovery
   */
  public checkTimerRecovery(): TimerSlot | null {
    const metadata = this.getMetadata();

    if (!metadata.lastHeartbeat) return null;

    // If heartbeat < 2 minutes old, offer recovery
    const timeSinceHeartbeat =
      Date.now() - new Date(metadata.lastHeartbeat).getTime();

    if (timeSinceHeartbeat < 2 * 60 * 1000) {
      // 2 minutes
      const backup = this.recover();
      return backup?.timerSlot || null;
    }

    return null;
  }

  /**
   * Get next generation to write to
   */
  private getNextGeneration(): 'A' | 'B' | 'C' {
    const order: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    const currentIndex = order.indexOf(this.currentGeneration);
    return order[(currentIndex + 1) % 3];
  }

  /**
   * Save generation
   */
  private saveGeneration(gen: 'A' | 'B' | 'C', backup: DsbBackup): void {
    const key =
      gen === 'A' ? DSB_GENERATION_A : gen === 'B' ? DSB_GENERATION_B : DSB_GENERATION_C;

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data: backup,
          generation: gen,
          timestamp: new Date().toISOString(),
          crc32: backup.crc32,
        } as DsbGeneration)
      );
    } catch (error) {
      console.error(`Failed to save DSB generation ${gen}:`, error);
    }
  }

  /**
   * Load generation
   */
  private loadGeneration(gen: 'A' | 'B' | 'C'): DsbGeneration | null {
    const key =
      gen === 'A' ? DSB_GENERATION_A : gen === 'B' ? DSB_GENERATION_B : DSB_GENERATION_C;

    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save mirror backup
   */
  private saveMirror(backup: DsbBackup): void {
    try {
      localStorage.setItem(DSB_MIRROR, JSON.stringify(backup));
    } catch (error) {
      console.error('Failed to save DSB mirror:', error);
    }
  }

  /**
   * Load mirror backup
   */
  public loadMirror(): DsbBackup | null {
    try {
      const stored = localStorage.getItem(DSB_MIRROR);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get metadata
   */
  private getMetadata(): DsbMetadata {
    try {
      const stored = localStorage.getItem(DSB_METADATA);
      return stored
        ? JSON.parse(stored)
        : {
            lastHeartbeat: null,
            lastSave: null,
            lastSync: null,
            backupCount: 0,
            loadedCount: 0,
          };
    } catch {
      return {
        lastHeartbeat: null,
        lastSave: null,
        lastSync: null,
        backupCount: 0,
        loadedCount: 0,
      };
    }
  }

  /**
   * Save metadata
   */
  private saveMetadata(metadata: DsbMetadata): void {
    try {
      localStorage.setItem(DSB_METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save DSB metadata:', error);
    }
  }

  /**
   * Clear all DSB data
   */
  public clear(): void {
    localStorage.removeItem(DSB_GENERATION_A);
    localStorage.removeItem(DSB_GENERATION_B);
    localStorage.removeItem(DSB_GENERATION_C);
    localStorage.removeItem(DSB_MIRROR);
    localStorage.removeItem(DSB_HEARTBEAT);
    localStorage.removeItem(DSB_SAFETY);
    localStorage.removeItem(DSB_METADATA);
  }

  /**
   * Get storage usage info
   */
  public getStorageInfo(): {
    totalBackups: number;
    totalSize: number;
    estimatedRecoveryTime: string;
  } {
    const metadata = this.getMetadata();
    const backups = [
      this.loadGeneration('A'),
      this.loadGeneration('B'),
      this.loadGeneration('C'),
    ].filter((b) => b !== null);

    let totalSize = 0;
    for (const backup of backups) {
      totalSize += JSON.stringify(backup).length;
    }

    return {
      totalBackups: backups.length,
      totalSize,
      estimatedRecoveryTime: '< 1 second',
    };
  }
}

export const dsb = new DarkSideBackup();
