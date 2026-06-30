import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-8 shadow-sm ${className}`}>
      {children}
    </div>
  );
};