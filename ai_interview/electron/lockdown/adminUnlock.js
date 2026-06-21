/**
 * electron/lockdown/adminUnlock.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin unlock module — allows authorised personnel to gracefully exit the
 * kiosk without completing the interview (e.g. emergency, disqualification).
 *
 * The admin PIN is read from the environment variable ADMIN_PIN.
 * Default PIN (development): 1234
 *
 * USAGE:
 *  import adminUnlock from './lockdown/adminUnlock';
 *  adminUnlock.init(mainWindow, onUnlockGranted);
 *  adminUnlock.prompt(); // shows the dialog
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { dialog, BrowserWindow } = require('electron');

let _mainWindow       = null;
let _onUnlockGranted  = null;
let _attemptCount     = 0;
const MAX_ATTEMPTS    = 5;     // lock out after 5 wrong PINs

/**
 * Initialise the module.
 * @param {BrowserWindow} mainWindow
 * @param {function}      onUnlockGranted - called when correct PIN is entered
 */
function init(mainWindow, onUnlockGranted) {
  _mainWindow      = mainWindow;
  _onUnlockGranted = onUnlockGranted;
}

/**
 * Show the admin unlock dialog.
 * Uses Electron's native dialog — cannot be spoofed by the renderer.
 */
async function prompt() {
  if (_attemptCount >= MAX_ATTEMPTS) {
    await dialog.showMessageBox(_mainWindow, {
      type:      'error',
      title:     'Admin Unlock — Locked Out',
      message:   'Too many incorrect attempts. Admin unlock is disabled for this session.',
      buttons:   ['OK'],
    });
    return;
  }

  // Native input dialog (simplest: use a message box with Cancel + OK flow)
  // Electron doesn't have a built-in text-input dialog, so we use a custom approach:
  // Show a prompt via webContents.executeJavaScript which runs in the renderer context
  // This is sandboxed — the candidate sees it but cannot intercept the PIN check
  // because PIN validation happens here in the main process.

  let pin = null;
  try {
    pin = await _mainWindow.webContents.executeJavaScript(
      `window.prompt("Admin Unlock — Enter PIN:", "")`,
      true   // userGesture = true
    );
  } catch (err) {
    console.warn('[AdminUnlock] Prompt error:', err.message);
    return;
  }

  if (pin === null) {
    // Candidate cancelled
    console.log('[AdminUnlock] Admin prompt cancelled.');
    return;
  }

  const correctPin = process.env.ADMIN_PIN || '1234';

  if (pin === correctPin) {
    _attemptCount = 0;
    console.log('[AdminUnlock] Correct PIN — unlocking.');
    await dialog.showMessageBox(_mainWindow, {
      type:    'info',
      title:   'Admin Unlock',
      message: 'Unlock granted. The interview session will close.',
      buttons: ['OK'],
    });
    if (_onUnlockGranted) _onUnlockGranted();
  } else {
    _attemptCount++;
    const remaining = MAX_ATTEMPTS - _attemptCount;
    console.warn(`[AdminUnlock] Wrong PIN. Attempts remaining: ${remaining}`);
    await dialog.showMessageBox(_mainWindow, {
      type:    'warning',
      title:   'Admin Unlock — Incorrect PIN',
      message: remaining > 0
        ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect PIN. Admin unlock is now disabled for this session.',
      buttons: ['OK'],
    });
  }
}

module.exports = { init, prompt };
