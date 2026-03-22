import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { useMasterStore } from '../../stores/masterStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useUiStore } from '../../stores/uiStore';
import { exportBackup, importBackup, exportCSV, importCSV } from '../../lib/backup';

export default function ManageView() {
  const { t } = useI18n();
  const { stakeholders, projects, activities, removeStakeholder, removeProject, removeActivity } = useMasterStore();
  const entries = useEntriesStore((state) => state.entries);
  const showToast = useUiStore((state) => state.showToast);

  const [editingType, setEditingType] = useState<'stakeholder' | 'project' | 'activity' | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const handleAddItem = async (type: 'stakeholder' | 'project' | 'activity', name: string) => {
    if (!name.trim()) return;

    try {
      if (type === 'stakeholder') {
        await useMasterStore.getState().addStakeholder(name);
      } else if (type === 'project') {
        await useMasterStore.getState().addProject(name);
      } else {
        await useMasterStore.getState().addActivity(name);
      }
      showToast(`${name} ${t('toast.added')}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleRenameItem = async (type: 'stakeholder' | 'project' | 'activity', oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;

    try {
      if (type === 'stakeholder') {
        await useMasterStore.getState().renameStakeholder(oldName, newName);
      } else if (type === 'project') {
        await useMasterStore.getState().renameProject(oldName, newName);
      } else {
        await useMasterStore.getState().renameActivity(oldName, newName);
      }
      showToast(`${t('toast.renamed')} ${newName}`, 'success');
      setEditingType(null);
      setEditingName('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleDeleteItem = async (type: 'stakeholder' | 'project' | 'activity', name: string) => {
    const confirmDelete = window.confirm(`${name} ${t('confirm.deleteItem')}`);
    if (!confirmDelete) return;

    try {
      if (type === 'stakeholder') {
        await removeStakeholder(name);
      } else if (type === 'project') {
        await removeProject(name);
      } else {
        await removeActivity(name);
      }
      showToast(`${name} ${t('toast.deleted')}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleDeleteAllData = async () => {
    const state = useMasterStore.getState();
    const entriesState = useEntriesStore.getState();

    try {
      // Delete all master data
      for (const sh of state.stakeholders) {
        await removeStakeholder(sh);
      }
      for (const pr of state.projects) {
        await removeProject(pr);
      }
      for (const act of state.activities) {
        await removeActivity(act);
      }

      // Delete all entries
      for (const entry of entries) {
        await entriesState.delete(entry.id);
      }

      showToast(t('toast.allDeleted'), 'success');
      setShowDeleteAll(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleBackupExport = async () => {
    try {
      const backup = exportBackup(
        {
          stakeholders,
          projects,
          activities,
        },
        entries
      );
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zeiterfassung-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.backupOk'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleBackupImport = async (file: File) => {
    try {
      const backup = await importBackup(file);
      if (backup) {
        // Clear existing data
        const masterState = useMasterStore.getState();
        const entriesState = useEntriesStore.getState();

        for (const sh of masterState.stakeholders) {
          await removeStakeholder(sh);
        }
        for (const pr of masterState.projects) {
          await removeProject(pr);
        }
        for (const act of masterState.activities) {
          await removeActivity(act);
        }
        for (const entry of entries) {
          await entriesState.delete(entry.id);
        }

        // Import new data
        for (const sh of backup.masterData.stakeholders) {
          await useMasterStore.getState().addStakeholder(sh);
        }
        for (const pr of backup.masterData.projects) {
          await useMasterStore.getState().addProject(pr);
        }
        for (const act of backup.masterData.activities) {
          await useMasterStore.getState().addActivity(act);
        }
        for (const entry of backup.entries) {
          await entriesState.add(entry);
        }

        showToast(t('toast.restoreOk'), 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleCSVExport = async () => {
    try {
      const csv = exportCSV(entries);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zeiterfassung-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.csvExported'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const handleCSVImport = async (file: File) => {
    try {
      const newEntries = await importCSV(file);
      const entriesState = useEntriesStore.getState();
      for (const entry of newEntries) {
        await entriesState.add(entry);
      }
      showToast(t('toast.importOk'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Fehler', 'error');
    }
  };

  const MasterDataColumn = ({
    title,
    items,
    type,
    onAdd,
  }: {
    title: string;
    items: string[];
    type: 'stakeholder' | 'project' | 'activity';
    onAdd: (name: string) => void;
  }) => {
    const [newValue, setNewValue] = useState('');

    return (
      <div className="flex-1 bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-700/30 hover:border-slate-600/50 transition-colors"
            >
              {editingType === type && editingName === item ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-cyan-500 focus:outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameItem(type, item, editingName);
                    } else if (e.key === 'Escape') {
                      setEditingType(null);
                      setEditingName('');
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-slate-300">{item}</span>
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingType(type);
                    setEditingName(item);
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-blue-400 transition-colors text-sm"
                  title="Rename"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteItem(type, item)}
                  className="px-2 py-1 text-slate-400 hover:text-red-400 transition-colors text-sm"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Neu hinzufügen...`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAdd(newValue);
                setNewValue('');
              }
            }}
            className="flex-1 px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
          />
          <button
            onClick={() => {
              onAdd(newValue);
              setNewValue('');
            }}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors text-sm"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Master Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MasterDataColumn
          title={t('manage.stakeholder')}
          items={stakeholders}
          type="stakeholder"
          onAdd={(name) => handleAddItem('stakeholder', name)}
        />
        <MasterDataColumn
          title={t('manage.projekte')}
          items={projects}
          type="project"
          onAdd={(name) => handleAddItem('project', name)}
        />
        <MasterDataColumn
          title={t('manage.taetigkeiten')}
          items={activities}
          type="activity"
          onAdd={(name) => handleAddItem('activity', name)}
        />
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50 space-y-3">
        <h3 className="text-lg font-semibold text-white">{t('manage.backup')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleBackupExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            {t('btn.backup')}
          </button>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors cursor-pointer text-center">
            {t('btn.restore')}
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBackupImport(file);
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={handleCSVExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors"
            disabled={entries.length === 0}
          >
            {t('btn.csvExport')}
          </button>
          <label className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors cursor-pointer text-center disabled:opacity-50">
            {t('btn.csvImport')}
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCSVImport(file);
              }}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-xs text-slate-400 italic">{t('manage.backupHint')}</p>
      </div>

      {/* Delete All Data */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-red-700/30 space-y-3">
        <h3 className="text-lg font-semibold text-red-400">Achtung</h3>

        {!showDeleteAll ? (
          <button
            onClick={() => setShowDeleteAll(true)}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-medium transition-colors"
          >
            {t('btn.deleteAll')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-yellow-400">{t('confirm.deleteAll')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAllData}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-medium transition-colors flex-1"
              >
                Ja, alle Daten löschen
              </button>
              <button
                onClick={() => setShowDeleteAll(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
