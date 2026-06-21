/**
 * sessionPersistenceService.ts
 * Persists completed interview sessions to localStorage so HR can review them later.
 */
import type { EvaluationReport } from './speechEvaluationService';
import type { DeepEvalResult }   from './deepEvaluationService';

export const CURRENT_SESSION_KEY = 'ir_current_session_id';
const SESSIONS_KEY               = 'ir_completed_sessions';

export interface DetectionSnapshot {
  eyeGaze:        { direction: string; focusPercentage: number; lookAwayCount: number };
  headPose:       { yaw: number; pitch: number; roll: number; stability: number; movementCount: number };
  faceValidity:   { faceCount: number; visibilityPercentage: number; absenceCount: number; occlusionCount: number };
  maskDetection:  { status: string; identityVerified: boolean; occlusionEvents: number };
  phoneDetection: { phoneDetected: boolean; detectionCount: number };
  overall: {
    integrityScore:      number;
    riskLevel:           string;
    cheatingProbability: number;
    sessionDuration:     number;
    violations:          Array<{ type: string; severity: string; message: string }>;
  };
}

export interface LocalViolationSummary {
  tabSwitches:    number;
  windowBlurs:    number;
  rightClicks:    number;
  copyPastes:     number;
  suspiciousKeys: number;
}

export interface CompletedSession {
  id:              string;
  candidateName:   string;
  internshipRole:  string;
  company:         string;
  timestamp:       string;
  videoBase64:     string | null;
  evalReport:      EvaluationReport;
  detectionData:   DetectionSnapshot;
  deepEvalResults: DeepEvalResult[];
  localViolations: LocalViolationSummary;
}

export class SessionPersistenceService {
  static saveSession(session: CompletedSession): void {
    try {
      const existing = this.loadAllSessions();
      const filtered = existing.filter(s => s.id !== session.id);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([...filtered, session]));
      sessionStorage.setItem(CURRENT_SESSION_KEY, session.id);
    } catch (e) {
      console.error('[SessionPersistence] Failed to save:', e);
    }
  }

  static loadAllSessions(): CompletedSession[] {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      return raw ? (JSON.parse(raw) as CompletedSession[]) : [];
    } catch {
      return [];
    }
  }

  static getCurrentSessionId(): string | null {
    return sessionStorage.getItem(CURRENT_SESSION_KEY);
  }

  static getCurrentSession(): CompletedSession | null {
    const id = this.getCurrentSessionId();
    return id ? this.getSessionById(id) : null;
  }

  static getSessionById(id: string): CompletedSession | null {
    return this.loadAllSessions().find(s => s.id === id) ?? null;
  }

  static deleteSession(id: string): void {
    const filtered = this.loadAllSessions().filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  }

  static clearAllSessions(): void {
    localStorage.removeItem(SESSIONS_KEY);
  }
}
