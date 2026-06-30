/**
 * CAPVIA Unified Integrity Service
 * ─────────────────────────────────────────────────────
 * Manages proctoring violation rules and tracks candidate integrity logs.
 */

import { SecurityLogger } from './securityLogger';

export interface IntegrityViolation {
  type:      string;
  message:   string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  KEYBOARD_BLOCKED:  'high',
  FOCUS_LOST:        'medium',
  MULTI_DISPLAY:     'critical',
  CAMERA_LOST:       'critical',
  CLOSE_ATTEMPT:     'high',
  MINIMIZE_ATTEMPT:  'medium',
  QUIT_ATTEMPT:      'critical',
  TAB_SWITCH:        'high',
  COPY_PASTE:        'medium',
  RIGHT_CLICK:       'low',
  FACE_COVERED:      'critical',
  PHONE_DETECTED:    'critical',
  GAZE_DEVIATION:    'medium',
  HEAD_TURNED:       'medium',
  FULLSCREEN_EXIT:   'high',
};

export class IntegrityService {
  private static violations: IntegrityViolation[] = [];

  static initialize() {
    this.violations = [];
  }

  static checkIntegrity(): boolean {
    return !this.violations.some(v => v.severity === 'critical');
  }

  static reportViolation(type: string, message: string) {
    const severity = SEVERITY_MAP[type] ?? 'medium';
    const violation: IntegrityViolation = {
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };
    this.violations.push(violation);
    SecurityLogger.logEvent(type, severity, message);
  }

  static recordViolation(type: string, message: string) {
    this.reportViolation(type, message);
  }

  static getViolations(): IntegrityViolation[] {
    return [...this.violations];
  }

  static getViolationCount(): number {
    return this.violations.length;
  }

  static getCriticalCount(): number {
    return this.violations.filter(v => v.severity === 'critical').length;
  }

  static clear() {
    this.violations = [];
  }
}
