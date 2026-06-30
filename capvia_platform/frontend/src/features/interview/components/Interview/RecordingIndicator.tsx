import React from 'react';
import { Video } from 'lucide-react';

export const RecordingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-2">
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      <Video className="w-4 h-4 text-red-400" />
      <span className="text-sm font-semibold text-red-200">Recording</span>
    </div>
  );
};