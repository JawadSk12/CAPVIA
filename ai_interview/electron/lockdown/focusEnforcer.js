/**
 * focusEnforcer.js
 * ─────────────────────────────────────────────────────────────────────
 * Polls window focus every 500 ms.
 * If the interview app loses focus to any other process, it immediately
 * reclaims focus and logs the violation.
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

let _mainWindow = null;
let _onViolation = null;
let _pollInterval = null;
let _isActive = false;
let _consecutiveLostCount = 0;

const POLL_MS = 500;
const MAX_SECONDS_LOST = 3; // after 3s of being out of focus → escalate

/**
 * Initialize enforcer.
 * @param {BrowserWindow} mainWindow
 * @param {function} onViolation - callback(detail: string)
 */
function init(mainWindow, onViolation) {
  _mainWindow = mainWindow;
  _onViolation = onViolation;

  // Also listen to Electron's own blur/focus events for instant reaction
  mainWindow.on('blur', () => {
    if (!_isActive) return;
    _handleFocusLost('window:blur');
  });

  mainWindow.on('minimize', () => {
    if (!_isActive) return;
    // Immediately restore
    mainWindow.restore();
    _handleFocusLost('window:minimized');
  });
}

function _handleFocusLost(source) {
  if (!_mainWindow || _mainWindow.isDestroyed()) return;

  console.log(`[FocusEnforcer] Focus lost (${source}) — restoring...`);

  // Re-assert focus
  _restoreFocus();

  if (_onViolation) {
    _onViolation(`Focus lost: ${source}`);
  }
}

function _restoreFocus() {
  if (!_mainWindow || _mainWindow.isDestroyed()) return;

  try {
    if (_mainWindow.isMinimized()) _mainWindow.restore();
    _mainWindow.setAlwaysOnTop(true, 'screen-saver');
    _mainWindow.focus();
    _mainWindow.moveTop();

    if (process.platform === 'darwin') {
      const { app } = require('electron');
      app.focus({ steal: true });
    }

    if (process.platform === 'win32') {
      // On Windows: flash taskbar to indicate we want focus back
      _mainWindow.flashFrame(false); // stop any existing flash
    }
  } catch (err) {
    console.warn('[FocusEnforcer] Error restoring focus:', err.message);
  }
}

/**
 * Start enforcement polling — call when interview begins.
 */
function start() {
  if (_isActive) return;
  _isActive = true;
  _consecutiveLostCount = 0;

  _pollInterval = setInterval(() => {
    if (!_mainWindow || _mainWindow.isDestroyed()) {
      stop();
      return;
    }

    const focused = _mainWindow.isFocused();

    if (!focused) {
      _consecutiveLostCount++;
      const secondsLost = (_consecutiveLostCount * POLL_MS) / 1000;

      _restoreFocus();

      // Escalate violation after MAX_SECONDS_LOST seconds of being away
      if (secondsLost >= MAX_SECONDS_LOST && secondsLost % MAX_SECONDS_LOST < POLL_MS / 1000) {
        if (_onViolation) {
          _onViolation(`App out of focus for ${secondsLost.toFixed(1)}s`);
        }
      }
    } else {
      _consecutiveLostCount = 0;
    }
  }, POLL_MS);

  console.log('[FocusEnforcer] Focus enforcement started.');
}

/**
 * Stop enforcement — call when interview ends.
 */
function stop() {
  _isActive = false;
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  console.log('[FocusEnforcer] Focus enforcement stopped.');
}

module.exports = { init, start, stop };
