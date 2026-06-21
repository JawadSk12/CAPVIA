"""
Behavioral Event Model
Tracks all user interactions during the test
"""

from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import BaseModel


class BehavioralEvent(BaseModel):
    """
    Behavioral Event model
    Logs all suspicious or noteworthy behaviors
    """
    __tablename__ = "behavioral_events"
    
    # References
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    question_id = Column(Integer, nullable=True)  # Optional - event might be session-wide
    
    # Event Details
    event_type = Column(String(50), nullable=False, index=True)
    # Types: tab_switch, copy, paste, idle, mouse_leave, right_click, 
    # keyboard_pattern, suspicious_typing, etc.
    
    event_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Event Data
    event_data = Column(JSON, nullable=True)
    # {
    #     "duration": 30,  # For idle events
    #     "target_text": "...",  # For copy/paste
    #     "wpm": 200,  # For typing events
    #     "url": "https://..."  # For tab switches (if detectable)
    # }
    
    severity = Column(String(20), default="low")  # low, medium, high
    description = Column(Text, nullable=True)
    
    # Contextual Information
    mouse_position = Column(JSON, nullable=True)  # {"x": 100, "y": 200}
    screen_resolution = Column(String(50), nullable=True)
    active_element = Column(String(100), nullable=True)
    
    # Relationships
    session = relationship("Session", back_populates="behavioral_events")
    
    def __repr__(self):
        return f"<BehavioralEvent {self.event_type} at {self.event_timestamp}>"