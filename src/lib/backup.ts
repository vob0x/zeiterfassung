import { TimeEntry } from '@/types';

interface BackupData {
  version: string;
  timestamp: string;
  masterData: {
    stakeholders: string[];
    projects: string[];
    activities: string[];
  };
  entries: TimeEntry[];
}

export function exportBackup(
  masterData: {
    stakeholders: string[];
    projects: string[];
    activities: string[];
  },
  entries: TimeEntry[]
): BackupData {
  return {
    version: '6.0',
    timestamp: new Date().toISOString(),
    masterData,
    entries,
  };
}

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

        const confirmed = window.confirm(
          `Restore backup from ${new Date(backup.timestamp).toLocaleDateString()}? This will replace all current data.`
        );

        if (confirmed) {
          resolve(backup);
        } else {
          resolve(null);
        }
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

export function exportCSV(entries: TimeEntry[]): string {
  const headers = ['Datum', 'Stakeholder', 'Projekt', 'Tätigkeit', 'Von', 'Bis', 'Dauer', 'Notiz', 'Wochentag'];

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

    const dateObj = new Date(entry.date);
    const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const weekday = weekdayNames[dateObj.getDay()];

    return [
      entry.date,
      entry.stakeholder,
      entry.projekt,
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

  return [headers.join(';'), ...rows].join('\n');
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
          const cells = row.split(';').map((cell) => cell.replace(/^"(.*)"$/, '$1'));

          if (cells.length < 7) continue;

          const entry: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
            date: cells[0],
            stakeholder: cells[1],
            projekt: cells[2],
            taetigkeit: cells[3],
            start_time: cells[4],
            end_time: cells[5],
            notiz: cells[7] || undefined,
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
