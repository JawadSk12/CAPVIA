import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface SecurityWarningProps {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  onClose?: () => void;
  showClose?: boolean;
}

export const SecurityWarning: React.FC<SecurityWarningProps> = ({
  title,
  message,
  severity,
  onClose,
  showClose = true,
}) => {
  const colors = {
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
    medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-200',
    critical: 'bg-red-500/10 border-red-500/30 text-red-200',
  };

  const iconColors = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colors[severity]} animate-fade-in`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 ${iconColors[severity]} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-90">{message}</p>
        </div>

        {showClose && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};