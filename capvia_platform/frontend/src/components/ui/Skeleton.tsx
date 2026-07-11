import React from 'react';

function Skel({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className ?? ''}`} />;
}

interface SkeletonCardProps { rows?: number; hasHeader?: boolean; }
interface SkeletonTableProps { rows?: number; cols?: number; }
interface SkeletonKpiProps {}

export function SkeletonCard({ rows = 3, hasHeader = true }: SkeletonCardProps) {
  return (
    <div className="card p-6 space-y-4">
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skel className="h-4 w-32" />
          <Skel className="h-4 w-16" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} className={`h-3 ${i === rows - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skel key={i} className={`h-3 ${i === 0 ? 'flex-[2]' : 'flex-1'}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 items-center py-2.5" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Skel key={ci} className={`h-4 ${ci === 0 ? 'flex-[2]' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-5">
        <Skel className="w-9 h-9 !rounded-xl" />
        <Skel className="h-5 w-20 !rounded-full" />
      </div>
      <Skel className="h-2.5 w-20 mb-3" />
      <Skel className="h-9 w-14 mb-2" />
      <Skel className="h-2.5 w-28" />
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sMap = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return <div className={`skeleton rounded-full !rounded-full ${sMap[size]}`} />;
}

export function SkeletonText({ lines = 2 }: { lines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} className={`h-3 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export default SkeletonCard;
