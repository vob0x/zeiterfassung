import React, { useState } from 'react';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useI18n } from '../../i18n';
import { Plus } from 'lucide-react';
import { getTodayISO } from '../../lib/utils';

const ManualEntry: React.FC = () => {
  const { t } = useI18n();
  const { add: addEntry } = useEntriesStore();
  const { stakeholders, projects, activities } = useMasterStore();

  const [formData, setFormData] = useState({
    date: getTodayISO(),
    stakeholder: '',
    projekt: '',
    taetigkeit: '',
    startTime: '',
    endTime: '',
    notiz: '',
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

    if (!formData.stakeholder) newErrors.stakeholder = t('toast.selectShPr');
    if (!formData.projekt) newErrors.projekt = t('toast.selectShPr');
    if (!formData.taetigkeit) newErrors.taetigkeit = 'Required';
    if (!formData.date) newErrors.date = t('toast.selectDate');
    if (!formData.startTime) newErrors.startTime = t('toast.selectTime');
    if (!formData.endTime) newErrors.endTime = t('toast.selectTime');

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = t('toast.endAfterStart');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const entries = [];

      // Check for midnight crossing
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (endMins < startMins) {
        // Midnight crossing: create two entries
        const nextDate = new Date(formData.date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateISO = nextDate.toISOString().split('T')[0];

        entries.push({
          date: formData.date,
          stakeholder: formData.stakeholder,
          projekt: formData.projekt,
          taetigkeit: formData.taetigkeit,
          start_time: formData.startTime,
          end_time: '23:59',
          notiz: formData.notiz,
        });

        entries.push({
          date: nextDateISO,
          stakeholder: formData.stakeholder,
          projekt: formData.projekt,
          taetigkeit: formData.taetigkeit,
          start_time: '00:00',
          end_time: formData.endTime,
          notiz: formData.notiz,
        });
      } else {
        entries.push({
          date: formData.date,
          stakeholder: formData.stakeholder,
          projekt: formData.projekt,
          taetigkeit: formData.taetigkeit,
          start_time: formData.startTime,
          end_time: formData.endTime,
          notiz: formData.notiz,
        });
      }

      // Save entries
      for (const entry of entries) {
        await addEntry(entry);
      }

      // Reset form
      setFormData({
        date: getTodayISO(),
        stakeholder: '',
        projekt: '',
        taetigkeit: '',
        startTime: '',
        endTime: '',
        notiz: '',
      });
      setErrors({});

      alert(entries.length === 2 ? t('toast.midnight') : t('toast.manualOk'));
    } catch (error) {
      console.error('Failed to save entry:', error);
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

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4">{t('manual.title')}</h2>

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
              {stakeholders.map((s) => (
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
          {errors.stakeholder && <div className="text-red-400 text-xs mt-1">{errors.stakeholder}</div>}
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
              {projects.map((p) => (
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
          {errors.projekt && <div className="text-red-400 text-xs mt-1">{errors.projekt}</div>}
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
              {activities.map((a) => (
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
          {errors.taetigkeit && <div className="text-red-400 text-xs mt-1">{errors.taetigkeit}</div>}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">
            {t('label.von')}
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
          {errors.startTime && <div className="text-red-400 text-xs mt-1">{errors.startTime}</div>}
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">
            {t('label.bis')}
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
          {errors.endTime && <div className="text-red-400 text-xs mt-1">{errors.endTime}</div>}
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">
            {t('label.notiz')}
          </label>
          <input
            type="text"
            placeholder={t('ph.notiz')}
            value={formData.notiz}
            onChange={(e) => setFormData({ ...formData, notiz: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          {t('btn.save')}
        </button>
      </form>
    </div>
  );
};

export default ManualEntry;
