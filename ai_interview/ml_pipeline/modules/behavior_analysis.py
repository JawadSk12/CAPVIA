"""
Behavior Analysis Module
Temporal analysis with rolling window buffers
"""

import numpy as np
from collections import deque
from typing import Optional, Dict


class BehaviorAnalyzer:
    """Analyzes behavior patterns over time using rolling windows"""
    
    def __init__(self, window_size: int = 30):
        """
        Args:
            window_size: Number of frames to analyze (30 = 1 sec at 30fps)
        """
        self.window_size = window_size
        
        # Rolling buffers for each metric
        self.gaze_buffer = deque(maxlen=window_size)
        self.head_pose_buffer = deque(maxlen=window_size)
        self.phone_buffer = deque(maxlen=window_size)
        self.face_count_buffer = deque(maxlen=window_size)
    
    def update(self, 
               gaze_direction: Optional[str], 
               head_pose: Optional[Dict], 
               phone_visible: bool, 
               face_count: int):
        """
        Update all buffers with new frame data
        
        Args:
            gaze_direction: 'LEFT', 'CENTER', 'RIGHT', or None
            head_pose: Dict with 'yaw', 'pitch', 'roll' or None
            phone_visible: True if phone detected
            face_count: Number of faces in frame
        """
        self.gaze_buffer.append(gaze_direction)
        self.head_pose_buffer.append(head_pose)
        self.phone_buffer.append(phone_visible)
        self.face_count_buffer.append(face_count)
    
    def get_gaze_deviation(self) -> float:
        """
        Calculate percentage of time gaze was off-center
        
        Returns:
            0.0 to 1.0 (percentage)
        """
        if not self.gaze_buffer:
            return 0.0
        
        off_center = sum(1 for g in self.gaze_buffer if g and g != 'CENTER')
        return off_center / len(self.gaze_buffer)
    
    def get_head_stability(self) -> float:
        """
        Calculate head pose stability (standard deviation of yaw)
        
        Returns:
            Standard deviation in degrees
        """
        yaws = [p['yaw'] for p in self.head_pose_buffer if p is not None]
        if not yaws:
            return 0.0
        
        return float(np.std(yaws))
    
    def get_phone_duration(self, fps: int = 30) -> float:
        """
        Calculate duration phone was visible in current window
        
        Args:
            fps: Frames per second
        
        Returns:
            Duration in seconds
        """
        if not self.phone_buffer:
            return 0.0
        
        frames_with_phone = sum(self.phone_buffer)
        return frames_with_phone / fps
    
    def get_multi_face_percentage(self) -> float:
        """
        Calculate percentage of time multiple faces were present
        
        Returns:
            0.0 to 1.0 (percentage)
        """
        if not self.face_count_buffer:
            return 0.0
        
        multi_face_count = sum(1 for count in self.face_count_buffer if count > 1)
        return multi_face_count / len(self.face_count_buffer)
    
    def detect_sustained_anomaly(self, 
                                 anomaly_type: str, 
                                 duration_threshold: float = 2.0, 
                                 fps: int = 30) -> bool:
        """
        Detect if anomaly sustained for minimum duration
        
        Args:
            anomaly_type: 'phone', 'multi_face', 'gaze', 'head'
            duration_threshold: Minimum duration in seconds
            fps: Frames per second
        
        Returns:
            True if anomaly sustained
        """
        required_frames = int(duration_threshold * fps)
        
        # Select appropriate buffer
        if anomaly_type == 'phone':
            buffer = list(self.phone_buffer)
        elif anomaly_type == 'multi_face':
            buffer = [count > 1 for count in self.face_count_buffer]
        elif anomaly_type == 'gaze':
            buffer = [g not in ('CENTER', 'UP', 'DOWN') for g in self.gaze_buffer if g is not None]
        elif anomaly_type == 'head':
            buffer = [abs(p['yaw']) > 25 for p in self.head_pose_buffer if p is not None]
        elif anomaly_type == 'looking_down':
            buffer = []
            for g, p in zip(self.gaze_buffer, self.head_pose_buffer):
                if g is None or p is None:
                    continue
                # Flag as looking down if gaze is DOWN or head pitch points down significantly
                is_down = (g == 'DOWN') or (p['pitch'] < -15.0)
                buffer.append(is_down)
        else:
            return False
        
        if len(buffer) < required_frames:
            return False
        
        # Check last N frames
        recent = buffer[-required_frames:]
        
        # Anomaly must be present in 80% of frames
        return sum(recent) >= required_frames * 0.8
    
    def reset(self):
        """Clear all buffers"""
        self.gaze_buffer.clear()
        self.head_pose_buffer.clear()
        self.phone_buffer.clear()
        self.face_count_buffer.clear()
