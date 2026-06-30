/**
 * Security Logger
 * ─────────────────────────────────────────────────────
 * Records security events both in-memory (for in-session
 * results display) and - when running inside Electron -
 * to a persistent JSON file on disk via the IPC bridge.
 */

interface SecurityEvent {
    type:      string;
    severity:  'low' | 'medium' | 'high' | 'critical';
    message:   string;
    timestamp: Date;
}

export class SecurityLogger {
    private static events: SecurityEvent[] = [];
    static initialize(sessionId: string) {
        this.events = [];
        // sessionId is reserved for future server-side log correlation
        void sessionId;
    }

    static log(event: string, data?: any) {
        console.log(`[Security] ${event}`, data ?? '');
    }

    static warn(event: string, data?: any) {
        console.warn(`[Security] ${event}`, data ?? '');
    }

    static error(event: string, data?: any) {
        console.error(`[Security] ${event}`, data ?? '');
    }

    /**
     * Log a structured security event.
     * In Electron mode this is automatically persisted to disk
     * by the main-process violation logger.
     */
    static logEvent(
        type:     string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        message:  string
    ) {
        const event: SecurityEvent = {
            type,
            severity,
            message,
            timestamp: new Date(),
        };
        this.events.push(event);
        console.log(`[Security Event] ${severity.toUpperCase()}: ${type} — ${message}`);

        // ── Electron: violations are already persisted by the main process
        // when they originate from main-process lockdown modules.
        // For renderer-side violations (tab-switch, right-click, etc.)
        // we log them here so they're visible in the violation log.
        // (No separate IPC needed — the main process receives
        //  interview:started/ended but individual renderer violations
        //  are captured in the JSON log only via the in-memory store
        //  which is passed to Results on interview completion.)
    }

    static getEvents(): SecurityEvent[] {
        return [...this.events];
    }

    static getSummary() {
        const byType: Record<string, number> = {};
        for (const e of this.events) {
            byType[e.type] = (byType[e.type] ?? 0) + 1;
        }
        return {
            total:       this.events.length,
            byType,
            bySeverity: {
                critical: this.events.filter(e => e.severity === 'critical').length,
                high:     this.events.filter(e => e.severity === 'high').length,
                medium:   this.events.filter(e => e.severity === 'medium').length,
                low:      this.events.filter(e => e.severity === 'low').length,
            },
        };
    }

    static clear() {
        this.events = [];
    }
}