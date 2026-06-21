import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-4 border-gray-700 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
      </div>
    </div>
  );
};
