import React, { useState, useEffect, useRef } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';
import { Plus, X } from 'lucide-react';
import NoteInput, { saveNoteToHistory } from '../UI/NoteInput';

interface EditEntryModalProps {
  entry: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, isOpen, onClose }) => {
  const { t } = useI18n();
  const { update: updateEntry } = useEntriesStore();
  const { showToast } = useUiStore();
  const {
    stakeholders,
    projects,
    activities,
    addStakeholder: addStakeholderToStore,
    addProject: addProjectToStore,
    addActivity: addActivityToStore,
  } = useMasterStore();

  const [formData, setFormData] = useState({
    date: entry.date,
    stakeholder: entry.stakeholder,
    projekt: entry.projekt,
    taetigkeit: entry.taetigkeit,
    start_time: entry.start_time,
    end_time: entry.end_time,
    notiz: entry.notiz || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.stakeholder) newErrors.stakeholder = t('toast.selectShPr');
    if (!formData.projekt) newErrors.projekt = t('toast.selectShPr');
    if (!formData.taetigkeit) newErrors.taetigkeit = t('validation.required');
    if (!formData.date) newErrors.date = t('toast.selectDate');
    if (!formData.start_time) newErrors.start_time = t('toast.selectTime');
    if (!formData.end_time) newErrors.end_time = t('toast.selectTime');

    // Allow overnight entries (e.g., 23:00 → 01:00) — only reject identical times
    if (formData.start_time && formData.end_time && formData.start_time === formData.end_time) {
      newErrors.end_time = t('toast.endAfterStart');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);
    try {
      await updateEntry(entry.id, {
        date: formData.date,
        stakeholder: formData.stakeholder,
        projekt: formData.projekt,
        taetigkeit: formData.taetigkeit,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notiz: formData.notiz,
      });

      // Save note to suggestion history
      if (formData.notiz) saveNoteToHistory(formData.notiz);

      showToast(t('toast.entryUpdated'), 'success');
      onClose();
    } catch (error) {
      console.error('Failed to update entry:', error);
      showToast(t('toast.error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStakeholder = async () => {
    if (newStakeholder.trim()) {
      try {
        await addStakeholderToStore(newStakeholder.trim());
        setFormData({ ...formData, stakeholder: newStakeholder.trim() });
        setNewStakeholder('');
        setShowAddStakeholder(false);
      } catch (error) {
        console.error('Failed to add stakeholder:', error);
      }
    }
  };

  const handleAddProject = async () => {
    if (newProject.trim()) {
      try {
        await addProjectToStore(newProject.trim());
        setFormData({ ...formData, projekt: newProject.trim() });
        setNewProject('');
        setShowAddProject(false);
      } catch (error) {
        console.error('Failed to add project:', error);
      }
    }
  };

  const handleAddActivity = async () => {
    if (newActivity.trim()) {
      try {
        await addActivityToStore(newActivity.trim());
        setFormData({ ...formData, taetigkeit: newActivity.trim() });
        setNewActivity('');
        setShowAddActivity(false);
      } catch (error) {
        console.error('Failed to add activity:', error);
      }
    }
  };

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus trap ref
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, select, button');
      if (firstInput) (firstInput as HTMLElement).focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const inputStyle = {
    background: 'var(--surface-solid)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll wrapper: centers on desktop, full-height scroll on mobile */}
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <div
        ref={modalRef}
        className="rounded-lg border p-5 sm:p-6 shadow-xl max-w-md w-full"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{t('edit.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.datum')}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            {errors.date && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.date}</div>}
          </div>

          {/* Stakeholder */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.stakeholder')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.stakeholder}
                onChange={(e) => setFormData({ ...formData, stakeholder: e.target.value })}
                className="flex-1 px-3 py-2 rounded text-sm"
                style={inputStyle}
              >
                <option value="">{t('ph.select')}</option>
                {stakeholders.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddStakeholder(!showAddStakeholder)}
                className="px-3 py-2 rounded transition-colors"
                style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showAddStakeholder && (
              <div className="flex gap-1 mt-2">
                <input
                  type="text"
                  placeholder={t('ph.newStakeholder')}
                  value={newStakeholder}
                  onChange={(e) => setNewStakeholder(e.target.value)}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleAddStakeholder}
                  className="px-3 py-2 text-white rounded text-sm"
                  style={{ background: 'var(--success)' }}
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.stakeholder && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.stakeholder}</div>}
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.projekt')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.projekt}
                onChange={(e) => setFormData({ ...formData, projekt: e.target.value })}
                className="flex-1 px-3 py-2 rounded text-sm"
                style={inputStyle}
              >
                <option value="">{t('ph.select')}</option>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddProject(!showAddProject)}
                className="px-3 py-2 rounded transition-colors"
                style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showAddProject && (
              <div className="flex gap-1 mt-2">
                <input
                  type="text"
                  placeholder={t('ph.newProjekt')}
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-2 text-white rounded text-sm"
                  style={{ background: 'var(--success)' }}
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.projekt && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.projekt}</div>}
          </div>

          {/* Activity */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.taetigkeit')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.taetigkeit}
                onChange={(e) => setFormData({ ...formData, taetigkeit: e.target.value })}
                className="flex-1 px-3 py-2 rounded text-sm"
                style={inputStyle}
              >
                <option value="">{t('ph.select')}</option>
                {activities.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddActivity(!showAddActivity)}
                className="px-3 py-2 rounded transition-colors"
                style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showAddActivity && (
              <div className="flex gap-1 mt-2">
                <input
                  type="text"
                  placeholder={t('ph.newTaetigkeit')}
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleAddActivity}
                  className="px-3 py-2 text-white rounded text-sm"
                  style={{ background: 'var(--success)' }}
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.taetigkeit && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.taetigkeit}</div>}
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.von')}
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            {errors.start_time && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.start_time}</div>}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.bis')}
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            {errors.end_time && <div className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.end_time}</div>}
          </div>

          {/* Note with suggestions */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('label.notiz')}
            </label>
            <NoteInput
              value={formData.notiz}
              onChange={(v) => setFormData({ ...formData, notiz: v })}
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isSaving}
            >
              {isSaving ? t('ui.loading') : t('btn.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
            >
              {t('btn.cancel')}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default EditEntryModal;
