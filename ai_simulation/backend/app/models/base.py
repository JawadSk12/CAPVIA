"""
Base Model
Contains common fields and methods for all models
"""

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.ext.declarative import declared_attr
from app.db.session import Base


class BaseModel(Base):
    """
    Abstract base model with common fields
    All models inherit from this
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    @declared_attr
    def __tablename__(cls) -> str:
        """
        Automatically generate table name from class name
        Example: UserProfile -> user_profile
        """
        import re
        name = cls.__name__
        return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
    
    def dict(self):
        """
        Convert model to dictionary
        Useful for serialization
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def update(self, **kwargs):
        """
        Update model fields from kwargs
        """
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)