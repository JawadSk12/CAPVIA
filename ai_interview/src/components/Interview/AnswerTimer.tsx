import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface AnswerTimerProps {
  duration: number; // Total duration in seconds
  onTimeUp?: () => void;
  isRunning: boolean;
}

export const AnswerTimer: React.FC<AnswerTimerProps> = ({
  duration,
  onTimeUp,
  isRunning,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isRunning) return;

    setTimeLeft(duration);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, isRunning, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  const isLow = percentage < 20;
  const isMedium = percentage < 50;

  const getColor = () => {
    if (isLow) return 'bg-red-500';
    if (isMedium) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${isLow ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-400">Time Remaining</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${isLow ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-dark-bg rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Warning */}
        {isLow && (
          <div className="flex items-center gap-2 mt-3 text-red-400 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Time is running out!</span>
          </div>
        )}
      </div>
    </div>
  );
};