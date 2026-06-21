/**
 * electron/main.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Electron MAIN PROCESS — Secure Kiosk Entry Point
 *
 * Responsibilities:
 *  1. Create a fullscreen/kiosk BrowserWindow that cannot be closed/minimised
 *  2. Wire all lockdown modules (keyboard, focus, display, camera, violations)
 *  3. Bridge IPC between renderer (React) and main process
 *  4. Allow exit ONLY when interview is completed or admin unlocks the system
 *
 * DEV MODE: Lockdown is fully disabled so you can develop normally.
 *           Set NODE_ENV=production or pass --prod flag for full lockdown.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const url  = require('url');

// ── Lockdown modules ────────────────────────────────────────────────────────
const keyboardBlocker   = require('./lockdown/keyboardBlocker');
const focusEnforcer     = require('./lockdown/focusEnforcer');
const multiDisplayGuard = require('./lockdown/multiDisplayGuard');
const violationLogger   = require('./lockdown/violationLogger');
const cameraWatchdog    = require('./lockdown/cameraWatchdog');
const adminUnlock       = require('./lockdown/adminUnlock');

// ── Dev / Prod detection ─────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production' && !process.argv.includes('--prod');

// ── State ────────────────────────────────────────────────────────────────────
let mainWindow       = null;
let interviewActive  = false;
// In dev mode exit is always allowed so you can close the window normally
let exitAllowed      = isDev;
const sessionId      = `session_${Date.now()}`;

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW CREATION
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    // ── Kiosk / Display ──────────────────────────────────────────────────────
    width:            isDev ? 1280 : undefined,
    height:           isDev ? 800  : undefined,
    fullscreen:       !isDev,
    kiosk:            false,     // kiosk mode causes the freeze — disable even in prod until stable
    alwaysOnTop:      !isDev,    // don't force always-on-top during development
    frame:            isDev,     // show title bar in dev so you can close the window
    resizable:        isDev,
    movable:          isDev,
    minimizable:      isDev,
    maximizable:      true,
    closable:         true,      // always closable — we guard via 'close' event below
    // ── Security ───────────────────────────────────────────────────────────
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      contextIsolation:    true,
      nodeIntegration:     false,
      sandbox:             false,   // false so preload can use require
      devTools:            isDev,   // disable dev tools in production
      webSecurity:         true,
      allowRunningInsecureContent: false,
    },
    backgroundColor: '#0f0f23',
    show: false,    // don't flash; reveal after load
  });

  // ── Load the React app ─────────────────────────────────────────────────────
  if (isDev) {
    // Development: load from React dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load built HTML
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../build/index.html'),
        protocol: 'file:',
        slashes:  true,
      })
    );
  }

  // ── Show on ready ──────────────────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (!isDev && process.platform === 'darwin') app.focus({ steal: true });
  });

  // ── Intercept close attempts (production lockdown only) ────────────────────
  mainWindow.on('close', (e) => {
    if (!exitAllowed) {
      e.preventDefault();
      const reason = interviewActive
        ? 'Window close attempted during interview'
        : 'Window close attempted before interview completion';

      console.warn(`[Main] ${reason}`);
      violationLogger.log('CLOSE_ATTEMPT', reason);
      sendViolation('CLOSE_ATTEMPT', reason, 'high');

      // Restore focus after blocked close attempt
      mainWindow.focus();
      if (process.platform === 'darwin') app.focus({ steal: true });
    }
  });

  // ── Minimise prevention (production only) ──────────────────────────────────
  mainWindow.on('minimize', () => {
    if (!exitAllowed && !isDev) {
      mainWindow.restore();
      violationLogger.log('MINIMIZE_ATTEMPT', 'Window minimised — restored');
      sendViolation('MINIMIZE_ATTEMPT', 'Minimise blocked', 'medium');
    }
  });

  // ── Ensure always on top (production only) ─────────────────────────────────
  mainWindow.on('blur', () => {
    if (interviewActive && !isDev) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.focus();
          mainWindow.moveTop();
        }
      }, 100);
    }
  });

  // ── Init all lockdown modules ──────────────────────────────────────────────
  initLockdown();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCKDOWN INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────

function initLockdown() {
  // Violation logger — always on, logs to disk
  violationLogger.init(sessionId);

  // Violation callback used by all modules
  const onViolation = (type, reason, severity = 'high') => {
    violationLogger.log(type, reason);
    sendViolation(type, reason, severity);
  };

  if (!isDev) {
    // Keyboard blocker — activates only during interview (prod only)
    keyboardBlocker.init(mainWindow, (reason) => {
      onViolation('KEYBOARD_BLOCKED', reason, 'high');
    });

    // Focus enforcer — activates only during interview (prod only)
    focusEnforcer.init(mainWindow, (detail) => {
      onViolation('FOCUS_LOST', detail, 'medium');
    });

    // Multi-display guard — active from app start (prod only)
    multiDisplayGuard.init(mainWindow, ({ count, blocked }) => {
      console.log(`[Main] Display change: ${count} displays, blocked=${blocked}`);
      if (blocked) {
        onViolation('MULTI_DISPLAY', `${count} displays detected`, 'critical');
      }
    });
    multiDisplayGuard.start();

    // Camera watchdog — activates during interview (prod only)
    cameraWatchdog.init(
      mainWindow,
      () => {
        // Camera lost
        onViolation('CAMERA_LOST', 'Camera stream lost — interview paused', 'critical');
        mainWindow.webContents.send('security:cameraLost', { paused: true });
      },
      () => {
        // Camera restored
        console.log('[Main] Camera restored.');
        mainWindow.webContents.send('security:cameraRestored', { paused: false });
      }
    );
  } else {
    console.log('[Main] DEV MODE — all lockdown modules disabled. Close the window normally.');
  }

  // Admin unlock module — available in all modes
  adminUnlock.init(mainWindow, () => {
    // Unlock granted callback
    console.log('[Main] Admin unlock granted — allowing exit.');
    exitAllowed  = true;
    interviewActive = false;
    if (!isDev) {
      keyboardBlocker.stop();
      focusEnforcer.stop();
      cameraWatchdog.stop();
    }
    violationLogger.flush();
    mainWindow.webContents.send('security:unlockGranted');
    // Give React a moment to clean up, then quit
    setTimeout(() => app.quit(), 800);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderer signals that the interview has started.
 * Activates all blocking systems (production only).
 */
ipcMain.on('interview:started', (event, data) => {
  console.log('[Main] Interview started — activating lockdown.');
  interviewActive = true;
  exitAllowed     = isDev; // in dev, always allowed; in prod, block

  violationLogger.log('INTERVIEW_START', `Interview started. Session: ${sessionId}`);

  if (!isDev) {
    // Enforce fullscreen / kiosk
    if (!mainWindow.isFullScreen()) mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    // Activate blocking
    keyboardBlocker.start();
    focusEnforcer.start();
    cameraWatchdog.start();
  }
});

/**
 * Renderer signals that the interview has ended normally.
 * Releases all locks and allows a clean exit.
 */
ipcMain.on('interview:ended', (event, data) => {
  console.log('[Main] Interview ended — releasing lockdown.');
  interviewActive = false;
  exitAllowed     = true;

  violationLogger.log('INTERVIEW_END', 'Interview completed successfully.');
  violationLogger.flush();

  if (!isDev) {
    keyboardBlocker.stop();
    focusEnforcer.stop();
    cameraWatchdog.stop();

    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
  }

  // Navigate to results is handled by React; just release the OS-level locks
});

/**
 * Renderer requests admin unlock (Shift+Ctrl+Alt+X or admin modal).
 */
ipcMain.on('security:requestAdminUnlock', () => {
  console.log('[Main] Admin unlock requested.');
  adminUnlock.prompt();
});

/**
 * Renderer queries current display count.
 */
ipcMain.handle('security:getDisplayCount', () => {
  if (isDev) return 1;
  return multiDisplayGuard.getCount();
});

/**
 * Renderer queries whether interview is currently locked.
 */
ipcMain.handle('security:isLocked', () => {
  return interviewActive && !isDev;
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sendViolation(type, reason, severity = 'medium') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('security:violation', {
      type,
      reason,
      severity,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: app.enableSandbox() was removed — it conflicted with sandbox:false in
// webPreferences and caused load hangs. Electron's contextIsolation + CSP
// provides equivalent security without the deadlock risk.

// Prevent second instance (single-instance lock)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// Override before-quit: block only in production when interview is active
app.on('before-quit', (e) => {
  if (!isDev && !exitAllowed) {
    e.preventDefault();
    const reason = 'App quit attempt blocked — interview still active';
    console.warn(`[Main] ${reason}`);
    violationLogger.log('QUIT_ATTEMPT', reason);
    sendViolation('QUIT_ATTEMPT', reason, 'critical');
  } else {
    // Flush logs before final exit
    try { violationLogger.flush(); } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || exitAllowed || isDev) {
    app.quit();
  }
});
