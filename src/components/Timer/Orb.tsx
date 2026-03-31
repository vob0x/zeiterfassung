import React from 'react';

interface OrbProps {
  color: string;
  size?: number;
  running?: boolean;
  elapsed?: number;
  onClick?: () => void;
  title?: string;
}

/**
 * Glasig breathing orb — visual heartbeat of a timer lane.
 * Grows slightly over time (max +6px after 4h).
 * Breathes (glow pulses) when running.
 */
const Orb: React.FC<OrbProps> = ({
  color,
  size = 32,
  running = false,
  elapsed = 0,
  onClick,
  title,
}) => {
  // Growth over time — orb swells gently as hours accumulate (max +10px after 4h)
  const growth = Math.min(elapsed / (4 * 3600000), 1); // 0→1 over 4h
  const s = size + growth * 10;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={title}
      style={{
        position: 'relative',
        width: s,
        height: s,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Glow halo (only when running) */}
      {running && (
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            animation: 'orbBreathe 3.5s ease-in-out infinite',
          }}
        />
      )}
      {/* Core sphere */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: running
            ? `radial-gradient(circle at 35% 35%, ${color}, ${color}90)`
            : `radial-gradient(circle at 35% 35%, ${color}50, ${color}25)`,
          boxShadow: running ? `0 0 18px ${color}40, 0 0 6px ${color}20` : 'none',
          animation: running ? 'orbPulse 3.5s ease-in-out infinite' : 'none',
          transition: 'all 0.4s ease',
        }}
      />
      {/* Inner glass shine */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '22%',
          width: '28%',
          height: '22%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(255,255,255,${running ? 0.3 : 0.1}), transparent)`,
        }}
      />
    </div>
  );
};

export default Orb;
