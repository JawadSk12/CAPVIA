import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'sky' | 'success' | 'warning' | 'danger' | 'neutral' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  primary: { bg: 'rgba(13,71,161,0.08)',   color: '#0D47A1', border: 'rgba(13,71,161,0.18)' },
  sky:     { bg: 'rgba(66,165,245,0.1)',   color: '#1565C0', border: 'rgba(66,165,245,0.2)' },
  success: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.18)' },
  warning: { bg: 'rgba(245,158,11,0.1)', color: '#B45309', border: 'rgba(245,158,11,0.2)' },
  danger:  { bg: 'rgba(239,68,68,0.08)', color: '#DC2626', border: 'rgba(239,68,68,0.18)' },
  neutral: { bg: 'rgba(100,116,139,0.08)', color: '#475569', border: 'rgba(100,116,139,0.15)' },
  violet:  { bg: 'rgba(124,58,237,0.08)', color: '#6D28D9', border: 'rgba(124,58,237,0.18)' },
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  const styles = BADGE_STYLES[variant];
  const fontSize = size === 'sm' ? '9px' : '10px';
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full border ${className}`}
      style={{
        background: styles.bg,
        color: styles.color,
        borderColor: styles.border,
        fontSize,
        padding,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: styles.color }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
