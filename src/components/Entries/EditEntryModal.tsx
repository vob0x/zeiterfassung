import React, { useState } from 'react';
import { TimeEntry } from '@/types';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { Plus, X } from 'lucide-react';

interface EditEntryModalProps {
  entry: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
}

// Mock data
const mockStakeholders = ['Alice', 'Bob', 'Charlie'];
const mockProjects = ['Project A', 'Project B', 'Project C'];
const mockActivities = ['Development', 'Design', 'Testing'];

const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, isOpen, onClose }) => {
  const { t } = useI18n();
  const { update: updateEntry } = useEntriesStore();

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

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.stakeholder) newErrors.stakeholder = 'Required';
    if (!formData.projekt) newErrors.projekt = 'Required';
    if (!formData.taetigkeit) newErrors.taetigkeit = 'Required';
    if (!formData.date) newErrors.date = 'Required';
    if (!formData.start_time) newErrors.start_time = 'Required';
    if (!formData.end_time) newErrors.end_time = 'Required';

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = t('toast.endAfterStart');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

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

      alert(t('toast.entryUpdated'));
      onClose();
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleAddStakeholder = () => {
    if (newStakeholder.trim()) {
      setFormData({ ...formData, stakeholder: newStakeholder });
      setNewStakeholder('');
      setShowAddStakeholder(false);
    }
  };

  const handleAddProject = () => {
    if (newProject.trim()) {
      setFormData({ ...formData, projekt: newProject });
      setNewProject('');
      setShowAddProject(false);
    }
  };

  const handleAddActivity = () => {
    if (newActivity.trim()) {
      setFormData({ ...formData, taetigkeit: newActivity });
      setNewActivity('');
      setShowAddActivity(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('edit.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.datum')}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            />
            {errors.date && <div className="text-red-400 text-xs mt-1">{errors.date}</div>}
          </div>

          {/* Stakeholder */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.stakeholder')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.stakeholder}
                onChange={(e) => setFormData({ ...formData, stakeholder: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">{t('ph.select')}</option>
                {mockStakeholders.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddStakeholder(!showAddStakeholder)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
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
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddStakeholder}
                  className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.stakeholder && (
              <div className="text-red-400 text-xs mt-1">{errors.stakeholder}</div>
            )}
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.projekt')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.projekt}
                onChange={(e) => setFormData({ ...formData, projekt: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">{t('ph.select')}</option>
                {mockProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddProject(!showAddProject)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
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
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.projekt && (
              <div className="text-red-400 text-xs mt-1">{errors.projekt}</div>
            )}
          </div>

          {/* Activity */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.taetigkeit')}
            </label>
            <div className="flex gap-1">
              <select
                value={formData.taetigkeit}
                onChange={(e) => setFormData({ ...formData, taetigkeit: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">{t('ph.select')}</option>
                {mockActivities.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddActivity(!showAddActivity)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
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
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddActivity}
                  className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
                >
                  {t('btn.save')}
                </button>
              </div>
            )}
            {errors.taetigkeit && (
              <div className="text-red-400 text-xs mt-1">{errors.taetigkeit}</div>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.von')}
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            />
            {errors.start_time && <div className="text-red-400 text-xs mt-1">{errors.start_time}</div>}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.bis')}
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            />
            {errors.end_time && <div className="text-red-400 text-xs mt-1">{errors.end_time}</div>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              {t('label.notiz')}
            </label>
            <input
              type="text"
              value={formData.notiz}
              onChange={(e) => setFormData({ ...formData, notiz: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-700">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
              {t('btn.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              {t('btn.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEntryModal;
