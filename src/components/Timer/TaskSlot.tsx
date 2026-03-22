import React, { useState, useMemo } from 'react';
import { TimerSlot } from '@/types';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useI18n } from '../../i18n';
import { Play, Pause, Square, Plus, X } from 'lucide-react';
import { cn, formatDuration, getTodayISO } from '../../lib/utils';

interface TaskSlotProps {
  slot: TimerSlot;
  index: number;
}

const TaskSlot: React.FC<TaskSlotProps> = ({ slot, index }) => {
  const { t } = useI18n();
  const {
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    removeSlot,
    updateSlotField,
    getSlotElapsed,
  } = useTimerStore();
  const { add: addEntry } = useEntriesStore();
  const {
    stakeholders,
    projects,
    activities,
    addStakeholder: addStakeholderToStore,
    addProject: addProjectToStore,
    addActivity: addActivityToStore,
  } = useMasterStore();

  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newActivity, setNewActivity] = useState('');

  const elapsedMs = useMemo(() => getSlotElapsed(slot.id), [slot.id, getSlotElapsed]);

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (slot.isPaused) {
      resumeTimer(slot.id);
    } else {
      pauseTimer(slot.id);
    }
  };

  // Handle stop and save
  const handleStopAndSave = async () => {
    if (elapsedMs < 60000) {
      alert(t('toast.tooShort'));
      return;
    }

    // Calculate start and end times
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startDate = new Date(now.getTime() - elapsedMs);
    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    try {
      await addEntry({
        date: slot.date || now.toISOString().split('T')[0],
        stakeholder: slot.stakeholder,
        projekt: slot.projekt,
        taetigkeit: slot.taetigkeit,
        start_time: startTimeStr,
        end_time: endTime,
        duration_ms: elapsedMs,
        notiz: slot.notiz || '',
      });
      removeSlot(slot.id);
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  // Handle add new dimension
  const handleAddStakeholder = async () => {
    if (newStakeholder.trim()) {
      try {
        await addStakeholderToStore(newStakeholder.trim());
        updateSlotField(slot.id, 'stakeholder', newStakeholder.trim());
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
        updateSlotField(slot.id, 'projekt', newProject.trim());
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
        updateSlotField(slot.id, 'taetigkeit', newActivity.trim());
        setNewActivity('');
        setShowAddActivity(false);
      } catch (error) {
        console.error('Failed to add activity:', error);
      }
    }
  };

  return (
    <div
      className="p-4 rounded-lg border-2 transition-all duration-200"
      style={{
        background:
          slot.isPaused && !slot.startTime
            ? 'var(--surface)'
            : slot.isPaused
              ? 'var(--surface-hover)'
              : 'var(--surface)',
        borderColor:
          slot.isPaused && !slot.startTime
            ? 'var(--border)'
            : slot.isPaused
              ? 'var(--border)'
              : 'var(--primary)',
        boxShadow:
          !slot.isPaused && !slot.isPaused
            ? '0 0 12px var(--primary-shadow)'
            : 'none',
        opacity: slot.isPaused && slot.startTime ? 0.7 : 1,
      }}
    >
      {/* Header: Index + Timer + Play/Pause + Stop */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-solid)' }}
        >
          {index + 1}
        </span>

        <div className="flex-1">
          <div className="text-xl font-mono font-bold" style={{ color: 'var(--primary)' }}>
            {formatDuration(elapsedMs)}
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-colors"
          title={slot.isPaused ? t('timer.start') : t('timer.pause')}
        >
          {slot.isPaused ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStopAndSave}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
          title={t('timer.stopSave')}
        >
          <Square className="w-5 h-5" />
        </button>

        {/* Remove Button */}
        <button
          onClick={() => removeSlot(slot.id)}
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
          title={t('timer.removeTask')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <span
          className="inline-block text-xs font-bold px-2 py-1 rounded"
          style={{
            background: slot.isPaused ? 'var(--warning-bg)' : 'var(--success-bg)',
            color: slot.isPaused ? 'var(--warning)' : 'var(--success)',
          }}
        >
          {slot.isPaused ? t('timer.paused') : t('timer.running')}
        </span>
      </div>

      {/* Stakeholder Dropdown */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('label.stakeholder')}
          </label>
          <div className="flex gap-1">
            <select
              value={slot.stakeholder}
              onChange={(e) => updateSlotField(slot.id, 'stakeholder', e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="">{t('ph.select')}</option>
              {stakeholders.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddStakeholder(!showAddStakeholder)}
              className="px-2 py-1 rounded transition-colors"
              style={{
                background: 'var(--surface-solid)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showAddStakeholder && (
            <div className="flex gap-1 mt-1">
              <input
                type="text"
                placeholder={t('ph.newStakeholder')}
                value={newStakeholder}
                onChange={(e) => setNewStakeholder(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded"
                style={{
                  background: 'var(--surface-solid)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                onClick={handleAddStakeholder}
                className="px-2 py-1 text-white rounded text-sm transition-colors"
                style={{ background: 'var(--success)' }}
              >
                {t('btn.save')}
              </button>
            </div>
          )}
        </div>

        {/* Project Dropdown */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('label.projekt')}
          </label>
          <div className="flex gap-1">
            <select
              value={slot.projekt}
              onChange={(e) => updateSlotField(slot.id, 'projekt', e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="">{t('ph.select')}</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="px-2 py-1 rounded transition-colors"
              style={{
                background: 'var(--surface-solid)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showAddProject && (
            <div className="flex gap-1 mt-1">
              <input
                type="text"
                placeholder={t('ph.newProjekt')}
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded"
                style={{
                  background: 'var(--surface-solid)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                onClick={handleAddProject}
                className="px-2 py-1 text-white rounded text-sm transition-colors"
                style={{ background: 'var(--success)' }}
              >
                {t('btn.save')}
              </button>
            </div>
          )}
        </div>

        {/* Activity Dropdown */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('label.taetigkeit')}
          </label>
          <div className="flex gap-1">
            <select
              value={slot.taetigkeit}
              onChange={(e) => updateSlotField(slot.id, 'taetigkeit', e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="">{t('ph.select')}</option>
              {activities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddActivity(!showAddActivity)}
              className="px-2 py-1 rounded transition-colors"
              style={{
                background: 'var(--surface-solid)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showAddActivity && (
            <div className="flex gap-1 mt-1">
              <input
                type="text"
                placeholder={t('ph.newTaetigkeit')}
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded"
                style={{
                  background: 'var(--surface-solid)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                onClick={handleAddActivity}
                className="px-2 py-1 text-white rounded text-sm transition-colors"
                style={{ background: 'var(--success)' }}
              >
                {t('btn.save')}
              </button>
            </div>
          )}
        </div>

        {/* Note Input */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('label.notiz')}
          </label>
          <input
            type="text"
            placeholder={t('ph.notiz')}
            value={slot.notiz || ''}
            onChange={(e) => updateSlotField(slot.id, 'notiz', e.target.value)}
            className="w-full px-2 py-1 text-sm rounded"
            style={{
              background: 'var(--surface-solid)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskSlot;
