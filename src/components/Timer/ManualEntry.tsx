import React, { useState } from 'react';
import { useEntriesStore } from '../../stores/entriesStore';
import { useMasterStore } from '../../stores/masterStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';
import { formatDateISO } from '../../lib/utils';
import { getTodayISO } from '../../lib/utils';

interface ManualEntryProps {
  embedded?: boolean;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ embedded = false }) => {
  const { t } = useI18n();
  const { add: addEntry } = useEntriesStore();
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
  const [isSaving, setIsSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.stakeholder) newErrors.stakeholder = t('toast.selectShPr');
    if (!formData.projekt) newErrors.projekt = t('toast.selectShPr');
    if (!formData.taetigkeit) newErrors.taetigkeit = t('validation.required');
    if (!formData.date) newErrors.date = t('toast.selectDate');
    if (!formData.startTime) newErrors.startTime = t('toast.selectTime');
    if (!formData.endTime) newErrors.endTime = t('toast.selectTime');
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = t('toast.endAfterStart');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const entries = [];
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (endMins < startMins) {
        const nextDate = new Date(formData.date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateISO = formatDateISO(nextDate);
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

      for (const entry of entries) {
        await addEntry(entry);
      }

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
      showToast(entries.length === 2 ? t('toast.midnight') : t('toast.manualOk'), 'success');
    } catch (error) {
      console.error('Failed to save entry:', error);
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
      } catch (error) { console.error('Failed to add stakeholder:', error); }
    }
  };

  const handleAddProject = async () => {
    if (newProject.trim()) {
      try {
        await addProjectToStore(newProject.trim());
        setFormData({ ...formData, projekt: newProject.trim() });
        setNewProject('');
        setShowAddProject(false);
      } catch (error) { console.error('Failed to add project:', error); }
    }
  };

  const handleAddActivity = async () => {
    if (newActivity.trim()) {
      try {
        await addActivityToStore(newActivity.trim());
        setFormData({ ...formData, taetigkeit: newActivity.trim() });
        setNewActivity('');
        setShowAddActivity(false);
      } catch (error) { console.error('Failed to add activity:', error); }
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text)',
    fontFamily: 'var(--font)',
    fontSize: '12px',
    outline: 'none',
  };

  const inlineBtnStyle: React.CSSProperties = {
    width: '28px',
    minWidth: '28px',
    padding: 0,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  };

  const Wrapper = embedded ? 'div' : ({ children, ...props }: any) => <div className="card p-6" {...props}>{children}</div>;

  return (
    <Wrapper>
      <div
        className="font-display text-xs font-semibold tracking-wide uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: '10px' }}
      >
        {t('manual.title')}
      </div>

      <form onSubmit={handleSubmit}>
        {/* V5.15: 3-column grid for dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          {/* Stakeholder */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch' }}>
            <select
              value={formData.stakeholder}
              onChange={(e) => setFormData({ ...formData, stakeholder: e.target.value })}
              style={{ ...selectStyle, flex: 1, minWidth: 0 }}
            >
              <option value="">{t('ph.stakeholder')}</option>
              {stakeholders.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddStakeholder(!showAddStakeholder)} style={inlineBtnStyle}>+</button>
          </div>

          {/* Project */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch' }}>
            <select
              value={formData.projekt}
              onChange={(e) => setFormData({ ...formData, projekt: e.target.value })}
              style={{ ...selectStyle, flex: 1, minWidth: 0 }}
            >
              <option value="">{t('ph.projekt')}</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddProject(!showAddProject)} style={inlineBtnStyle}>+</button>
          </div>

          {/* Activity */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch' }}>
            <select
              value={formData.taetigkeit}
              onChange={(e) => setFormData({ ...formData, taetigkeit: e.target.value })}
              style={{ ...selectStyle, flex: 1, minWidth: 0 }}
            >
              <option value="">{t('ph.taetigkeit')}</option>
              {activities.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddActivity(!showAddActivity)} style={inlineBtnStyle}>+</button>
          </div>
        </div>

        {/* Inline add rows */}
        {showAddStakeholder && (
          <div className="flex gap-1 mb-2">
            <input type="text" placeholder={t('ph.newStakeholder')} value={newStakeholder} onChange={(e) => setNewStakeholder(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStakeholder())} style={{ ...selectStyle, flex: 1 }} />
            <button type="button" onClick={handleAddStakeholder} style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>{t('btn.save')}</button>
          </div>
        )}
        {showAddProject && (
          <div className="flex gap-1 mb-2">
            <input type="text" placeholder={t('ph.newProjekt')} value={newProject} onChange={(e) => setNewProject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProject())} style={{ ...selectStyle, flex: 1 }} />
            <button type="button" onClick={handleAddProject} style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>{t('btn.save')}</button>
          </div>
        )}
        {showAddActivity && (
          <div className="flex gap-1 mb-2">
            <input type="text" placeholder={t('ph.newTaetigkeit')} value={newActivity} onChange={(e) => setNewActivity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActivity())} style={{ ...selectStyle, flex: 1 }} />
            <button type="button" onClick={handleAddActivity} style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>{t('btn.save')}</button>
          </div>
        )}

        {/* Note input */}
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            placeholder={t('ph.notiz')}
            value={formData.notiz}
            onChange={(e) => setFormData({ ...formData, notiz: e.target.value })}
            style={selectStyle}
          />
        </div>

        {/* Date, Time From, Time To, Save - V5.15 inline row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)' }}>
              {t('label.datum')}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ ...selectStyle, width: '130px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)' }}>
              {t('label.von')}
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              style={{ ...selectStyle, width: '100px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)' }}>
              {t('label.bis')}
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              style={{ ...selectStyle, width: '100px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '6px 14px',
              background: 'rgba(201,169,98,0.07)',
              border: '1px solid rgba(201,169,98,0.18)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--neon-cyan)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              marginBottom: 0,
            }}
            disabled={isSaving}
          >
            {isSaving ? t('ui.loading') : t('btn.save')}
          </button>
        </div>

        {/* Errors */}
        {Object.keys(errors).length > 0 && (
          <div style={{ marginTop: '8px', color: 'var(--danger)', fontSize: '11px' }}>
            {Object.values(errors)[0]}
          </div>
        )}
      </form>
    </Wrapper>
  );
};

export default ManualEntry;
