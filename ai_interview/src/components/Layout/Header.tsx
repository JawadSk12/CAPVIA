import React from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, className = '' }) => {
  return (
    <header className={`bg-gray-900 border-b border-gray-800 py-6 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {title && <h1 className="text-3xl font-bold text-white">{title}</h1>}
        {subtitle && <p className="text-gray-400 mt-2">{subtitle}</p>}
      </div>
    </header>
  );
};
