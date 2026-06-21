/**
 * keyboardBlocker.js
 * ─────────────────────────────────────────────────────────────────────
 * Global keyboard hook using uiohook-napi.
 * Runs in the Electron MAIN process — intercepts keystrokes before the
 * OS processes them (where platform permissions allow).
 *
 * PLATFORM NOTES:
 *  Windows : Alt+Tab, Alt+F4, Win key, Ctrl+Esc all suppressible.
 *  macOS   : Cmd+Tab / Mission Control require Accessibility permission.
 *            Grant at: System Preferences → Privacy & Security → Accessibility
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const { BrowserWindow } = require('electron');

// Key codes used by uiohook-napi (platform-independent)
const KEY = {
  TAB:       9,
  ESCAPE:   27,
  F4:       115,
  PRINTSCR: 154,  // PrintScreen
  META_L:   3675, // Left Windows/Command key
  META_R:   3676, // Right Windows/Command key
  SPACE:    32,
  // Alt = check e.altKey / e.metaKey in the event object
};

let uiohook = null;
let _mainWindow = null;
let _onViolation = null;
let _isRunning = false;
let _interviewActive = false;

/**
 * Load uiohook-napi lazily — it's a native addon and may not be present
 * in development without a native build. Fails gracefully.
 */
function loadUiohook() {
  try {
    uiohook = require('uiohook-napi');
    return true;
  } catch (err) {
    console.warn('[KeyboardBlocker] uiohook-napi not available:', err.message);
    console.warn('[KeyboardBlocker] Install with: npm install uiohook-napi');
    return false;
  }
}

/**
 * Determines if a keydown event should be blocked.
 * @param {object} e - uiohook keyboard event
 * @returns {{ blocked: boolean, reason: string }}
 */
function shouldBlock(e) {
  const { keycode, ctrlKey, altKey, metaKey, shiftKey } = e;

  // ── Windows shortcuts ────────────────────────────────────────────────
  // Alt+Tab — task switcher
  if (altKey && keycode === KEY.TAB)
    return { blocked: true, reason: 'Alt+Tab' };

  // Alt+F4 — close window
  if (altKey && keycode === KEY.F4)
    return { blocked: true, reason: 'Alt+F4' };

  // Ctrl+Escape — Start menu
  if (ctrlKey && keycode === KEY.ESCAPE)
    return { blocked: true, reason: 'Ctrl+Esc (Start menu)' };

  // Windows Meta key alone
  if (keycode === KEY.META_L || keycode === KEY.META_R)
    return { blocked: true, reason: 'Windows/Meta key' };

  // PrintScreen
  if (keycode === KEY.PRINTSCR)
    return { blocked: true, reason: 'PrintScreen' };

  // ── macOS shortcuts ──────────────────────────────────────────────────
  // Cmd+Tab — app switcher
  if (metaKey && keycode === KEY.TAB)
    return { blocked: true, reason: 'Cmd+Tab' };

  // Cmd+Space — Spotlight
  if (metaKey && keycode === KEY.SPACE)
    return { blocked: true, reason: 'Cmd+Space (Spotlight)' };

  // Cmd+Q — quit
  if (metaKey && keycode === 81) // 'Q'
    return { blocked: true, reason: 'Cmd+Q' };

  // Cmd+W — close window
  if (metaKey && keycode === 87) // 'W'
    return { blocked: true, reason: 'Cmd+W' };

  // Cmd+M — minimize
  if (metaKey && keycode === 77) // 'M'
    return { blocked: true, reason: 'Cmd+M (Minimize)' };

  // Cmd+H — hide
  if (metaKey && keycode === 72) // 'H'
    return { blocked: true, reason: 'Cmd+H (Hide)' };

  // ── Universal suspicious shortcuts ──────────────────────────────────
  // Ctrl+Alt+Del — can only be partially suppressed on Windows
  // (this catches the combination at application level)
  if (ctrlKey && altKey && keycode === 127) // DEL
    return { blocked: true, reason: 'Ctrl+Alt+Del' };

  // F-keys that open system UI (Task Manager shortcut on Windows)
  // Ctrl+Shift+Esc
  if (ctrlKey && shiftKey && keycode === KEY.ESCAPE)
    return { blocked: true, reason: 'Ctrl+Shift+Esc (Task Manager)' };

  return { blocked: false, reason: '' };
}

/**
 * Initialize the keyboard blocker.
 * @param {BrowserWindow} mainWindow
 * @param {function} onViolation - callback(reason: string)
 */
function init(mainWindow, onViolation) {
  _mainWindow = mainWindow;
  _onViolation = onViolation;
}

/**
 * Start blocking — call when interview begins.
 */
function start() {
  if (_isRunning) return;

  if (!loadUiohook()) {
    console.warn('[KeyboardBlocker] Running without global key hook — browser-level only.');
    return;
  }

  _interviewActive = true;

  uiohook.uIOhook.on('keydown', (e) => {
    if (!_interviewActive) return;

    const { blocked, reason } = shouldBlock(e);
    if (blocked) {
      // Stop propagation — uiohook-napi supports stopPropagation on keydown
      // Note: on macOS this requires Accessibility permission to fully suppress
      e.stopPropagation?.();

      console.log(`[KeyboardBlocker] Blocked: ${reason}`);

      // Notify renderer of violation
      if (_onViolation) _onViolation(reason);

      // Re-assert window focus immediately
      if (_mainWindow && !_mainWindow.isDestroyed()) {
        _mainWindow.focus();
        _mainWindow.moveTop();
        if (process.platform === 'darwin') {
          const { app } = require('electron');
          app.focus({ steal: true });
        }
      }
    }
  });

  try {
    uiohook.uIOhook.start();
    _isRunning = true;
    console.log('[KeyboardBlocker] Global keyboard hook started.');
  } catch (err) {
    console.error('[KeyboardBlocker] Failed to start hook:', err.message);
    console.error('[KeyboardBlocker] On macOS: grant Accessibility permission.');
  }
}

/**
 * Stop blocking — call when interview ends (allow normal system use).
 */
function stop() {
  _interviewActive = false;
  if (!_isRunning || !uiohook) return;
  try {
    uiohook.uIOhook.stop();
    _isRunning = false;
    console.log('[KeyboardBlocker] Global keyboard hook stopped.');
  } catch (err) {
    console.warn('[KeyboardBlocker] Failed to stop hook:', err.message);
  }
}

module.exports = { init, start, stop };
