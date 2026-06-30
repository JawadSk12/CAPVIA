/**
 * useBrowserFaceDetection.ts — Production v6.0
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ENGINEERING NOTES
 * ═══════════════════════════════════════════════════════════════════════
 *
 * WHY THE PREVIOUS VERSION FAILED:
 *  1. EMA α=0.30  → head pose needs 5+ frames to reach threshold (3.5s lag)
 *  2. HIST 5/3    → gaze needs 3 of 5 frames + hold time = 4–5s to trigger
 *  3. 700ms poll  → only 1.4 fps, detection was sluggish
 *  4. Gaze used head pose when head off-centre → head turn = eye event too
 *  5. Calibration 15 frames × 700ms = 10s before detection even starts
 *
 * HOW THIS VERSION FIXES IT:
 *  1. EMA α=0.55  → head reaches threshold in ~2 frames (~500ms at 250ms poll)
 *  2. HIST 3/2    → gaze needs 2 consecutive frames + 2s hold (true 2s detection)
 *  3. 250ms poll  → 4 fps, 4× more responsive
 *  4. Iris always used for gaze; head only for head counters (fully decoupled)
 *  5. Calibration 8 frames × 250ms = 2s before detection starts
 *
 * IRIS RATIO CONVENTION (verified for raw/non-mirrored webcam feed):
 *  Left eye (outer=33, inner=133):
 *    ratio = (iris.x - inner.x) / (outer.x - inner.x)
 *    outer is image-right (large x), inner is image-left (small x)
 *    → 0 when iris far left, 1 when far right
 *
 *  Right eye (outer=263, inner=362):
 *    ratio = (iris.x - outer.x) / (inner.x - outer.x)
 *    outer is image-left (small x), inner is image-right (large x)
 *    → 0 when iris far left, 1 when far right
 *
 *  Both eyes: low ratio → looking LEFT, high ratio → looking RIGHT ✓
 *
 * HEAD YAW CONVENTION (mirror-agnostic via distance asymmetry):
 *  d_L = |nose.x - left_cheek.x|
 *  d_R = |nose.x - right_cheek.x|
 *  asymmetry = (d_R - d_L) / (d_R + d_L) × 90
 *  Positive → user turned LEFT (left side foreshortens → d_L decreases)
 *  Negative → user turned RIGHT
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Public types ─────────────────────────────────────────────────────────────

export interface BrowserDetectionResult {
  faceCount: number;
  gazeDirection: 'LEFT' | 'CENTER' | 'RIGHT' | 'DOWN' | 'UP' | null;
  gazeRatio: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  isLookingAway: boolean;
  isHeadTurned: boolean;
  isMultipleFaces: boolean;
  phoneVisible: boolean;
}

export interface BrowserCounters {
  gazeLeftCount: number;
  gazeRightCount: number;
  gazeDownCount: number;
  gazeCenterCount: number;
  totalLookAways: number;
  headYawLeftCount: number;
  headYawRightCount: number;
  headPitchUpCount: number;
  headPitchDownCount: number;
  totalHeadTurns: number;
  faceAbsenceCount: number;
  multiFaceCount: number;
  phoneDetectedCount: number;
  lookDownViolations: number;
  totalFrames: number;
}

export interface BrowserDetectionState {
  isReady: boolean;
  isRunning: boolean;
  currentResult: BrowserDetectionResult | null;
  counters: BrowserCounters;
  integrityScore: number;
}

// ── MediaPipe landmark indices ────────────────────────────────────────────────
const LM = {
  NOSE_TIP: 1,
  LEFT_CHEEK: 234,   // face's left cheek → image RIGHT in raw (larger x)
  RIGHT_CHEEK: 454,   // face's right cheek → image LEFT in raw (smaller x)
  FOREHEAD: 10,
  CHIN: 152,
  // Left eye
  LEFT_EYE_OUTER: 33,    // temporal corner → image RIGHT (larger x)
  LEFT_EYE_INNER: 133,   // nasal corner    → image LEFT  (smaller x)
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOT: 145,
  LEFT_IRIS: 468,
  // Right eye
  RIGHT_EYE_OUTER: 263,   // temporal corner → image LEFT  (smaller x)
  RIGHT_EYE_INNER: 362,   // nasal corner    → image RIGHT (larger x)
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOT: 374,
  RIGHT_IRIS: 473,
} as const;

// ── Detection constants ───────────────────────────────────────────────────────

// Head pose thresholds (degrees equivalent)
const YAW_THRESHOLD = 16;  // head turn left/right
const PITCH_THRESHOLD = 13;  // head tilt up/down
const ROLL_THRESHOLD = 18;

// Iris gaze thresholds
// Widened LEFT/RIGHT from 0.43/0.57 → 0.38/0.62 to stop natural micro-movements
// from being flagged when the candidate is looking at the center of the screen.
const GAZE_LEFT_T  = 0.38;  // iris ratio < 0.38 → clearly looking LEFT
const GAZE_RIGHT_T = 0.62;  // iris ratio > 0.62 → clearly looking RIGHT
// Iris vertical — secondary signal only (eyelid drooping makes it unreliable for DOWN)
const GAZE_DOWN_T  = 0.73;  // vRatio > 0.73 → extreme iris-based DOWN
const GAZE_UP_T    = 0.32;  // vRatio < 0.32 → iris clearly raised upward

// Head pitch gaze thresholds — PRIMARY signal for UP/DOWN (more reliable than iris).
// When looking at keyboard: head tilts down → headPitch goes NEGATIVE.
// computePitch convention: positive = head UP, negative = head DOWN.
const HEAD_GAZE_DOWN_T = -8;  // pitch < -8° → head clearly tilted toward keyboard/notes
const HEAD_GAZE_UP_T   =  8;  // pitch >  8° → head raised (looking above screen)

// EMA: α=0.55 → reaches threshold in ~2 frames at 250ms poll
const EMA_ALPHA = 0.55;

// Calibration: 8 frames × 250ms = 2s warmup
const CALIB_FRAMES = 8;

// Majority vote: 2 of 3 consecutive frames must agree
const HIST_LEN = 3;
const HIST_NEEDED = 2;

// Minimum ms before the WARNING BANNER shows for LEFT/RIGHT gaze deviation.
// DOWN gaze never triggers this banner (reading the on-screen question is normal).
const BANNER_MIN_MS = 1000;   // 1s  → banner shows quickly so candidate is alerted fast
const GAZE_HOLD_MS = 1000;   // 1s → violation counted after 1s of sustained deviation
const HEAD_HOLD_MS = 700;    // head must be turned for 700ms before counting
const LOOK_DOWN_VIOL_MS = 3000;   // 3s+ of extreme downward gaze = phone/notes cheat
const MULTI_FACE_HOLD_MS = 1500;  // 2nd face must be present for 1.5s before counting

// Face absence: 1 frame triggers immediately (catches hand-covering-face)
const ABSENCE_MIN_FRAMES = 1;

// Phone detection check every N frames
const PHONE_EVERY = 3;

// ── Geometry helpers ──────────────────────────────────────────────────────────

type P3 = { x: number; y: number; z: number };
const lm = (pts: P3[], i: number): P3 => pts[i];

/** Iris horizontal ratio within eye corners (both eyes: 0=left, 1=right) */
function irisH_Left(iris: P3, outer: P3, inner: P3): number {
  // outer = LM 33 (larger x), inner = LM 133 (smaller x)
  const w = Math.abs(outer.x - inner.x);
  if (w < 0.004) return 0.5;
  return Math.max(0, Math.min(1, (iris.x - inner.x) / (outer.x - inner.x)));
}

function irisH_Right(iris: P3, outer: P3, inner: P3): number {
  // outer = LM 263 (smaller x), inner = LM 362 (larger x)
  const w = Math.abs(inner.x - outer.x);
  if (w < 0.004) return 0.5;
  return Math.max(0, Math.min(1, (iris.x - outer.x) / (inner.x - outer.x)));
}

/** Iris vertical ratio within eyelid (0=top, 1=bottom) */
function irisV(iris: P3, top: P3, bot: P3): number {
  const h = Math.abs(bot.y - top.y);
  if (h < 0.003) return 0.5;
  const lo = Math.min(top.y, bot.y);
  return Math.max(0, Math.min(1, (iris.y - lo) / h));
}

/**
 * Yaw from nose-to-cheek distance asymmetry.
 * Mirror-agnostic: works regardless of whether feed is raw or mirrored.
 * Positive = head turned LEFT, Negative = head turned RIGHT.
 */
function computeYaw(pts: P3[]): number {
  const nose = lm(pts, LM.NOSE_TIP);
  const lc = lm(pts, LM.LEFT_CHEEK);
  const rc = lm(pts, LM.RIGHT_CHEEK);
  const dL = Math.abs(nose.x - lc.x);
  const dR = Math.abs(nose.x - rc.x);
  const total = dL + dR;
  if (total < 0.01) return 0;
  // When head turns LEFT: left side foreshortens (dL↓), right extends (dR↑) → positive
  return ((dR - dL) / total) * 90;
}

/**
 * Pitch: positive = head UP, negative = head DOWN.
 * neutral is calibrated in the first CALIB_FRAMES.
 */
function computePitch(pts: P3[], neutral: number): number {
  const nose = lm(pts, LM.NOSE_TIP);
  const fh = lm(pts, LM.FOREHEAD);
  const chin = lm(pts, LM.CHIN);
  const h = Math.abs(chin.y - fh.y);
  if (h < 0.01) return 0;
  const ratio = (nose.y - Math.min(fh.y, chin.y)) / h;
  return (neutral - ratio) * 90; // positive = head UP
}

/** Roll from eye line slope */
function computeRoll(pts: P3[]): number {
  const lo = lm(pts, LM.LEFT_EYE_OUTER);
  const ro = lm(pts, LM.RIGHT_EYE_OUTER);
  return Math.atan2(ro.y - lo.y, ro.x - lo.x) * (180 / Math.PI);
}

// ── Majority vote ─────────────────────────────────────────────────────────────

type GazeDir = 'LEFT' | 'CENTER' | 'RIGHT' | 'DOWN' | 'UP';

function majorityVote(hist: GazeDir[], need: number): GazeDir {
  if (hist.length === 0) return 'CENTER';
  const cnt: Partial<Record<GazeDir, number>> = {};
  for (const g of hist) cnt[g] = (cnt[g] ?? 0) + 1;
  for (const d of ['DOWN', 'LEFT', 'RIGHT', 'UP'] as GazeDir[]) {
    if ((cnt[d] ?? 0) >= need) return d;
  }
  return 'CENTER';
}

// ── Integrity score ───────────────────────────────────────────────────────────

const ZERO_C = (): BrowserCounters => ({
  gazeLeftCount: 0, gazeRightCount: 0, gazeDownCount: 0, gazeCenterCount: 0,
  totalLookAways: 0,
  headYawLeftCount: 0, headYawRightCount: 0,
  headPitchUpCount: 0, headPitchDownCount: 0, totalHeadTurns: 0,
  faceAbsenceCount: 0, multiFaceCount: 0,
  phoneDetectedCount: 0, lookDownViolations: 0, totalFrames: 0,
});

function computeScore(c: BrowserCounters): number {
  // Grace allowances: a few brief glances are normal in any interview
  const lookPen = c.totalLookAways <= 3 ? 0 : Math.min(30, (c.totalLookAways - 3) * 4);
  const headPen = c.totalHeadTurns <= 4 ? 0 : Math.min(20, (c.totalHeadTurns - 4) * 2);
  const absPen = c.faceAbsenceCount <= 1 ? 0 : Math.min(30, (c.faceAbsenceCount - 1) * 7);
  const multPen = Math.min(30, c.multiFaceCount * 10);
  const phonePen = c.phoneDetectedCount === 0 ? 0 : Math.min(50, 25 + (c.phoneDetectedCount - 1) * 10);
  const downPen = Math.min(40, c.lookDownViolations * 13);
  return Math.max(0, Math.round(100 - lookPen - headPen - absPen - multPen - phonePen - downPen));
}

// ── CDN / Singleton loaders ───────────────────────────────────────────────────

let cdnP: Promise<void> | null = null;
function loadFaceMeshCDN(): Promise<void> {
  if ((window as any).FaceMesh) return Promise.resolve();
  if (cdnP) return cdnP;
  const load = (url: string) => new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.crossOrigin = 'anonymous';
    s.onload = () => res(); s.onerror = () => rej();
    document.head.appendChild(s);
  });
  cdnP = load('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js')
    .catch(() => load('https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js'));
  return cdnP;
}

let fmSingleton: any = null;
let fmInitP: Promise<any> | null = null;

function getFaceMesh(onResults: (r: any) => void): Promise<any> {
  if (fmSingleton) { fmSingleton.onResults(onResults); return Promise.resolve(fmSingleton); }
  if (fmInitP) return fmInitP.then(fm => { fm.onResults(onResults); return fm; });
  fmInitP = (async () => {
    await loadFaceMeshCDN();
    const FM = (window as any).FaceMesh;
    if (!FM) throw new Error('FaceMesh not loaded');
    const fm = new FM({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`,
    });
    fm.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,   // REQUIRED for iris landmarks 468-477
      minDetectionConfidence: 0.4,  // lowered: 0.6 was too strict — missed 2nd face
      minTrackingConfidence: 0.5,
    });
    fm.onResults(onResults);
    await fm.initialize();
    fmSingleton = fm;
    console.log('[FaceDet v6] MediaPipe FaceMesh ready (refineLandmarks enabled)');
    return fm;
  })();
  return fmInitP;
}

let cocoP: Promise<any | null> | null = null;
function loadCocoSSD(): Promise<any | null> {
  if (cocoP) return cocoP;
  cocoP = (async () => {
    try {
      if (!(window as any).tf) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
          s.crossOrigin = 'anonymous'; s.onload = () => res(); s.onerror = () => rej(new Error('tf'));
          document.head.appendChild(s);
        });
        await new Promise(r => setTimeout(r, 800));
      }
      if (!(window as any).cocoSsd) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
          s.crossOrigin = 'anonymous'; s.onload = () => res();
          s.onerror = () => {
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
            s2.crossOrigin = 'anonymous'; s2.onload = () => res(); s2.onerror = () => rej();
            document.head.appendChild(s2);
          };
          document.head.appendChild(s);
        });
        await new Promise(r => setTimeout(r, 500));
      }
      const m = await (window as any).cocoSsd.load({ base: 'mobilenet_v2' });
      console.log('[FaceDet v6] COCO-SSD ready');
      return m;
    } catch (e) { console.warn('[FaceDet v6] COCO-SSD unavailable:', e); return null; }
  })();
  return cocoP;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBrowserFaceDetection() {
  const [state, setState] = useState<BrowserDetectionState>({
    isReady: false, isRunning: false,
    currentResult: null, counters: ZERO_C(), integrityScore: 100,
  });

  // Service refs
  const fmRef = useRef<any>(null);
  const cocoRef = useRef<any>(null);
  const ivlRef = useRef<number | null>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const frameNum = useRef(0);
  const phoneRunning = useRef(false);
  const phoneConfirmedFrames = useRef(0);  // consecutive frames confirming phone before flagging

  // Previous state
  const prevFC = useRef(1);
  const prevPhone = useRef(false);
  const consAbsence = useRef(0);   // consecutive frames with no face

  // Multi-face episode (time-based, same pattern as gaze hold)
  const multiFaceStart = useRef<number | null>(null);
  const multiFaceCounted = useRef(false);

  // EMA state
  const emaYaw = useRef<number | null>(null);
  const emaPitch = useRef<number | null>(null);
  const emaRoll = useRef<number | null>(null);

  // Pitch calibration
  const pitchNeutral = useRef(0.47);
  const pitchCalibBuf = useRef<number[]>([]);
  const pitchCalibDone = useRef(false);

  // Iris calibration — HORIZONTAL only.
  // Vertical is NOT calibrated because the eyelid-droop effect means
  // the irisV reading does not linearly track gaze angle downward.
  // Head pitch is the primary DOWN signal instead.
  const irisNeutral    = useRef(0.5);
  const irisCalibBuf   = useRef<number[]>([]);
  const irisCalibDone  = useRef(false);

  // Gaze vote history
  const gazeHist = useRef<GazeDir[]>([]);

  // Gaze episode (time-based 2s hold)
  const gazeEpDir = useRef<GazeDir | null>(null);
  const gazeEpStart = useRef<number>(0);
  const gazeEpCounted = useRef(false);

  // Head-turn episodes (key: 'YL' | 'YR' | 'PU' | 'PD')
  type HK = 'YL' | 'YR' | 'PU' | 'PD';
  const headStart = useRef<Partial<Record<HK, number>>>({});
  const headCounted = useRef<Partial<Record<HK, boolean>>>({});

  // Look-down sustained
  const lookDownStart = useRef<number | null>(null);

  // ── Phone detection ─────────────────────────────────────────────────────────
  // Only 'cell phone' is checked — 'remote' and 'book' caused false positives
  // when a hand or arm was in front of the camera.
  // Threshold 0.65 is high enough to block misclassified hands.
  // 2 consecutive confirmed detections required before flagging (debounce).
  const runPhoneDetection = useCallback(async (vid: HTMLVideoElement) => {
    if (!cocoRef.current || phoneRunning.current) return;
    if (!vid.videoWidth || !vid.videoHeight) return;
    phoneRunning.current = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
      canvas.getContext('2d')!.drawImage(vid, 0, 0);
      const preds: any[] = await cocoRef.current.detect(canvas);

      // Phone detection strategy:
      //  'cell phone' at 0.38 — COCO-SSD scores real phones 0.38–0.75 on webcam.
      //  'remote'     at 0.50 — phones sometimes classified as remote; hands score ~0.25.
      //  'book' is excluded — it was the primary cause of hand false positives.
      //  Hands typically score 0.18–0.30, so these thresholds reliably block them.
      const rawFound = preds.some((p: any) =>
        (p.class === 'cell phone' && p.score > 0.38) ||
        (p.class === 'remote' && p.score > 0.50)
      );

      // Log top predictions to help tuning (every detection run)
      if (preds.length > 0) {
        const top = preds.slice(0, 3).map((p: any) => `${p.class}:${p.score.toFixed(2)}`).join(', ');
        console.log(`[FaceDet v6] COCO top: ${top}`);
      }

      if (rawFound) {
        phoneConfirmedFrames.current += 1;
      } else {
        phoneConfirmedFrames.current = 0;
      }

      // Require 2 consecutive confirmed frames to avoid single-frame spurious detections
      const debounced = phoneConfirmedFrames.current >= 2;

      if (debounced !== prevPhone.current) {
        prevPhone.current = debounced;
        setState(prev => {
          const c = { ...prev.counters };
          if (debounced) {
            c.phoneDetectedCount += 1;
            console.log('[FaceDet v6] 📱 PHONE CONFIRMED (2 consecutive frames)');
          }
          const res = prev.currentResult
            ? { ...prev.currentResult, phoneVisible: debounced } : null;
          return { ...prev, currentResult: res, counters: c, integrityScore: computeScore(c) };
        });
      }
    } catch (e) {
      console.warn('[FaceDet v6] phone err:', e);
    } finally {
      phoneRunning.current = false;
    }
  }, []);

  // ── Main frame handler ──────────────────────────────────────────────────────
  const handleResults = useCallback((results: any) => {
    const now = Date.now();
    const fn = frameNum.current;
    const faces = (results.multiFaceLandmarks ?? []) as P3[][];
    const faceCount = faces.length;

    let dGazeLeft = 0, dGazeRight = 0, dGazeDown = 0, dGazeCenter = 0;
    let dTotalLookAways = 0;
    let dYL = 0, dYR = 0, dPU = 0, dPD = 0, dTotalHead = 0;
    let dAbsence = 0, dMulti = 0, dDownViol = 0;

    let result: BrowserDetectionResult = {
      faceCount,
      gazeDirection: null, gazeRatio: 0.5,
      headYaw: 0, headPitch: 0, headRoll: 0,
      isLookingAway: false,
      isHeadTurned: false,
      isMultipleFaces: faceCount > 1,
      phoneVisible: prevPhone.current,
    };

    if (faceCount > 0) {
      const pts = faces[0];
      const hasIris = pts.length > LM.LEFT_IRIS;  // 468+ = refineLandmarks working

      // ── Pitch calibration ──────────────────────────────────────────────────
      if (!pitchCalibDone.current) {
        const nose = lm(pts, LM.NOSE_TIP);
        const fh = lm(pts, LM.FOREHEAD);
        const chin = lm(pts, LM.CHIN);
        const h = Math.abs(chin.y - fh.y);
        if (h > 0.01) {
          pitchCalibBuf.current.push((nose.y - Math.min(fh.y, chin.y)) / h);
          if (pitchCalibBuf.current.length >= CALIB_FRAMES) {
            const s = [...pitchCalibBuf.current].sort((a, b) => a - b);
            pitchNeutral.current = s[Math.floor(s.length / 2)];
            pitchCalibDone.current = true;
            console.log(`[FaceDet v6] Pitch neutral calibrated: ${pitchNeutral.current.toFixed(3)}`);
          }
        }
      }

      // ── Head pose (EMA α=0.55 for fast response) ───────────────────────────
      const rawYaw = computeYaw(pts);
      const rawPitch = computePitch(pts, pitchNeutral.current);
      const rawRoll = computeRoll(pts);

      emaYaw.current = emaYaw.current == null ? rawYaw : EMA_ALPHA * rawYaw + (1 - EMA_ALPHA) * emaYaw.current;
      emaPitch.current = emaPitch.current == null ? rawPitch : EMA_ALPHA * rawPitch + (1 - EMA_ALPHA) * emaPitch.current;
      emaRoll.current = emaRoll.current == null ? rawRoll : EMA_ALPHA * rawRoll + (1 - EMA_ALPHA) * emaRoll.current;

      const headYaw = Math.round(emaYaw.current * 10) / 10;
      const headPitch = Math.round(emaPitch.current * 10) / 10;
      const headRoll = Math.round(emaRoll.current * 10) / 10;

      const isHeadTurned = Math.abs(headYaw) > YAW_THRESHOLD
        || Math.abs(headPitch) > PITCH_THRESHOLD
        || Math.abs(headRoll) > ROLL_THRESHOLD;

      // ── Iris calibration (only when head is roughly forward) ───────────────
      const headForward = Math.abs(headYaw) < 12 && Math.abs(headPitch) < 10;
      if (!irisCalibDone.current && headForward && hasIris) {
        const lH = irisH_Left(
          lm(pts, LM.LEFT_IRIS), lm(pts, LM.LEFT_EYE_OUTER), lm(pts, LM.LEFT_EYE_INNER)
        );
        const rH = irisH_Right(
          lm(pts, LM.RIGHT_IRIS), lm(pts, LM.RIGHT_EYE_OUTER), lm(pts, LM.RIGHT_EYE_INNER)
        );
        const avgH = (lH + rH) / 2;
        if (avgH > 0.15 && avgH < 0.85) {
          irisCalibBuf.current.push(avgH);
          if (irisCalibBuf.current.length >= CALIB_FRAMES) {
            const s = [...irisCalibBuf.current].sort((a, b) => a - b);
            irisNeutral.current = Math.max(0.38, Math.min(0.62, s[Math.floor(s.length / 2)]));
            irisCalibDone.current = true;
            console.log(`[FaceDet v6] Iris H-neutral: ${irisNeutral.current.toFixed(3)}`);
          }
        }
      }

      // ── Gaze via iris (ALWAYS iris-first, head pose is independent) ────────
      let rawGaze: GazeDir = 'CENTER';

      if (hasIris) {
        const lH = irisH_Left(
          lm(pts, LM.LEFT_IRIS), lm(pts, LM.LEFT_EYE_OUTER), lm(pts, LM.LEFT_EYE_INNER)
        );
        const rH = irisH_Right(
          lm(pts, LM.RIGHT_IRIS), lm(pts, LM.RIGHT_EYE_OUTER), lm(pts, LM.RIGHT_EYE_INNER)
        );
        const hRatio = (lH + rH) / 2;

        const lV = irisV(lm(pts, LM.LEFT_IRIS), lm(pts, LM.LEFT_EYE_TOP), lm(pts, LM.LEFT_EYE_BOT));
        const rV = irisV(lm(pts, LM.RIGHT_IRIS), lm(pts, LM.RIGHT_EYE_TOP), lm(pts, LM.RIGHT_EYE_BOT));
        const vRatio = (lV + rV) / 2;

        // Horizontal calibration offset (per-person)
        const hOffset = irisNeutral.current - 0.5;
        const leftT  = GAZE_LEFT_T  + hOffset;
        const rightT = GAZE_RIGHT_T + hOffset;

        // Combined DOWN/UP detection:
        //   PRIMARY:   head pitch (reliable — tracks actual head tilt toward keyboard)
        //   SECONDARY: iris vertical ratio (unreliable alone due to eyelid drooping)
        // A candidate looking at their keyboard will ALWAYS tilt their head down.
        const isGazeDown = vRatio > GAZE_DOWN_T || headPitch < HEAD_GAZE_DOWN_T;
        const isGazeUp   = vRatio < GAZE_UP_T   || headPitch > HEAD_GAZE_UP_T;

        // Priority: L/R first (common lateral cheating), then D/U
        if      (hRatio < leftT) rawGaze = 'LEFT';
        else if (hRatio > rightT) rawGaze = 'RIGHT';
        else if (isGazeDown)      rawGaze = 'DOWN';
        else if (isGazeUp)        rawGaze = 'UP';
        else                      rawGaze = 'CENTER';

        result = { ...result, gazeRatio: hRatio };

        // Debug every 8 frames — shows both iris and head pitch values
        if (fn % 8 === 0) {
          console.log(
            `[FaceDet v6] IRIS hR=${hRatio.toFixed(3)} vR=${vRatio.toFixed(3)} ` +
            `L<${leftT.toFixed(3)} R>${rightT.toFixed(3)} ` +
            `DOWN(iris>${GAZE_DOWN_T}|pitch<${HEAD_GAZE_DOWN_T})=${isGazeDown} ` +
            `UP(iris<${GAZE_UP_T}|pitch>${HEAD_GAZE_UP_T})=${isGazeUp} ` +
            `→ ${rawGaze} | pitch=${headPitch.toFixed(1)}° yaw=${headYaw.toFixed(1)}°`
          );
        }
      } else {
        // Fallback: no iris → use head pose for rough gaze estimate
        console.warn('[FaceDet v6] No iris landmarks! refineLandmarks may not be working.');
        if (headYaw > 12) rawGaze = 'LEFT';
        else if (headYaw < -12) rawGaze = 'RIGHT';
        else if (headPitch < -10) rawGaze = 'DOWN';
        else if (headPitch > 10) rawGaze = 'UP';
      }

      // ── 2-of-3 majority vote for stable gaze ───────────────────────────────
      gazeHist.current.push(rawGaze);
      if (gazeHist.current.length > HIST_LEN) gazeHist.current.shift();
      const votedGaze = majorityVote(gazeHist.current, HIST_NEEDED);

      // ── Time-based gaze counting ───────────────────────────────────────────
      // DOWN is intentionally excluded from the normal look-away counter.
      // Reading the on-screen question requires looking slightly down — we don't
      // penalise that. DOWN is only penalised after LOOK_DOWN_VIOL_MS (6s sustained),
      // which is the signature of using a phone or notes below the desk.
      if (votedGaze === 'CENTER') {
        dGazeCenter = 1;
        gazeEpDir.current = null;
        gazeEpCounted.current = false;
      } else if (votedGaze === 'LEFT' || votedGaze === 'RIGHT') {
        // LEFT / RIGHT: count as look-away after GAZE_HOLD_MS
        if (gazeEpDir.current !== votedGaze) {
          gazeEpDir.current = votedGaze;
          gazeEpStart.current = now;
          gazeEpCounted.current = false;
        } else if (!gazeEpCounted.current &&
          now - gazeEpStart.current >= GAZE_HOLD_MS) {
          gazeEpCounted.current = true;
          dTotalLookAways = 1;
          if (votedGaze === 'LEFT') dGazeLeft = 1;
          if (votedGaze === 'RIGHT') dGazeRight = 1;
          console.log(`[FaceDet v6] 👁️ GAZE VIOLATION: ${votedGaze} (held ${Math.round(now - gazeEpStart.current)}ms)`);
        }
      } else {
        // UP or DOWN — reset the L/R episode tracker
        if (gazeEpDir.current === 'LEFT' || gazeEpDir.current === 'RIGHT') {
          gazeEpDir.current = null;
          gazeEpCounted.current = false;
        }
      }

      // ── Look-down / keyboard sustained → violation ─────────────────────────
      // DOWN is penalised after LOOK_DOWN_VIOL_MS (3s) of sustained downward gaze/head tilt.
      // UP is similarly counted (candidate staring at ceiling = distracted).
      if (votedGaze === 'DOWN' || votedGaze === 'UP') {
        if (!lookDownStart.current) lookDownStart.current = now;
        else if (now - lookDownStart.current >= LOOK_DOWN_VIOL_MS) {
          dDownViol = 1;
          dTotalLookAways = 1;   // also counts toward overall look-away total
          lookDownStart.current = now;  // reset so each 3s segment counts once
          console.log(`[FaceDet v6] 👀 LOOK-${votedGaze} VIOLATION (keyboard/notes/distraction)`);
        }
      } else {
        lookDownStart.current = null;
      }

      // ── Head-turn time-based counting ──────────────────────────────────────
      const headChecks: [HK, boolean][] = [
        ['YL', headYaw > YAW_THRESHOLD],    // positive yaw = user LEFT
        ['YR', headYaw < -YAW_THRESHOLD],    // negative yaw = user RIGHT
        ['PU', headPitch > PITCH_THRESHOLD],  // positive pitch = head UP
        ['PD', headPitch < -PITCH_THRESHOLD],  // negative pitch = head DOWN
      ];

      for (const [key, active] of headChecks) {
        if (active) {
          if (headStart.current[key] == null) {
            headStart.current[key] = now;
            headCounted.current[key] = false;
          } else if (!headCounted.current[key] &&
            now - headStart.current[key]! >= HEAD_HOLD_MS) {
            headCounted.current[key] = true;
            if (key === 'YL') { dYL++; dTotalHead++; }
            if (key === 'YR') { dYR++; dTotalHead++; }
            if (key === 'PU') { dPU++; dTotalHead++; }
            if (key === 'PD') { dPD++; dTotalHead++; }
            console.log(`[FaceDet v6] 🔄 HEAD TURN: ${key} (held ${HEAD_HOLD_MS}ms)`);
          }
        } else {
          headStart.current[key] = undefined;
          headCounted.current[key] = false;
        }
      }

      result = {
        ...result,
        faceCount, headYaw, headPitch, headRoll,
        gazeDirection: votedGaze,
        // Warning banner fires for LEFT/RIGHT (lateral) gaze held > BANNER_MIN_MS.
        // DOWN also fires if held > LOOK_DOWN_VIOL_MS/2 (1.5s) — keyboard look.
        isLookingAway: (
          ((votedGaze === 'LEFT' || votedGaze === 'RIGHT') &&
            gazeEpDir.current === votedGaze &&
            (now - gazeEpStart.current) >= BANNER_MIN_MS) ||
          ((votedGaze === 'DOWN' || votedGaze === 'UP') &&
            lookDownStart.current != null &&
            (now - lookDownStart.current) >= LOOK_DOWN_VIOL_MS / 2)
        ),
        isHeadTurned,
        isMultipleFaces: faceCount > 1,
      };
    }

    // ── Face presence / occlusion (hand-on-face) detection ─────────────────
    if (faceCount === 0) {
      consAbsence.current += 1;
      if (consAbsence.current >= ABSENCE_MIN_FRAMES) {
        // Only count the first frame that crosses the threshold
        if (consAbsence.current === ABSENCE_MIN_FRAMES) {
          dAbsence = 1;
          console.log('[FaceDet v6] 🚫 FACE ABSENT / HAND COVERING FACE');
        }
      }
    } else {
      // Also check for partial face occlusion via landmark spread
      // If face is present but the bounding box area is unusually small → hand blocking
      if (faceCount > 0 && faces[0]) {
        const pts0 = faces[0];
        const xs = pts0.map((p: any) => p.x);
        const ys = pts0.map((p: any) => p.y);
        const faceW = Math.max(...xs) - Math.min(...xs);
        const faceH = Math.max(...ys) - Math.min(...ys);
        const area = faceW * faceH;
        // If area drops below 50% of expected → likely occluded by hand
        if (area < 0.04 && prevFC.current >= 1) {
          dAbsence = 1;
          console.log(`[FaceDet v6] 🤚 FACE OCCLUDED (area=${area.toFixed(3)} < 0.04)`);
        }
      }
      consAbsence.current = 0;
    }
    // ── Multi-face time-based hold (1.5s) ──────────────────────────────────
    // Old bug: only fired on transition frame (faceCount > 1 && prevFC <= 1).
    // New: fires after MULTI_FACE_HOLD_MS of sustained 2+ faces, then resets
    // so the NEXT sustained episode also gets counted.
    if (faceCount > 1) {
      if (multiFaceStart.current === null) {
        // Start a new episode
        multiFaceStart.current = now;
        multiFaceCounted.current = false;
      } else if (!multiFaceCounted.current &&
        now - multiFaceStart.current >= MULTI_FACE_HOLD_MS) {
        // Held long enough → count one violation event
        multiFaceCounted.current = true;
        dMulti = 1;
        console.log(`[FaceDet v6] 👥 MULTIPLE FACES confirmed (held ${MULTI_FACE_HOLD_MS}ms)`);
      }
    } else {
      // Back to single face → reset episode so next appearance counts again
      multiFaceStart.current = null;
      multiFaceCounted.current = false;
    }
    prevFC.current = faceCount;

    // ── Single atomic state update ──────────────────────────────────────────
    setState(prev => {
      const c: BrowserCounters = {
        ...prev.counters,
        totalFrames: prev.counters.totalFrames + 1,
        gazeCenterCount: prev.counters.gazeCenterCount + dGazeCenter,
        gazeLeftCount: prev.counters.gazeLeftCount + dGazeLeft,
        gazeRightCount: prev.counters.gazeRightCount + dGazeRight,
        gazeDownCount: prev.counters.gazeDownCount + dGazeDown,
        totalLookAways: prev.counters.totalLookAways + dTotalLookAways,
        headYawLeftCount: prev.counters.headYawLeftCount + dYL,
        headYawRightCount: prev.counters.headYawRightCount + dYR,
        headPitchUpCount: prev.counters.headPitchUpCount + dPU,
        headPitchDownCount: prev.counters.headPitchDownCount + dPD,
        totalHeadTurns: prev.counters.totalHeadTurns + dTotalHead,
        faceAbsenceCount: prev.counters.faceAbsenceCount + dAbsence,
        multiFaceCount: prev.counters.multiFaceCount + dMulti,
        lookDownViolations: prev.counters.lookDownViolations + dDownViol,
        phoneDetectedCount: prev.counters.phoneDetectedCount,
      };
      return { ...prev, currentResult: result, counters: c, integrityScore: computeScore(c) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Frame pump ──────────────────────────────────────────────────────────────
  const processFrame = useCallback(() => {
    const vid = vidRef.current;
    if (!fmRef.current || !vid || !vid.videoWidth || !vid.videoHeight) return;
    frameNum.current += 1;
    fmRef.current.send({ image: vid }).catch((e: unknown) =>
      console.warn('[FaceDet v6] send err:', e)
    );
    if (frameNum.current % PHONE_EVERY === 0 && cocoRef.current) {
      runPhoneDetection(vid);
    }
  }, [runPhoneDetection]);

  // ── Initialize ──────────────────────────────────────────────────────────────
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      const fm = await getFaceMesh(handleResults);
      fmRef.current = fm;
      setState(p => ({ ...p, isReady: true }));
      loadCocoSSD().then(m => { cocoRef.current = m; });
      return true;
    } catch (e) {
      console.error('[FaceDet v6] init error:', e);
      return false;
    }
  }, [handleResults]);

  // ── Start / Stop monitoring (250ms = 4fps for snappy detection) ─────────────
  const startMonitoring = useCallback((video: HTMLVideoElement, ms = 250) => {
    vidRef.current = video;
    if (ivlRef.current) clearInterval(ivlRef.current);
    frameNum.current = 0;
    setState(p => ({ ...p, isRunning: true }));
    ivlRef.current = window.setInterval(processFrame, ms);
    setTimeout(processFrame, 50);   // process immediately too
  }, [processFrame]);

  const stopMonitoring = useCallback(() => {
    if (ivlRef.current) { clearInterval(ivlRef.current); ivlRef.current = null; }
    setState(p => ({ ...p, isRunning: false }));
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    prevFC.current = 1; prevPhone.current = false; phoneRunning.current = false;
    phoneConfirmedFrames.current = 0;
    consAbsence.current = 0;
    emaYaw.current = null; emaPitch.current = null; emaRoll.current = null;
    pitchNeutral.current = 0.47; pitchCalibBuf.current = []; pitchCalibDone.current = false;
    irisNeutral.current = 0.5; irisCalibBuf.current = []; irisCalibDone.current = false;
    gazeHist.current = [];
    gazeEpDir.current = null; gazeEpStart.current = 0; gazeEpCounted.current = false;
    headStart.current = {}; headCounted.current = {};
    lookDownStart.current = null;
    multiFaceStart.current = null; multiFaceCounted.current = false;
    frameNum.current = 0;
    setState(p => ({ ...p, currentResult: null, counters: ZERO_C(), integrityScore: 100 }));
  }, []);

  useEffect(() => () => { stopMonitoring(); }, [stopMonitoring]);

  return { state, initialize, startMonitoring, stopMonitoring, reset };
}

export const BROWSER_YAW_THRESHOLD = YAW_THRESHOLD;
export const BROWSER_PITCH_THRESHOLD = PITCH_THRESHOLD;
export const BROWSER_ROLL_THRESHOLD = ROLL_THRESHOLD;
