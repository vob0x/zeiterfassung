import React, { useState } from 'react';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useI18n } from '../../i18n';
import { Plus } from 'lucide-react';
import { getTodayISO } from '../../lib/utils';

const ManualEntry: React.FC = () => {
  const { t } = useI18n();
  const { add: addEntry } = useEntriesStore();
  const {
    stakeholders,
    projects,
    activities,
    addStakeholder: addStakeholderToStore,
    addProject: addProjectToStore,
    addActivity: addActivityToStore,
  } = useMasterStore();

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

  return (
    <div className="card p-6">
      <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold mb-4">{t('manual.title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.datum')}
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="input text-sm"
          />
          {errors.date && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.date}</div>}
        </div>

        {/* Stakeholder */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.stakeholder')}
          </label>
          <div className="flex gap-1">
            <select
              value={formData.stakeholder}
              onChange={(e) => setFormData({ ...formData, stakeholder: e.target.value })}
              className="select flex-1 text-sm"
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
              style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              className="px-3 py-2 rounded transition-colors hover:opacity-80"
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
                className="input flex-1 text-sm"
              />
              <button
                type="button"
                onClick={handleAddStakeholder}
                style={{ background: 'var(--success)', color: 'white' }}
                className="px-3 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90"
              >
                {t('btn.save')}
              </button>
            </div>
          )}
          {errors.stakeholder && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.stakeholder}</div>}
        </div>

        {/* Project */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.projekt')}
          </label>
          <div className="flex gap-1">
            <select
              value={formData.projekt}
              onChange={(e) => setFormData({ ...formData, projekt: e.target.value })}
              className="select flex-1 text-sm"
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
              style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              className="px-3 py-2 rounded transition-colors hover:opacity-80"
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
                className="input flex-1 text-sm"
              />
              <button
                type="button"
                onClick={handleAddProject}
                style={{ background: 'var(--success)', color: 'white' }}
                className="px-3 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90"
              >
                {t('btn.save')}
              </button>
            </div>
          )}
          {errors.projekt && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.projekt}</div>}
        </div>

        {/* Activity */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.taetigkeit')}
          </label>
          <div className="flex gap-1">
            <select
              value={formData.taetigkeit}
              onChange={(e) => setFormData({ ...formData, taetigkeit: e.target.value })}
              className="select flex-1 text-sm"
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
              style={{ background: 'var(--surface-solid)', color: 'var(--text-secondary)' }}
              className="px-3 py-2 rounded transition-colors hover:opacity-80"
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
                className="input flex-1 text-sm"
              />
              <button
                type="button"
                onClick={handleAddActivity}
                style={{ background: 'var(--success)', color: 'white' }}
                className="px-3 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90"
              >
                {t('btn.save')}
              </button>
            </div>
          )}
          {errors.taetigkeit && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.taetigkeit}</div>}
        </div>

        {/* Start Time */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.von')}
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="input text-sm"
          />
          {errors.startTime && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.startTime}</div>}
        </div>

        {/* End Time */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.bis')}
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="input text-sm"
          />
          {errors.endTime && <div style={{ color: 'var(--danger)' }} className="text-xs mt-1">{errors.endTime}</div>}
        </div>

        {/* Note */}
        <div>
          <label style={{ color: 'var(--text-secondary)' }} className="block text-sm font-semibold mb-1">
            {t('label.notiz')}
          </label>
          <input
            type="text"
            placeholder={t('ph.notiz')}
            value={formData.notiz}
            onChange={(e) => setFormData({ ...formData, notiz: e.target.value })}
            className="input text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-full font-semibold"
        >
          {t('btn.save')}
        </button>
      </form>
    </div>
  );
};

export default ManualEntry;
