import { useEffect } from 'react';
import { SecurityLogger } from '../services/securityLogger';
import { IntegrityService } from '../services/integrityService';

interface UseBeforeUnloadProps {
  enabled?: boolean;
  message?: string;
  onAttemptExit?: () => void;
}

export const useBeforeUnload = ({
  enabled = true,
  message = 'Are you sure you want to leave? Your interview progress will be lost.',
  onAttemptExit,
}: UseBeforeUnloadProps = {}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      SecurityLogger.logEvent(
        'exit_attempt',
        'critical',
        'User attempted to close/refresh the page'
      );

      IntegrityService.recordViolation(
        'exit_attempt',
        'User attempted to exit interview'
      );

      onAttemptExit?.();

      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message, onAttemptExit]);
};