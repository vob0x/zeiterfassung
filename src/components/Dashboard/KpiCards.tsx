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
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-slate-400 text-sm font-medium mb-2">{t('kpi.today')}</div>
          <div className="text-4xl font-bold text-cyan-400">
            <AnimatedCounter value={today} />
          </div>
          <div className="text-xs text-slate-500 mt-2">Heute erfasst</div>
        </div>
      </div>

      {/* Period Hours */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-blue-500/30 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-slate-400 text-sm font-medium mb-2">{t('period.label')}</div>
          <div className="text-4xl font-bold text-blue-400">
            <AnimatedCounter value={period} />
          </div>
          <div className="text-xs text-slate-500 mt-2">Im Zeitraum</div>
        </div>
      </div>

      {/* Entry Count */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-purple-500/30 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-slate-400 text-sm font-medium mb-2">{t('kpi.entries')}</div>
          <div className="text-4xl font-bold text-purple-400">
            <AnimatedCounter value={entries} decimals={0} />
          </div>
          <div className="text-xs text-slate-500 mt-2">Einträge</div>
        </div>
      </div>
    </div>
  );
}
