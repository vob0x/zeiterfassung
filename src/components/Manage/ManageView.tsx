import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useMasterStore } from '../../stores/masterStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useUiStore } from '../../stores/uiStore';
import { exportBackup, importBackup, exportCSV, importCSV } from '../../lib/backup';
import { clearAllUserData } from '../../lib/userStorage';
import ConfirmDialog from '../UI/ConfirmDialog';
import DuplicateReview from './DuplicateReview';
import { Pencil, Trash2, Search } from 'lucide-react';

export default function ManageView() {
  const { t, tArray } = useI18n();
  const { stakeholders, projects, activities, formats, removeStakeholder, removeProject, removeActivity, removeFormat } = useMasterStore();
  const entries = useEntriesStore((state) => state.entries);
  const showToast = useUiStore((state) => state.showToast);

  const [editingType, setEditingType] = useState<'stakeholder' | 'project' | 'activity' | 'format' | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState('');
  const [editingName, setEditingName] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteItemPending, setDeleteItemPending] = useState<{ type: 'stakeholder' | 'project' | 'activity' | 'format'; name: string } | null>(null);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [dupGroups, setDupGroups] = useState<{ fingerprint: string; entries: any[] }[] | null>(null);

  const handleAddItem = async (type: 'stakeholder' | 'project' | 'activity' | 'format', name: string) => {
    if (!name.trim()) return;

    try {
      if (type === 'stakeholder') {
        await useMasterStore.getState().addStakeholder(name);
      } else if (type === 'project') {
        await useMasterStore.getState().addProject(name);
      } else if (type === 'activity') {
        await useMasterStore.getState().addActivity(name);
      } else if (type === 'format') {
        await useMasterStore.getState().addFormat(name);
      }
      showToast(`${name} ${t('toast.added')}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleRenameItem = async (type: 'stakeholder' | 'project' | 'activity' | 'format', oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;

    try {
      if (type === 'stakeholder') {
        await useMasterStore.getState().renameStakeholder(oldName, newName);
      } else if (type === 'project') {
        await useMasterStore.getState().renameProject(oldName, newName);
      } else if (type === 'activity') {
        await useMasterStore.getState().renameActivity(oldName, newName);
      } else if (type === 'format') {
        await useMasterStore.getState().renameFormat(oldName, newName);
      }
      showToast(`${t('toast.renamed')} ${newName}`, 'success');
      setEditingType(null);
      setEditingOriginalName('');
      setEditingName('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleDeleteItem = async (type: 'stakeholder' | 'project' | 'activity' | 'format', name: string) => {
    try {
      if (type === 'stakeholder') {
        await removeStakeholder(name);
      } else if (type === 'project') {
        await removeProject(name);
      } else if (type === 'activity') {
        await removeActivity(name);
      } else if (type === 'format') {
        await removeFormat(name);
      }
      showToast(`${name} ${t('toast.deleted')}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleDeleteAllData = async () => {
    const state = useMasterStore.getState();
    const entriesState = useEntriesStore.getState();

    try {
      // Delete all master data from Supabase
      for (const sh of state.stakeholders) {
        await removeStakeholder(sh);
      }
      for (const pr of state.projects) {
        await removeProject(pr);
      }
      for (const act of state.activities) {
        await removeActivity(act);
      }
      for (const fm of state.formats) {
        await removeFormat(fm);
      }

      // Delete all entries from Supabase
      for (const entry of entries) {
        await entriesState.delete(entry.id);
      }

      // Clear localStorage for this user (the important part!)
      clearAllUserData();

      showToast(t('toast.allDeleted'), 'success');
      setShowDeleteAll(false);

      // Reload to get a clean state
      window.location.reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleBackupExport = async () => {
    try {
      const backup = exportBackup(
        {
          stakeholders,
          projects,
          activities,
          formats,
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
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleBackupImport = async (file: File) => {
    try {
      const backup = await importBackup(file);
      if (backup) {
        setPendingBackup(backup);
        setShowRestoreConfirm(true);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!pendingBackup) return;
    try {
      const backup = pendingBackup;
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
      for (const fmt of masterState.formats) {
        await removeFormat(fmt);
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
      for (const fmt of (backup.masterData.formats || [])) {
        await useMasterStore.getState().addFormat(fmt);
      }
      for (const entry of backup.entries) {
        await entriesState.add(entry);
      }

      showToast(t('toast.restoreOk'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    } finally {
      setPendingBackup(null);
    }
  };

  const handleCSVExport = async () => {
    try {
      const csvHeaders = [
        t('csv.datum'), t('csv.stakeholder'), t('csv.projekt'), t('csv.format'), t('csv.taetigkeit'),
        t('csv.von'), t('csv.bis'), t('csv.dauer'), t('csv.notiz'), t('csv.wochentag'),
      ];
      const weekdayNames = tArray('wd.long');
      const csv = exportCSV(entries, csvHeaders, weekdayNames);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zeiterfassung-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.csvExported'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const handleCSVImport = async (file: File) => {
    try {
      const newEntries = await importCSV(file);
      if (newEntries.length === 0) {
        showToast(t('toast.error'), 'error');
        return;
      }
      await useEntriesStore.getState().bulkAdd(newEntries);

      // Extract unique dimension values from imported entries and add to masterStore
      const master = useMasterStore.getState();
      const importedStakeholders = new Set<string>();
      const importedProjects = new Set(newEntries.map((e) => e.projekt).filter(Boolean));
      const importedActivities = new Set(newEntries.map((e) => e.taetigkeit).filter(Boolean));
      const importedFormats = new Set(newEntries.map((e) => e.format).filter(Boolean));

      // Handle stakeholder as string or array
      newEntries.forEach((e) => {
        const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
        shArray.forEach((sh) => {
          if (sh) importedStakeholders.add(sh);
        });
      });

      for (const sh of importedStakeholders) {
        if (!master.stakeholders.includes(sh)) {
          await master.addStakeholder(sh);
        }
      }
      for (const pr of importedProjects) {
        if (!master.projects.includes(pr)) {
          await master.addProject(pr);
        }
      }
      for (const act of importedActivities) {
        if (!master.activities.includes(act)) {
          await master.addActivity(act);
        }
      }
      for (const fmt of importedFormats) {
        if (fmt && !master.formats.includes(fmt)) {
          await master.addFormat(fmt);
        }
      }

      showToast(`${t('toast.importOk')} (${newEntries.length})`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
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
    type: 'stakeholder' | 'project' | 'activity' | 'format';
    onAdd: (name: string) => void;
  }) => {
    const [newValue, setNewValue] = useState('');

    return (
      <div className="flex-1 card p-4 space-y-3">
        <h3 style={{ color: 'var(--text)' }} className="text-lg font-semibold">{title}</h3>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item}
              style={{ background: 'rgba(201, 169, 98, 0.03)', borderColor: 'var(--border)' }}
              className="flex items-center justify-between p-2 rounded border transition-colors hover:opacity-80"
            >
              {editingType === type && editingOriginalName === item ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="input flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameItem(type, editingOriginalName, editingName);
                    } else if (e.key === 'Escape') {
                      setEditingType(null);
                      setEditingOriginalName('');
                      setEditingName('');
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span style={{ color: 'var(--text-secondary)' }} className="flex-1">{item}</span>
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingType(type);
                    setEditingOriginalName(item);
                    setEditingName(item);
                  }}
                  style={{ color: 'var(--text-secondary)' }}
                  className="px-2 py-1 hover:opacity-60 transition-colors text-sm"
                  title={t('title.rename')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteItemPending({ type, name: item })}
                  style={{ color: 'var(--text-secondary)' }}
                  className="px-2 py-1 hover:opacity-60 transition-colors text-sm"
                  title={t('title.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('manage.addNew')}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAdd(newValue);
                setNewValue('');
              }
            }}
            className="input flex-1 text-sm"
          />
          <button
            onClick={() => {
              onAdd(newValue);
              setNewValue('');
            }}
            style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            className="px-3 py-2 rounded font-medium transition-opacity hover:opacity-90 text-sm"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          title={t('manage.formate')}
          items={formats}
          type="format"
          onAdd={(name) => handleAddItem('format', name)}
        />
        <MasterDataColumn
          title={t('manage.taetigkeiten')}
          items={activities}
          type="activity"
          onAdd={(name) => handleAddItem('activity', name)}
        />
      </div>

      {/* Backup & Restore Section */}
      <div className="card p-4 space-y-3">
        <h3 style={{ color: 'var(--text)' }} className="text-lg font-semibold">{t('manage.backup')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleBackupExport}
            className="btn btn-primary"
          >
            {t('btn.backup')}
          </button>
          <label className="btn btn-primary cursor-pointer text-center">
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
            className="btn btn-success"
            disabled={entries.length === 0}
          >
            {t('btn.csvExport')}
          </button>
          <label className="btn btn-success cursor-pointer text-center disabled:opacity-50">
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

        <p style={{ color: 'var(--text-muted)' }} className="text-xs italic">{t('manage.backupHint')}</p>

        {/* Deduplicate */}
        <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              const dupes = useEntriesStore.getState().findDuplicates();
              if (dupes.size === 0) {
                showToast(t('manage.noDuplicates'), 'success');
                return;
              }
              // Convert Map to array for the review component
              const groups = Array.from(dupes.entries()).map(([fp, entries]) => ({
                fingerprint: fp,
                entries,
              }));
              setDupGroups(groups);
            }}
            className="btn btn-secondary flex items-center gap-2"
            disabled={entries.length === 0}
          >
            <Search className="w-4 h-4" />
            {t('manage.removeDuplicates')}
          </button>
        </div>
      </div>

      {/* Delete All Data */}
      <div className="card p-4 space-y-3" style={{ borderColor: 'rgba(212, 112, 110, 0.3)' }}>
        <h3 style={{ color: 'var(--danger)' }} className="text-lg font-semibold">{t('manage.warning')}</h3>

        {!showDeleteAll ? (
          <button
            onClick={() => setShowDeleteAll(true)}
            className="btn btn-danger"
          >
            {t('btn.deleteAll')}
          </button>
        ) : (
          <div className="space-y-3">
            <p style={{ color: 'var(--warning)' }}>{t('confirm.deleteAll')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAllData}
                className="btn btn-danger flex-1"
              >
                {t('manage.confirmDeleteAll')}
              </button>
              <button
                onClick={() => setShowDeleteAll(false)}
                className="btn btn-secondary"
              >
                {t('btn.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Item Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteItemPending}
        onClose={() => setDeleteItemPending(null)}
        title={t('confirm.deleteItem')}
        message={deleteItemPending ? `${deleteItemPending.name} ${t('confirm.deleteItem')}` : ''}
        confirmText={t('title.delete')}
        cancelText={t('btn.cancel')}
        onConfirm={() => {
          if (deleteItemPending) {
            handleDeleteItem(deleteItemPending.type, deleteItemPending.name);
            setDeleteItemPending(null);
          }
        }}
        isDanger
      />

      {/* Backup Restore Confirmation */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setPendingBackup(null);
        }}
        title={t('dsb.confirmRestore')}
        message={t('confirm.deleteAll')}
        confirmText={t('btn.restore')}
        cancelText={t('btn.cancel')}
        onConfirm={() => {
          setShowRestoreConfirm(false);
          handleRestoreConfirm();
        }}
        isDanger
      />

      {/* Duplicate Review Modal */}
      {dupGroups && (
        <DuplicateReview
          groups={dupGroups}
          onRemove={async (ids) => {
            try {
              const count = await useEntriesStore.getState().removeByIds(ids);
              showToast(`${count} ${t('manage.duplicatesRemoved')}`, 'success');
              setDupGroups(null);
            } catch (error) {
              showToast(error instanceof Error ? error.message : t('toast.error'), 'error');
            }
          }}
          onClose={() => setDupGroups(null)}
        />
      )}
    </div>
  );
}
