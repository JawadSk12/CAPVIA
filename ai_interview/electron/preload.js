/**
 * electron/preload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure context bridge between the Electron main process and the React
 * renderer. Exposes ONLY the necessary security IPC channels — no raw Node.js
 * or Electron APIs are leaked to the renderer.
 *
 * The renderer accesses this via: window.electronSecurity
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── Utility: safe one-way listener that cleans up properly ───────────────────
function safeOn(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  // Return a cleanup function
  return () => ipcRenderer.removeListener(channel, handler);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPOSED API
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronSecurity', {

  // ── Inbound: Main → Renderer (event subscriptions) ──────────────────────

  /**
   * Listen for any security violation detected by the main process.
   * @param {function} cb - ({ type, reason, severity, timestamp }) => void
   * @returns {function} cleanup — call to remove the listener
   */
  onViolation: (cb) => safeOn('security:violation', cb),

  /**
   * Listen for display count changes (multi-monitor detection).
   * @param {function} cb - ({ count, blocked }) => void
   * @returns {function} cleanup
   */
  onDisplayChange: (cb) => safeOn('security:displayCount', cb),

  /**
   * Listen for camera loss events (camera stream dropped).
   * @param {function} cb - ({ paused }) => void
   * @returns {function} cleanup
   */
  onCameraLost: (cb) => safeOn('security:cameraLost', cb),

  /**
   * Listen for camera restore events.
   * @param {function} cb - ({ paused }) => void
   * @returns {function} cleanup
   */
  onCameraRestored: (cb) => safeOn('security:cameraRestored', cb),

  /**
   * Listen for admin unlock granted event.
   * @param {function} cb - () => void
   * @returns {function} cleanup
   */
  onUnlockGranted: (cb) => safeOn('security:unlockGranted', cb),

  // ── Outbound: Renderer → Main (one-way signals) ─────────────────────────

  /**
   * Signal that the interview has started — triggers all lockdown systems.
   */
  notifyInterviewStarted: () => {
    ipcRenderer.send('interview:started', { timestamp: new Date().toISOString() });
  },

  /**
   * Signal that the interview has ended normally — releases all locks.
   */
  notifyInterviewEnded: () => {
    ipcRenderer.send('interview:ended', { timestamp: new Date().toISOString() });
  },

  /**
   * Request admin unlock — shows a PIN dialog in the main process.
   */
  requestAdminUnlock: () => {
    ipcRenderer.send('security:requestAdminUnlock');
  },

  // ── Queries: Renderer → Main (invoke/reply) ──────────────────────────────

  /**
   * Get the current number of connected displays.
   * @returns {Promise<number>}
   */
  getDisplayCount: () => ipcRenderer.invoke('security:getDisplayCount'),

  /**
   * Check if the interview lock is currently active.
   * @returns {Promise<boolean>}
   */
  isLocked: () => ipcRenderer.invoke('security:isLocked'),

  // ── Environment flag ─────────────────────────────────────────────────────

  /**
   * True when running inside Electron (not a plain browser).
   * React can use this to conditionally enable kiosk UI.
   */
  isElectron: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA STATE RELAY
// ─────────────────────────────────────────────────────────────────────────────
// The cameraWatchdog in main sends 'camera:requestState' →
// Preload fires a DOM event so the React component can respond.
// React then dispatches a DOM event 'camera:stateReport' →
// Preload picks that up and sends it back to main via IPC.

// Main → Renderer: request
ipcRenderer.on('camera:requestState', () => {
  window.dispatchEvent(new CustomEvent('camera:requestState'));
});

// Renderer → Main: response
window.addEventListener('camera:stateReport', (e) => {
  const { online } = (e as CustomEvent).detail;
  ipcRenderer.send('camera:stateUpdate', { online });
});
