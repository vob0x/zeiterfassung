import React, { useState } from 'react';
import { TimerSlot } from '@/types';
import { useTimerStore } from '../../stores/timerStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/uiStore';
import { X, MessageSquare } from 'lucide-react';
import { formatDuration, formatDateISO } from '../../lib/utils';
import InlinePicker from './InlinePicker';
import Orb from './Orb';

interface TimerLaneProps {
  slot: TimerSlot;
}

const TimerLane: React.FC<TimerLaneProps> = ({ slot }) => {
  const { t } = useI18n();
  const [showNotiz, setShowNotiz] = useState(!!slot.notiz);
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
  const isRunning = !slot.isPaused;
  const hasTime = elapsedMs > 0;
  const c = slot.color;

  // Progress within 1h (visual feedback)
  const progressPct = Math.min((elapsedMs / 3600000) * 100, 100);

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
        format: slot.format,
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

  return (
    <div
      style={{
        borderRadius: '14px',
        background: isRunning ? `${c}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isRunning ? c + '25' : 'var(--border)'}`,
        transition: 'all 0.35s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated progress bar at bottom */}
      {isRunning && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${c}60, ${c})`,
            transition: 'width 1s linear',
            borderRadius: '0 1px 0 0',
          }}
        />
      )}

      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isRunning ? '14px' : '10px',
          padding: isRunning ? '14px 18px' : '10px 14px',
        }}
      >

      {/* Breathing Orb — play/pause toggle */}
      <Orb
        color={c}
        size={isRunning ? 34 : 26}
        running={isRunning}
        elapsed={elapsedMs}
        onClick={handleOrbClick}
        title={slot.isPaused ? t('timer.start') : t('timer.pause')}
      />

      {/* Dimension pickers (inline) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '2px',
          flexWrap: 'wrap',
          minWidth: 0,
          alignItems: 'center',
          lineHeight: 1.5,
        }}
      >
        {/* Stakeholder multi-select chips */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {slot.stakeholder.map((sh) => (
            <div
              key={sh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 7px',
                borderRadius: '10px',
                background: `${c}18`,
                fontSize: '11px',
                fontWeight: 600,
                color: c,
              }}
            >
              <span>{sh}</span>
              <button
                onClick={() => removeSlotStakeholder(slot.id, sh)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: c,
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1',
                  fontSize: '12px',
                  opacity: 0.6,
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
            onAdd={async (v) => {
              await addStakeholder(v);
              addSlotStakeholder(slot.id, v);
            }}
            addPlaceholder={t('ph.newStakeholder')}
            color={c}
          />
        </div>

        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px', opacity: 0.4 }}>›</span>

        <InlinePicker
          value={slot.projekt}
          options={projects}
          placeholder={t('ph.projekt')}
          onSelect={(v) => updateSlotField(slot.id, 'projekt', v)}
          onAdd={async (v) => { await addProject(v); }}
          addPlaceholder={t('ph.newProjekt')}
          color={isRunning ? 'var(--text)' : 'var(--text-secondary)'}
        />

        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px', opacity: 0.4 }}>›</span>

        <InlinePicker
          value={slot.format}
          options={formats}
          placeholder={t('ph.format')}
          onSelect={(v) => updateSlotField(slot.id, 'format', v)}
          onAdd={async (v) => { await addFormat(v); }}
          addPlaceholder={t('ph.newFormat')}
          color={c + '90'}
        />

        <span style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 1px', opacity: 0.4 }}>›</span>

        <InlinePicker
          value={slot.taetigkeit}
          options={activities}
          placeholder={t('ph.taetigkeit')}
          onSelect={(v) => updateSlotField(slot.id, 'taetigkeit', v)}
          onAdd={async (v) => { await addActivity(v); }}
          addPlaceholder={t('ph.newTaetigkeit')}
          color={isRunning ? c : 'var(--text-secondary)'}
        />
      </div>

      {/* Time display */}
      <div
        className="font-mono font-bold"
        style={{
          fontSize: isRunning ? '20px' : '14px',
          color: isRunning ? c : 'var(--text-muted)',
          minWidth: isRunning ? '100px' : '60px',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          transition: 'all 0.3s',
          letterSpacing: '0.01em',
        }}
      >
        {formatDuration(elapsedMs)}
      </div>

      {/* Stop & Save */}
      {hasTime && (
        <button
          onClick={handleStop}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `1px solid ${isRunning ? '#D4706E35' : 'var(--border)'}`,
            background: 'transparent',
            color: isRunning ? 'var(--danger)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.background = 'rgba(212, 112, 110, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isRunning ? '#D4706E35' : 'var(--border)';
            e.currentTarget.style.color = isRunning ? 'var(--danger)' : 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
          title={t('timer.stopSave')}
        >
          ■
        </button>
      )}

      {/* Notiz toggle */}
      <button
        onClick={() => setShowNotiz(!showNotiz)}
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: `1px solid ${showNotiz || slot.notiz ? c + '30' : 'var(--border)'}`,
          background: showNotiz ? `${c}10` : 'transparent',
          color: showNotiz || slot.notiz ? c : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
          opacity: showNotiz || slot.notiz ? 0.8 : 0.4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = showNotiz || slot.notiz ? '0.8' : '0.4';
        }}
        title={t('field.notiz')}
      >
        <MessageSquare className="w-3 h-3" />
      </button>

      {/* Remove lane */}
      <button
        onClick={() => removeSlot(slot.id)}
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
          opacity: 0.5,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--danger)';
          e.currentTarget.style.color = 'var(--danger)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.opacity = '0.5';
        }}
        title={t('timer.removeTask')}
      >
        <X className="w-3 h-3" />
      </button>
      </div>{/* end main row */}

      {/* Notiz input row */}
      {showNotiz && (
        <div
          style={{
            padding: '0 18px 10px 18px',
            marginLeft: isRunning ? 48 : 36,
          }}
        >
          <input
            type="text"
            value={slot.notiz || ''}
            onChange={(e) => updateSlotField(slot.id, 'notiz', e.target.value)}
            placeholder={t('ph.notiz')}
            style={{
              width: '100%',
              padding: '5px 8px',
              border: `1px solid ${isRunning ? c + '20' : 'var(--border)'}`,
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '11px',
              outline: 'none',
              fontFamily: 'var(--font)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = c;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isRunning ? c + '20' : 'var(--border)';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TimerLane;
