import { SessionLog } from '../types/security';
import { SecurityLogger } from './securityLogger';
import { IntegrityService } from './integrityService';

export class SessionManager {
  private static session: SessionLog | null = null;

  static startSession(sessionId: string): SessionLog {
    this.session = {
      sessionId,
      startTime: new Date().toISOString(),
      events: [],
      violations: [],
      finalStatus: 'in_progress',
    };

    SecurityLogger.initialize(sessionId);
    IntegrityService.initialize();

    this.saveSession();

    console.log('🚀 Session started:', sessionId);
    return this.session;
  }

  static endSession(
    status: SessionLog['finalStatus'] = 'completed'
  ): SessionLog | null {
    if (!this.session) return null;

    this.session.endTime = new Date().toISOString();
    this.session.finalStatus = status;
    this.session.events = SecurityLogger.getEvents();
    this.session.violations = IntegrityService.getViolations();

    this.saveSession();

    console.log(`🏁 Session ended: ${status}`, this.session);
    return this.session;
  }

  static getCurrentSession(): SessionLog | null {
    return this.session ? { ...this.session } : null;
  }

  static updateStatus(status: SessionLog['finalStatus']): void {
    if (this.session) {
      this.session.finalStatus = status;
      this.saveSession();
    }
  }

  static getSessionDuration(): number {
    if (!this.session || !this.session.startTime) return 0;

    const start = new Date(this.session.startTime).getTime();
    const end = this.session.endTime
      ? new Date(this.session.endTime).getTime()
      : Date.now();

    return Math.floor((end - start) / 1000);
  }

  static exportSession(): string {
    if (!this.session) return '';

    return JSON.stringify(
      {
        ...this.session,
        duration: this.getSessionDuration(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  private static saveSession(): void {
    if (this.session) {
      try {
        localStorage.setItem('current_session', JSON.stringify(this.session));
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  }

  static loadSession(): SessionLog | null {
    try {
      const stored = localStorage.getItem('current_session');
      if (stored) {
        this.session = JSON.parse(stored);
        return this.session;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return null;
  }

  static clearSession(): void {
    this.session = null;
    localStorage.removeItem('current_session');
    SecurityLogger.clear();
    IntegrityService.clear();
  }
}