import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const paddingMap  = { sm: 'py-8', md: 'py-12', lg: 'py-20' };
  const iconSizeMap = { sm: 'w-8 h-8 p-2',  md: 'w-10 h-10 p-2.5', lg: 'w-14 h-14 p-3.5' };
  const iconSz      = { sm: 'w-4 h-4',  md: 'w-5 h-5', lg: 'w-7 h-7' };
  const emojiSz     = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-5xl' };
  const titleSz     = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[16px]' };
  const descSz      = { sm: 'text-[11px]', md: 'text-[12px]', lg: 'text-[13px]' };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl ${paddingMap[size]} ${className}`}
      style={{
        background: 'var(--surface-subtle)',
        border: '1px dashed var(--border-default)',
      }}
    >
      {/* Icon or Emoji */}
      {emoji ? (
        <div className={`${emojiSz[size]} mb-3`}>{emoji}</div>
      ) : Icon ? (
        <div
          className={`rounded-2xl flex items-center justify-center mb-3 ${iconSizeMap[size]}`}
          style={{ background: 'rgba(13,71,161,0.07)' }}
        >
          <Icon className={iconSz[size]} style={{ color: '#0D47A1' }} />
        </div>
      ) : null}

      <p className={`font-bold text-slate-700 ${titleSz[size]}`}>{title}</p>

      {description && (
        <p className={`text-slate-400 mt-1.5 font-medium max-w-xs mx-auto leading-relaxed ${descSz[size]}`}>
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:-translate-y-px"
          style={{
            background: 'var(--capvia-primary)',
            boxShadow: 'var(--shadow-primary)',
          }}
        >
          {action.icon && React.createElement(action.icon, { className: 'w-3.5 h-3.5' })}
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
