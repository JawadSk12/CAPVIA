/**
 * CAPVIA Unified Security Logger
 * ─────────────────────────────────────────────────────
 * Records security events in-memory during active proctored candidate sessions.
 */

export interface SecurityEvent {
  type:      string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  message:   string;
  timestamp: string;
}

export class SecurityLogger {
  private static events: SecurityEvent[] = [];

  static initialize(sessionId: string) {
    this.events = [];
    console.log(`[SecurityLogger] Initialized session: ${sessionId}`);
  }

  static log(event: string, data?: any) {
    console.log(`[Security] ${event}`, data ?? '');
  }

  static warn(event: string, data?: any) {
    console.warn(`[Security Warning] ${event}`, data ?? '');
  }

  static error(event: string, data?: any) {
    console.error(`[Security Error] ${event}`, data ?? '');
  }

  static logEvent(
    type:     string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message:  string
  ) {
    const event: SecurityEvent = {
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    console.log(`[Security Event] ${severity.toUpperCase()}: ${type} — ${message}`);
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
