/**
 * Security Types - Complete
 */

export interface SessionLog {
    sessionId: string;
    startTime: string;
    endTime?: string;
    events: any[];
    violations?: any[];
    finalStatus?: 'in_progress' | 'completed' | 'abandoned' | 'terminated';
}

export interface SecurityEvent {
    type: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    data?: any;
}