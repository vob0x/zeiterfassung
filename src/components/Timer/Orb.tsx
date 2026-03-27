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
  // Slight growth over time (visual feedback for long tasks)
  const growth = Math.min(elapsed / (4 * 3600000), 1); // max after 4h
  const s = size + growth * 6;

  return (
    <div
      onClick={onClick}
      title={title}
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
            inset: -5,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
            animation: 'orbBreathe 3s ease-in-out infinite',
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
          boxShadow: running ? `0 0 16px ${color}35` : 'none',
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
