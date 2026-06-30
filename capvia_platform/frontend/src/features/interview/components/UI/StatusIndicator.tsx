import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
  const icons = {
    idle: null,
    loading: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  };

  const colors = {
    idle: 'text-gray-400',
    loading: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
  };

  return (
    <div className="flex items-center gap-2">
      {icons[status]}
      {message && <span className={`text-sm ${colors[status]}`}>{message}</span>}
    </div>
  );
};