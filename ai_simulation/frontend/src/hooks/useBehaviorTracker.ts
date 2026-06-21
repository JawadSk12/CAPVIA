import { useEffect, useRef } from 'react';
import { testApi } from '@/services/api/test';

interface UseBehaviorTrackerOptions {
    sessionId: number;
    questionId?: number;
    isActive: boolean;
}

export const useBehaviorTracker = ({
    sessionId,
    questionId,
    isActive,
}: UseBehaviorTrackerOptions) => {
    const tabSwitchCount = useRef(0);
    const copyCount = useRef(0);
    const pasteCount = useRef(0);
    const idleStartTime = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive) return;

        // Track tab visibility changes
        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchCount.current++;
                testApi.logBehaviorEvent({
                    session_id: sessionId,
                    question_id: questionId,
                    event_type: 'tab_switch',
                    event_data: { count: tabSwitchCount.current },
                    severity: tabSwitchCount.current > 3 ? 'high' : 'medium',
                });
            }
        };

        // Track copy events
        const handleCopy = (e: ClipboardEvent) => {
            copyCount.current++;
            testApi.logBehaviorEvent({
                session_id: sessionId,
                question_id: questionId,
                event_type: 'copy',
                event_data: {
                    count: copyCount.current,
                    text_length: e.clipboardData?.getData('text').length || 0
                },
                severity: 'low',
            });
        };

        // Track paste events
        const handlePaste = (e: ClipboardEvent) => {
            pasteCount.current++;
            testApi.logBehaviorEvent({
                session_id: sessionId,
                question_id: questionId,
                event_type: 'paste',
                event_data: {
                    count: pasteCount.current,
                    text_length: e.clipboardData?.getData('text').length || 0
                },
                severity: pasteCount.current > 2 ? 'high' : 'medium',
            });
        };

        // Track idle time
        const handleActivity = () => {
            if (idleStartTime.current) {
                const idleDuration = Date.now() - idleStartTime.current;
                if (idleDuration > 60000) { // More than 1 minute
                    testApi.logBehaviorEvent({
                        session_id: sessionId,
                        question_id: questionId,
                        event_type: 'idle',
                        event_data: { duration: idleDuration },
                        severity: idleDuration > 300000 ? 'high' : 'medium', // 5 minutes
                    });
                }
            }
            idleStartTime.current = null;
        };

        const handleIdle = () => {
            if (!idleStartTime.current) {
                idleStartTime.current = Date.now();
            }
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('mousemove', handleActivity);
        document.addEventListener('keypress', handleActivity);

        // Set idle timer
        const idleTimer = setInterval(handleIdle, 30000); // Check every 30 seconds

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('mousemove', handleActivity);
            document.removeEventListener('keypress', handleActivity);
            clearInterval(idleTimer);
        };
    }, [sessionId, questionId, isActive]);

    return {
        tabSwitchCount: tabSwitchCount.current,
        copyCount: copyCount.current,
        pasteCount: pasteCount.current,
    };
};