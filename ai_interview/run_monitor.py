"""
run_monitor.py — AI Interview Monitoring System Entry Point
============================================================

Launches the real-time interview monitoring system on your webcam (or a video
file).  Displays a live debug HUD and prints a JSON summary at the end.

Usage:
    # Activate the project venv first:
    source .venv/bin/activate

    # Webcam (default)
    python run_monitor.py

    # Video file
    python run_monitor.py --source path/to/video.mp4

    # Save output video
    python run_monitor.py --save output.mp4

    # Mirror the webcam feed (selfie mode)
    python run_monitor.py --mirror

    # Quit early without webcam (import test)
    python run_monitor.py --test-import

Keyboard controls while running:
    Q / ESC  → quit and print final JSON
    R        → reset all counters
    S        → save a snapshot PNG
"""

import argparse
import json
import sys
import time
from pathlib import Path

import cv2

# ── Ensure project root is on the path ───────────────────────────────────────
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


def parse_args():
    p = argparse.ArgumentParser(description="AI Interview Monitor")
    p.add_argument(
        "--source", type=str, default="0",
        help="Camera index (0) or path to video file"
    )
    p.add_argument(
        "--save", type=str, default=None,
        help="Path to save output video (e.g. output.mp4)"
    )
    p.add_argument(
        "--mirror", action="store_true",
        help="Mirror the webcam horizontally (selfie mode)"
    )
    p.add_argument(
        "--test-import", action="store_true",
        help="Import all modules and print OK, then exit"
    )
    p.add_argument(
        "--fps-limit", type=float, default=30.0,
        help="Maximum frames per second cap (default 30)"
    )
    return p.parse_args()


def main():
    args = parse_args()

    # ── Import test ───────────────────────────────────────────────────────────
    if args.test_import:
        try:
            from ml_pipeline.modules.monitoring_engine import InterviewMonitor
            m = InterviewMonitor()
            print("\n✅  All modules imported successfully.")
            print(f"    Phone detector active: {m.phone.is_active}")
        except Exception as e:
            print(f"❌  Import error: {e}")
            sys.exit(1)
        sys.exit(0)

    # ── Load monitor ──────────────────────────────────────────────────────────
    try:
        from ml_pipeline.modules.monitoring_engine import InterviewMonitor
    except ImportError as e:
        print(f"❌  Could not import monitoring engine: {e}")
        print("    Make sure you are running from the project root with the venv active.")
        sys.exit(1)

    monitor = InterviewMonitor()

    # ── Open video source ────────────────────────────────────────────────────
    source = int(args.source) if args.source.isdigit() else args.source
    cap    = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"❌  Cannot open video source: {args.source}")
        sys.exit(1)

    src_w  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h  = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    print(f"📷  Source: {args.source}  ({src_w}×{src_h} @ {src_fps:.1f} fps)")

    # ── Output video writer ──────────────────────────────────────────────────
    writer = None
    if args.save:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(args.save, fourcc, src_fps, (src_w, src_h))
        print(f"💾  Saving to: {args.save}")

    # ── Main loop ─────────────────────────────────────────────────────────────
    frame_delay = 1.0 / args.fps_limit
    snap_idx    = 0
    t_last      = time.time()

    print("\n⬛  Controls:  Q/ESC = quit   R = reset   S = snapshot\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("🔚  End of stream.")
            break

        # FPS cap
        now = time.time()
        elapsed = now - t_last
        if elapsed < frame_delay:
            time.sleep(frame_delay - elapsed)
        t_last = time.time()

        # Mirror (selfie mode)
        if args.mirror:
            frame = cv2.flip(frame, 1)

        # ── Process ───────────────────────────────────────────────────────────
        result = monitor.process_frame(frame)

        # ── Display ───────────────────────────────────────────────────────────
        cv2.imshow("AI Interview Monitor — Q to quit", frame)

        if writer:
            writer.write(frame)

        # ── Key handling ─────────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF

        if key in (ord('q'), ord('Q'), 27):   # Q or ESC
            break

        if key in (ord('r'), ord('R')):
            monitor.reset()
            print("🔄  Monitor reset.")

        if key in (ord('s'), ord('S')):
            snap_path = f"snapshot_{snap_idx:03d}.png"
            cv2.imwrite(snap_path, frame)
            print(f"📸  Snapshot saved → {snap_path}")
            snap_idx += 1

    # ── Cleanup ───────────────────────────────────────────────────────────────
    cap.release()
    if writer:
        writer.release()
    cv2.destroyAllWindows()

    # ── Final JSON output ─────────────────────────────────────────────────────
    final = monitor.get_final_json()
    print("\n" + "=" * 60)
    print("  FINAL SESSION REPORT")
    print("=" * 60)
    print(json.dumps(final, indent=2))
    print("=" * 60)

    return final


if __name__ == "__main__":
    main()
