import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';

interface KpiCardsProps {
  today: number;
  period: number;
  entries: number;
}

function AnimatedCounter({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const duration = 600;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const current = start + (end - start) * progress;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}h</span>;
}

export function KpiCards({ today, period, entries }: KpiCardsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Today's Hours */}
      <div className="relative overflow-hidden rounded-lg backdrop-blur-xl border p-6 shadow-2xl" style={{ background: 'linear-gradient(to bottom right, rgba(var(--surface-rgb), 0.8), rgba(var(--surface-rgb), 0.8))', borderColor: 'rgba(0, 204, 255, 0.3)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('kpi.today')}</div>
          <div className="text-4xl font-bold" style={{ color: 'var(--neon-cyan)' }}>
            <AnimatedCounter value={today} />
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Heute erfasst</div>
        </div>
      </div>

      {/* Period Hours */}
      <div className="relative overflow-hidden rounded-lg backdrop-blur-xl border p-6 shadow-2xl" style={{ background: 'linear-gradient(to bottom right, rgba(var(--surface-rgb), 0.8), rgba(var(--surface-rgb), 0.8))', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('period.label')}</div>
          <div className="text-4xl font-bold" style={{ color: '#60a5fa' }}>
            <AnimatedCounter value={period} />
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Im Zeitraum</div>
        </div>
      </div>

      {/* Entry Count */}
      <div className="relative overflow-hidden rounded-lg backdrop-blur-xl border p-6 shadow-2xl" style={{ background: 'linear-gradient(to bottom right, rgba(var(--surface-rgb), 0.8), rgba(var(--surface-rgb), 0.8))', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('kpi.entries')}</div>
          <div className="text-4xl font-bold" style={{ color: '#c084fc' }}>
            <AnimatedCounter value={entries} decimals={0} />
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Einträge</div>
        </div>
      </div>
    </div>
  );
}
