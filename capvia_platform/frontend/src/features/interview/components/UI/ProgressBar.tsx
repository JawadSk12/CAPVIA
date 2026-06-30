import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, label }) => {
  const percentage = (current / total) * 100;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <span className="text-sm text-gray-400">{current + 1} / {total + 1}</span>
        </div>
      )}
      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};