import React from 'react';

interface ScoreRingProps {
  /** 0–100 */
  score: number;
  /** Diameter in px */
  size?: number;
  strokeWidth?: number;
  /** Brand gradient ID (must be unique per page if multiple rings exist) */
  gradientId?: string;
  showLabel?: boolean;
  labelSuffix?: string;
  className?: string;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  gradientId = 'score-ring-grad',
  showLabel = true,
  labelSuffix = '',
  className = '',
}: ScoreRingProps) {
  const r    = size / 2 - strokeWidth / 2 - 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset  = circ - (circ * clamped) / 100;

  const color =
    clamped >= 80 ? '#10B981' :
    clamped >= 60 ? '#42A5F5' :
    clamped >= 40 ? '#F59E0B' :
                    '#EF4444';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-label={`Score: ${clamped}${labelSuffix}`}
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15,23,42,0.07)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black font-outfit leading-none"
            style={{
              fontSize: size * 0.22,
              color,
            }}
          >
            {Math.round(clamped)}
          </span>
          {labelSuffix && (
            <span
              className="font-bold leading-none mt-0.5"
              style={{ fontSize: size * 0.085, color: 'rgba(100,116,139,0.7)', letterSpacing: '0.04em' }}
            >
              {labelSuffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ScoreRing;
