/**
 * electron/lockdown/violationLogger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists all security violations to a timestamped JSON log file on disk.
 * Log location: ~/Documents/IntelliRecruit_Violations_<sessionId>.json
 *
 * This file is the "paper trail" for HR review after the interview.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

let _sessionId  = 'unknown';
let _logPath    = null;
let _buffer     = [];   // in-memory buffer; flushed on key events
let _flushTimer = null;

const SEVERITY_MAP = {
  INTERVIEW_START:   'info',
  INTERVIEW_END:     'info',
  KEYBOARD_BLOCKED:  'high',
  FOCUS_LOST:        'medium',
  MULTI_DISPLAY:     'critical',
  CAMERA_LOST:       'critical',
  CLOSE_ATTEMPT:     'high',
  MINIMIZE_ATTEMPT:  'medium',
  QUIT_ATTEMPT:      'critical',
  ADMIN_UNLOCK:      'info',
  default:           'medium',
};

/**
 * Initialise the logger.
 * @param {string} sessionId
 */
function init(sessionId) {
  _sessionId = sessionId;

  // Write to Documents folder (works on both macOS and Windows)
  const docsDir = path.join(os.homedir(), 'Documents');
  _logPath = path.join(docsDir, `IntelliRecruit_Violations_${sessionId}.json`);

  // Create the file with an empty log structure
  const initial = {
    sessionId,
    startedAt: new Date().toISOString(),
    platform: process.platform,
    appVersion: '1.0.0',
    violations: [],
  };

  try {
    fs.writeFileSync(_logPath, JSON.stringify(initial, null, 2), 'utf8');
    console.log(`[ViolationLogger] Log file: ${_logPath}`);
  } catch (err) {
    // Fallback: write to temp dir
    _logPath = path.join(os.tmpdir(), `IntelliRecruit_Violations_${sessionId}.json`);
    console.warn(`[ViolationLogger] Cannot write to Documents — using temp: ${_logPath}`);
    try {
      fs.writeFileSync(_logPath, JSON.stringify(initial, null, 2), 'utf8');
    } catch (e) {
      console.error('[ViolationLogger] Cannot write log file:', e.message);
      _logPath = null;
    }
  }

  // Auto-flush every 10 seconds
  _flushTimer = setInterval(flush, 10_000);
}

/**
 * Record a violation entry.
 * @param {string} type   - e.g. 'KEYBOARD_BLOCKED'
 * @param {string} reason - human-readable description
 */
function log(type, reason) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    severity: SEVERITY_MAP[type] ?? SEVERITY_MAP.default,
    reason,
  };

  _buffer.push(entry);
  console.log(`[ViolationLogger] ${entry.severity.toUpperCase()} | ${type}: ${reason}`);

  // Flush immediately on critical events
  if (entry.severity === 'critical') {
    flush();
  }
}

/**
 * Flush the in-memory buffer to disk.
 */
function flush() {
  if (!_logPath || _buffer.length === 0) return;

  try {
    const raw  = fs.readFileSync(_logPath, 'utf8');
    const data = JSON.parse(raw);
    data.violations.push(..._buffer);
    data.lastFlushed = new Date().toISOString();
    data.totalViolations = data.violations.length;
    fs.writeFileSync(_logPath, JSON.stringify(data, null, 2), 'utf8');
    _buffer = [];
  } catch (err) {
    console.warn('[ViolationLogger] Flush error:', err.message);
  }
}

/**
 * Stop the auto-flush timer.
 */
function stop() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  flush(); // final flush
}

/**
 * Returns the path of the current log file.
 */
function getLogPath() {
  return _logPath;
}

module.exports = { init, log, flush, stop, getLogPath };
