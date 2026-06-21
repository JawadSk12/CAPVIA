import { useEffect, useRef } from 'react';
import { debounce } from '@/utils/helpers';

interface UseAutoSaveOptions {
    data: any;
    onSave: (data: any) => Promise<void>;
    interval?: number; // milliseconds
    enabled?: boolean;
}

export const useAutoSave = ({
    data,
    onSave,
    interval = 30000, // 30 seconds default
    enabled = true,
}: UseAutoSaveOptions) => {
    const savedDataRef = useRef<any>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedSave = useRef(
        debounce(async (dataToSave: any) => {
            try {
                await onSave(dataToSave);
                savedDataRef.current = dataToSave;
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 2000)
    ).current;

    useEffect(() => {
        if (!enabled) return;

        // Check if data has changed
        const hasChanged = JSON.stringify(data) !== JSON.stringify(savedDataRef.current);

        if (hasChanged && data) {
            debouncedSave(data);
        }

        // Set up interval save
        if (saveTimeoutRef.current) {
            clearInterval(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setInterval(() => {
            const currentHasChanged = JSON.stringify(data) !== JSON.stringify(savedDataRef.current);
            if (currentHasChanged && data) {
                onSave(data).then(() => {
                    savedDataRef.current = data;
                });
            }
        }, interval);

        return () => {
            if (saveTimeoutRef.current) {
                clearInterval(saveTimeoutRef.current);
            }
        };
    }, [data, onSave, interval, enabled, debouncedSave]);
};