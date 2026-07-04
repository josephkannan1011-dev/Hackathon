# backend/app/database/models.py
"""
CivicLens AI - SQLAlchemy Database Models (MySQL 3NF Compliant)
Author: Senior Database Architect & Backend Engineer
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, Index
from sqlalchemy.orm import declarative_base, relationship, Session

Base = declarative_base()

class Department(Base):
    """
    Departments Table (3NF)
    Stores municipal, electrical, health, etc. departments.
    """
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    sla_low_hours = Column(Integer, default=48)
    sla_medium_hours = Column(Integer, default=24)
    sla_high_hours = Column(Integer, default=12)
    sla_critical_hours = Column(Integer, default=2)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    officers = relationship("Officer", back_populates="department")
    complaints = relationship("Complaint", back_populates="department")

class User(Base):
    """
    Users Table (3NF)
    Contains the TRUE identity of all registered citizens and administrators.
    All citizens are mapped to a secure, decoupled Anonymous ID.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    anonymous_id = Column(String(50), unique=True, nullable=False, index=True) # e.g. Citizen-X83P2A
    role = Column(String(20), nullable=False, default="Citizen") # Citizen, SuperAdmin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="citizen")
    supports = relationship("ComplaintSupport", back_populates="citizen")
    notifications = relationship("Notification", back_populates="citizen")

class Officer(Base):
    """
    Officers Table (3NF)
    Sub-Admins managing specific departments.
    Anonymized from citizens in complaint workflows.
    """
    __tablename__ = "officers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="Officer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="officers")
    assigned_complaints = relationship("Complaint", back_populates="officer")

class Complaint(Base):
    """
    Complaints Table (3NF)
    Stores all submitted smart complaints. Holds relationships to anonymous citizen IDs and assigned officers.
    """
    __tablename__ = "complaints"

    id = Column(String(30), primary_key=True, index=True) # Format: CMP-YYYY-XXXXXX
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    
    # 3NF Foreign Keys
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    officer_id = Column(Integer, ForeignKey("officers.id", ondelete="SET NULL"), nullable=True)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(String(30), nullable=False, default="New") # New, Assigned, In Progress, Completed, Rejected
    priority_score = Column(Integer, nullable=False, default=40) # 1 - 100 calculated by hybrid AI
    priority_level = Column(String(20), nullable=False, default="Medium") # Low, Medium, High, Critical
    severity = Column(String(20), nullable=False, default="Medium")

    # GPS coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=False)

    # Optional attachments
    photo_url = Column(String(255), nullable=True)
    video_url = Column(String(255), nullable=True)
    voice_url = Column(String(255), nullable=True)

    # Resolution
    remarks = Column(Text, nullable=True)
    completion_photo_url = Column(String(255), nullable=True)
    estimated_completion_date = Column(DateTime, nullable=True)
    escalation_level = Column(Integer, default=0, nullable=False) # 0: Officer, 1: Dept Head, 2: District Officer, 3: Collector

    # AI Metadata
    ai_summary = Column(Text, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    ai_engine_used = Column(String(30), default="Rule-Based") # Rule-Based, Gemini AI

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="complaints")
    officer = relationship("Officer", back_populates="assigned_complaints")
    citizen = relationship("User", back_populates="complaints")
    
    supports = relationship("ComplaintSupport", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="complaint", cascade="all, delete-orphan")

    # Index for fast geospatial querying and matching (Nearby duplicate search)
    __table_args__ = (
        Index("idx_geo_coords", "latitude", "longitude"),
    )

class ComplaintSupport(Base):
    """
    Complaint Support Table (3NF)
    Enables citizens to support / back an existing reported issue.
    Multi-table intersection for many-to-many relationship.
    """
    __tablename__ = "complaint_supports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="supports")
    citizen = relationship("User", back_populates="supports")

    # Constraint to prevent a user from backing an issue multiple times
    __table_args__ = (
        Index("idx_unique_support", "complaint_id", "citizen_id", unique=True),
    )

class ComplaintStatusHistory(Base):
    """
    Complaint Status History Table (3NF)
    Tracks status timeline events for compliance and analytics.
    """
    __tablename__ = "complaint_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), nullable=False)
    remarks = Column(Text, nullable=True)
    changed_by = Column(String(100), nullable=False) # "Officer-OFF001" or "System"
    changed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")

class Escalation(Base):
    """
    Escalations Table (3NF)
    Tracks automated SLA breach escalations.
    """
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    old_level = Column(Integer, nullable=False)
    new_level = Column(Integer, nullable=False) # 1: Dept Head, 2: District Officer, 3: Collector
    escalated_to_role = Column(String(50), nullable=False)
    escalated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="escalations")

class Notification(Base):
    """
    Notifications Table (3NF)
    Stores citizen and admin alerts.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    complaint_id = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    citizen = relationship("User", back_populates="notifications")

class AuditLog(Base):
    """
    Audit Logs Table (3NF)
    Stores immutable logging entries for critical admin actions (e.g. Decryption, Reassignments)
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String(100), nullable=False, index=True)
    operator = Column(String(100), nullable=False) # e.g. "SuperAdmin-MAIN"
    details = Column(Text, nullable=False)
