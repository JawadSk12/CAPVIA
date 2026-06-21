/**
 * multiDisplayGuard.js
 * ─────────────────────────────────────────────────────────────────────
 * Detects the number of connected displays.
 * On startup and every 10 seconds during interview, checks if a second
 * monitor is connected. If so, notifies the renderer to show a blocking
 * overlay that forces the candidate to disconnect it.
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const { screen } = require('electron');

let _mainWindow = null;
let _onDisplayChange = null;
let _checkInterval = null;
let _lastCount = 1;

const CHECK_MS = 10_000; // re-check every 10 seconds

/**
 * Initialize guard.
 * @param {BrowserWindow} mainWindow
 * @param {function} onDisplayChange - callback({ count: number, blocked: boolean })
 */
function init(mainWindow, onDisplayChange) {
  _mainWindow = mainWindow;
  _onDisplayChange = onDisplayChange;
}

/**
 * Get current display count and report.
 * @returns {number} number of connected displays
 */
function check() {
  try {
    const displays = screen.getAllDisplays();
    const count = displays.length;

    if (count !== _lastCount) {
      console.log(`[MultiDisplayGuard] Display count changed: ${_lastCount} → ${count}`);
      _lastCount = count;

      if (_onDisplayChange) {
        _onDisplayChange({ count, blocked: count > 1 });
      }

      // Notify renderer via IPC
      if (_mainWindow && !_mainWindow.isDestroyed()) {
        _mainWindow.webContents.send('security:displayCount', { count, blocked: count > 1 });
      }
    }

    return count;
  } catch (err) {
    console.warn('[MultiDisplayGuard] Check error:', err.message);
    return 1;
  }
}

/**
 * Start polling — call on app startup (before interview).
 */
function start() {
  // Immediate check
  const initial = check();
  console.log(`[MultiDisplayGuard] Initial display count: ${initial}`);

  // Register Electron display events for instant notification
  screen.on('display-added', () => {
    console.log('[MultiDisplayGuard] Display added!');
    check();
  });

  screen.on('display-removed', () => {
    console.log('[MultiDisplayGuard] Display removed.');
    check();
  });

  // Periodic poll as fallback
  _checkInterval = setInterval(check, CHECK_MS);
}

/**
 * Stop polling — call when app exits.
 */
function stop() {
  if (_checkInterval) {
    clearInterval(_checkInterval);
    _checkInterval = null;
  }
}

/**
 * Returns current display count synchronously.
 */
function getCount() {
  try {
    return screen.getAllDisplays().length;
  } catch {
    return 1;
  }
}

module.exports = { init, start, stop, getCount, check };
