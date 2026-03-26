import React from 'react';
import { TimerSlot } from '@/types';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/uiStore';
import { Square, X } from 'lucide-react';
import { formatDuration, formatDateISO } from '../../lib/utils';
import InlinePicker from './InlinePicker';

interface TimerLaneProps {
  slot: TimerSlot;
}

const TimerLane: React.FC<TimerLaneProps> = ({ slot }) => {
  const { t } = useI18n();
  const { showToast } = useUiStore();
  const {
    pauseTimer,
    resumeTimer,
    resetSlot,
    removeSlot,
    updateSlotField,
    getSlotElapsed,
    addSlotStakeholder,
    removeSlotStakeholder,
  } = useTimerStore();
  const { add: addEntry } = useEntriesStore();
  const {
    stakeholders,
    projects,
    activities,
    formats,
    addStakeholder,
    addProject,
    addActivity,
    addFormat,
  } = useMasterStore();

  const elapsedMs = getSlotElapsed(slot.id);
  const isRunning = !slot.isPaused && elapsedMs > 0;
  const isPaused = slot.isPaused && elapsedMs > 0;
  const hasTime = elapsedMs > 0;

  // Orb click toggles play/pause
  const handleOrbClick = () => {
    if (slot.isPaused) {
      resumeTimer(slot.id);
    } else {
      pauseTimer(slot.id);
    }
  };

  // Stop & save
  const handleStop = async () => {
    const currentElapsed = getSlotElapsed(slot.id);
    if (currentElapsed < 1000) {
      showToast(t('toast.tooShort'), 'warning');
      return;
    }

    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startDate = new Date(now.getTime() - currentElapsed);
    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    try {
      await addEntry({
        date: slot.date || formatDateISO(now),
        stakeholder: slot.stakeholder,
        projekt: slot.projekt,
        taetigkeit: slot.taetigkeit,
        format: slot.format, // NEW: include format
        start_time: startTimeStr,
        end_time: endTime,
        duration_ms: currentElapsed,
        notiz: slot.notiz || '',
      });
      resetSlot(slot.id);
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  // Breathing orb animation
  const orbSize = 32;
  const orbColor = isRunning
    ? 'var(--neon-cyan)'
    : isPaused
      ? 'var(--warning)'
      : 'var(--text-muted)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '12px',
        border: `1px solid ${isRunning ? 'rgba(201,169,98,0.25)' : isPaused ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
        background: isRunning
          ? 'rgba(201,169,98,0.025)'
          : isPaused
            ? 'rgba(251,191,36,0.015)'
            : 'rgba(0,0,0,0.04)',
        transition: 'all 0.25s',
      }}
    >
      {/* Breathing Orb — play/pause toggle */}
      <button
        onClick={handleOrbClick}
        style={{
          width: orbSize,
          height: orbSize,
          minWidth: orbSize,
          borderRadius: '50%',
          border: `2px solid ${orbColor}`,
          background: isRunning ? 'rgba(201,169,98,0.12)' : 'transparent',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s',
          boxShadow: isRunning
            ? `0 0 12px rgba(201,169,98,0.25), 0 0 4px rgba(201,169,98,0.15)`
            : 'none',
          animation: isRunning ? 'breathe 2s ease-in-out infinite' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={slot.isPaused ? t('timer.start') : t('timer.pause')}
      >
        {/* Inner dot */}
        <div
          style={{
            width: isRunning ? 10 : 8,
            height: isRunning ? 10 : 8,
            borderRadius: '50%',
            background: orbColor,
            transition: 'all 0.3s',
            opacity: isRunning ? 1 : 0.5,
          }}
        />
      </button>

      {/* Dimension pickers (inline) */}
      <div style={{ flex: 1, display: 'flex', gap: '2px', flexWrap: 'wrap', minWidth: 0, alignItems: 'center' }}>
        {/* Stakeholder multi-select chips */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {slot.stakeholder.map((sh) => (
            <div
              key={sh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(0, 200, 200, 0.15)',
                fontSize: '11px',
                color: 'var(--neon-cyan)',
              }}
            >
              <span>{sh}</span>
              <button
                onClick={() => removeSlotStakeholder(slot.id, sh)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--neon-cyan)',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1',
                  fontSize: '12px',
                }}
                title={t('timer.removeStakeholder')}
              >
                ×
              </button>
            </div>
          ))}
          <InlinePicker
            value=""
            options={stakeholders.filter((s) => !slot.stakeholder.includes(s))}
            placeholder={t('ph.stakeholder')}
            onSelect={(v) => addSlotStakeholder(slot.id, v)}
            onAdd={async (v) => { await addStakeholder(v); addSlotStakeholder(slot.id, v); }}
            addPlaceholder={t('ph.newStakeholder')}
            color="var(--neon-cyan)"
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px' }}>·</span>
        <InlinePicker
          value={slot.projekt}
          options={projects}
          placeholder={t('ph.projekt')}
          onSelect={(v) => updateSlotField(slot.id, 'projekt', v)}
          onAdd={async (v) => { await addProject(v); }}
          addPlaceholder={t('ph.newProjekt')}
          color="var(--text)"
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px' }}>·</span>
        <InlinePicker
          value={slot.format}
          options={formats}
          placeholder={t('ph.format')}
          onSelect={(v) => updateSlotField(slot.id, 'format', v)}
          onAdd={async (v) => { await addFormat(v); }}
          addPlaceholder={t('ph.newFormat')}
          color="var(--warning)"
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px' }}>·</span>
        <InlinePicker
          value={slot.taetigkeit}
          options={activities}
          placeholder={t('ph.taetigkeit')}
          onSelect={(v) => updateSlotField(slot.id, 'taetigkeit', v)}
          onAdd={async (v) => { await addActivity(v); }}
          addPlaceholder={t('ph.newTaetigkeit')}
          color="var(--text-secondary)"
        />
      </div>

      {/* Time display */}
      <div
        className="font-mono font-bold"
        style={{
          fontSize: '16px',
          color: isRunning ? 'var(--neon-cyan)' : isPaused ? 'var(--warning)' : 'var(--text-muted)',
          minWidth: '70px',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          textShadow: isRunning ? '0 0 10px rgba(201,169,98,0.2)' : 'none',
        }}
      >
        {formatDuration(elapsedMs)}
      </div>

      {/* Stop & Save */}
      {hasTime && (
        <button
          onClick={handleStop}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.background = 'rgba(212, 112, 110, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
          title={t('timer.stopSave')}
        >
          <Square className="w-3 h-3" />
        </button>
      )}

      {/* Remove lane */}
      <button
        onClick={() => removeSlot(slot.id)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1.5px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--danger)';
          e.currentTarget.style.color = 'var(--danger)';
          e.currentTarget.style.background = 'rgba(212, 112, 110, 0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.background = 'transparent';
        }}
        title={t('timer.removeTask')}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default TimerLane;
