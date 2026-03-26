import { TimeEntry } from '@/types';

interface BackupData {
  version: string;
  timestamp: string;
  masterData: {
    stakeholders: string[];
    projects: string[];
    activities: string[];
    formats?: string[]; // NEW: format dimension
  };
  entries: TimeEntry[];
}

export function exportBackup(
  masterData: {
    stakeholders: string[];
    projects: string[];
    activities: string[];
    formats?: string[];
  },
  entries: TimeEntry[]
): BackupData {
  return {
    version: '6.0',
    timestamp: new Date().toISOString(),
    masterData: {
      stakeholders: masterData.stakeholders,
      projects: masterData.projects,
      activities: masterData.activities,
      formats: masterData.formats || [],
    },
    entries,
  };
}

/**
 * Import a backup file. Returns parsed BackupData or null if invalid.
 * Confirmation is handled by the caller (ManageView uses ConfirmDialog).
 */
export async function importBackup(file: File): Promise<BackupData | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as BackupData;

        // Validate structure
        if (
          !backup.version ||
          !backup.timestamp ||
          !backup.masterData ||
          !Array.isArray(backup.entries)
        ) {
          throw new Error('Invalid backup file format');
        }

        resolve(backup);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Export entries to CSV. Headers are passed from the caller for i18n support.
 */
export function exportCSV(
  entries: TimeEntry[],
  headers?: string[],
  weekdayNames?: string[]
): string {
  const csvHeaders = headers || ['Datum', 'Stakeholder', 'Projekt', 'Format', 'Tätigkeit', 'Von', 'Bis', 'Dauer', 'Notiz', 'Wochentag'];
  const defaultWeekdays = weekdayNames || ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  const rows = entries.map((entry) => {
    // Calculate duration in hours
    const [sh, sm] = entry.start_time.split(':').map(Number);
    const [eh, em] = entry.end_time.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;

    if (endMin < startMin) {
      endMin += 24 * 60;
    }

    const durationHours = ((endMin - startMin) / 60).toFixed(2);

    const dateObj = new Date(entry.date + 'T00:00:00');
    const weekday = defaultWeekdays[dateObj.getDay()];

    // Handle stakeholder as array: join with ", "
    const stakeholderStr = Array.isArray(entry.stakeholder)
      ? entry.stakeholder.join(', ')
      : entry.stakeholder;

    return [
      entry.date,
      stakeholderStr,
      entry.projekt,
      entry.format || 'Einzelarbeit',
      entry.taetigkeit,
      entry.start_time,
      entry.end_time,
      durationHours,
      entry.notiz || '',
      weekday,
    ]
      .map((cell) => {
        // Escape quotes and wrap in quotes if contains semicolon or special chars
        const str = String(cell);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(';');
  });

  return [csvHeaders.join(';'), ...rows].join('\n');
}

export async function importCSV(file: File): Promise<Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error('CSV file is empty');
        }

        // Skip header row
        const rows = lines.slice(1);
        const entries: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [];

        for (const row of rows) {
          // Simple CSV parsing (semicolon-delimited)
          const cells = row.split(';').map((cell) => cell.replace(/^"(.*)"$/, '$1').trim());

          if (cells.length < 7) continue;

          // Backward compatibility: detect old (8 cols) vs new (10 cols) format
          // Old: Datum, Stakeholder, Projekt, Tätigkeit, Von, Bis, Dauer, Notiz, (Wochentag)
          // New: Datum, Stakeholder, Projekt, Format, Tätigkeit, Von, Bis, Dauer, Notiz, (Wochentag)
          const isNewFormat = cells.length >= 10;

          let dateIdx = 0, shIdx = 1, prIdx = 2, formatIdx = -1, taIdx = -1, startIdx = -1, endIdx = -1, notizIdx = -1;

          if (isNewFormat) {
            // New format: Datum(0), Stakeholder(1), Projekt(2), Format(3), Tätigkeit(4), Von(5), Bis(6), Dauer(7), Notiz(8), Wochentag(9)
            formatIdx = 3;
            taIdx = 4;
            startIdx = 5;
            endIdx = 6;
            notizIdx = 8;
          } else {
            // Old format: Datum(0), Stakeholder(1), Projekt(2), Tätigkeit(3), Von(4), Bis(5), Dauer(6), Notiz(7), Wochentag(8)
            taIdx = 3;
            startIdx = 4;
            endIdx = 5;
            notizIdx = 7;
          }

          // Calculate duration_ms
          const [sh, sm] = (cells[startIdx] || '0:0').split(':').map(Number);
          const [eh, em] = (cells[endIdx] || '0:0').split(':').map(Number);
          let startMin = (sh || 0) * 60 + (sm || 0);
          let endMin = (eh || 0) * 60 + (em || 0);
          if (endMin < startMin) endMin += 24 * 60;
          const duration_ms = (endMin - startMin) * 60000;

          // Handle stakeholder as comma-separated string -> split into array
          const stakeholderStr = cells[shIdx] || '';
          const stakeholder = stakeholderStr
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);

          const entry: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
            date: cells[dateIdx],
            stakeholder: stakeholder.length > 0 ? stakeholder : [''],
            projekt: cells[prIdx],
            taetigkeit: cells[taIdx],
            format: isNewFormat ? (cells[formatIdx] || 'Einzelarbeit') : 'Einzelarbeit',
            start_time: cells[startIdx],
            end_time: cells[endIdx],
            duration_ms,
            notiz: cells[notizIdx] || '',
          };

          entries.push(entry);
        }

        resolve(entries);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
