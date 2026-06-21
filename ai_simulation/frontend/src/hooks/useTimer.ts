import { useEffect, useRef, useState } from 'react';

interface UseTimerOptions {
    initialTime: number; // in seconds
    onComplete?: () => void;
    autoStart?: boolean;
}

export const useTimer = ({
    initialTime,
    onComplete,
    autoStart = true,
}: UseTimerOptions) => {
    const [timeRemaining, setTimeRemaining] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(autoStart);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            intervalRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        onComplete?.();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeRemaining, onComplete]);

    const pause = () => setIsRunning(false);
    const resume = () => setIsRunning(true);
    const reset = () => {
        setTimeRemaining(initialTime);
        setIsRunning(autoStart);
    };

    return {
        timeRemaining,
        isRunning,
        pause,
        resume,
        reset,
    };
};