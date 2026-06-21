"""
Company Model — with proper FK on owner_id
"""

from sqlalchemy import Column, String, Text, JSON, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Company(BaseModel):
    __tablename__ = "companies"

    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=True, index=True)
    description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    founded_year = Column(Integer, nullable=True)

    website = Column(String(500), nullable=True)
    linkedin = Column(String(500), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    headquarters = Column(String(255), nullable=True)
    locations = Column(JSON, nullable=True)

    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    brand_color = Column(String(20), nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    hr_team = Column(JSON, nullable=True)

    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    culture_tags = Column(JSON, nullable=True)
    perks = Column(JSON, nullable=True)
    tech_stack = Column(JSON, nullable=True)

    # Relationships
    internships = relationship(
        "Internship",
        back_populates="company",
        foreign_keys="[Internship.company_id]",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Company {self.name}>"
