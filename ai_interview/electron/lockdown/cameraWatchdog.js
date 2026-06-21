/**
 * electron/lockdown/cameraWatchdog.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitors camera health during the interview via IPC with the renderer.
 *
 * Strategy:
 *  1. Renderer periodically sends camera track state via IPC
 *  2. Watchdog also polls independently every 3 seconds as a fallback
 *  3. If camera goes offline → fires onLost callback → interview pauses
 *  4. When camera comes back → fires onRestored callback
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { ipcMain } = require('electron');

let _mainWindow   = null;
let _onLost       = null;
let _onRestored   = null;
let _isRunning    = false;
let _cameraOnline = true;    // optimistic: assume camera is on
let _pollInterval = null;
let _lostCount    = 0;       // consecutive "lost" reports before escalating

const POLL_MS           = 3_000;
const CONSECUTIVE_GRACE = 2;   // allow 2 consecutive polls to miss before declaring lost

/**
 * Initialise the watchdog.
 * @param {BrowserWindow} mainWindow
 * @param {function} onLost      - called when camera stream is lost
 * @param {function} onRestored  - called when camera stream comes back
 */
function init(mainWindow, onLost, onRestored) {
  _mainWindow  = mainWindow;
  _onLost      = onLost;
  _onRestored  = onRestored;

  // Listen for camera state reports sent FROM the renderer
  ipcMain.on('camera:stateUpdate', (_event, { online }) => {
    _handleStateReport(online);
  });
}

/**
 * Start polling — call when interview begins.
 */
function start() {
  if (_isRunning) return;
  _isRunning    = true;
  _cameraOnline = true;
  _lostCount    = 0;

  // Request an immediate report from the renderer
  _requestRendererReport();

  // Periodic poll
  _pollInterval = setInterval(() => {
    _requestRendererReport();
  }, POLL_MS);

  console.log('[CameraWatchdog] Started.');
}

/**
 * Stop polling — call when interview ends.
 */
function stop() {
  _isRunning = false;
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  console.log('[CameraWatchdog] Stopped.');
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _requestRendererReport() {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send('camera:requestState');
  }
}

function _handleStateReport(online) {
  if (!_isRunning) return;

  if (online) {
    _lostCount = 0;
    if (!_cameraOnline) {
      // Camera has come back
      _cameraOnline = true;
      console.log('[CameraWatchdog] Camera restored.');
      if (_onRestored) _onRestored();
    }
  } else {
    _lostCount++;
    if (_lostCount >= CONSECUTIVE_GRACE && _cameraOnline) {
      // Camera has been lost for (CONSECUTIVE_GRACE × POLL_MS) seconds
      _cameraOnline = false;
      console.warn('[CameraWatchdog] Camera lost!');
      if (_onLost) _onLost();
    }
  }
}

module.exports = { init, start, stop };
