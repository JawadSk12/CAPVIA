"""
State Management System — Interview Monitoring
================================================
Centralises gaze/head state tracking so that the monitoring engine
has a single source of truth for:
  - Current confirmed gaze state
  - Current confirmed head state
  - Time of last state change (for cooldown / elapsed calculations)

Note: counting is done inside each detector module (GazeTracker /
PoseEstimator). This class purely tracks *what the current state is*
and *when it last changed*.
"""

import time
from typing import Dict


class StateManager:
    """
    Lightweight state tracker for gaze and head directions.

    Usage:
        sm = StateManager()
        sm.update_gaze('LEFT')
        sm.update_head('DOWN')
        print(sm.get_status())
    """

    def __init__(self):
        self.gaze_state: str  = 'CENTER'
        self.head_state: str  = 'CENTER'

        self._gaze_changed_at: float = time.time()
        self._head_changed_at: float = time.time()

    # ── Public API ─────────────────────────────────────────────────────────────

    def update_gaze(self, new_state: str):
        """Update gaze state if it has changed."""
        if new_state != self.gaze_state:
            self.gaze_state       = new_state
            self._gaze_changed_at = time.time()

    def update_head(self, new_state: str):
        """Update head state if it has changed."""
        if new_state != self.head_state:
            self.head_state       = new_state
            self._head_changed_at = time.time()

    def gaze_stable_seconds(self) -> float:
        """Seconds since gaze last changed direction."""
        return round(time.time() - self._gaze_changed_at, 2)

    def head_stable_seconds(self) -> float:
        """Seconds since head last changed direction."""
        return round(time.time() - self._head_changed_at, 2)

    def get_status(self) -> Dict:
        """Return a dict snapshot of the current state."""
        return {
            'gaze_state':       self.gaze_state,
            'head_state':       self.head_state,
            'gaze_stable_sec':  self.gaze_stable_seconds(),
            'head_stable_sec':  self.head_stable_seconds(),
        }

    def reset(self):
        """Reset to initial state."""
        self.gaze_state       = 'CENTER'
        self.head_state       = 'CENTER'
        self._gaze_changed_at = time.time()
        self._head_changed_at = time.time()
