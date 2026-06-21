import React, { useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useTestStore } from '@/store/testStore';

interface TimerDisplayProps {
    onTimeUp?: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ onTimeUp }) => {
    const { timeRemaining, decrementTime } = useTestStore();

    useEffect(() => {
        if (timeRemaining <= 0) {
            onTimeUp?.();
            return;
        }

        const timer = setInterval(() => {
            decrementTime();
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, decrementTime, onTimeUp]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const isLowTime = timeRemaining < 300; // Less than 5 minutes
    const isCritical = timeRemaining < 60; // Less than 1 minute

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold ${isCritical
                    ? 'bg-danger-100 text-danger-700 animate-pulse'
                    : isLowTime
                        ? 'bg-warning-100 text-warning-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
        >
            {isCritical ? (
                <AlertCircle className="h-5 w-5" />
            ) : (
                <Clock className="h-5 w-5" />
            )}
            <span>{formatTime(timeRemaining)}</span>
        </div>
    );
};