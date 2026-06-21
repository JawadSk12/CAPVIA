import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
};