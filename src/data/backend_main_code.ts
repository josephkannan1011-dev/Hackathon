export const backendMainCode = `# backend/app/main.py
"""
CivicLens AI - Core FastAPI Application & AI Complaint Processing Router
Author: Senior FastAPI Developer & Security Architect
"""

import os
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

load_dotenv()

app = FastAPI(
    title="CivicLens AI API",
    description="AI-assisted Smart Governance Complaint Management System API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., pattern=r"^\\+?[1-9]\\d{1,14}$")
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    anonymous_id: str
    role: str

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=150)
    description: str = Field(..., min_length=20)
    category: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: str
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    voice_url: Optional[str] = None
    is_emergency: bool = False

class ComplaintUpdateStatus(BaseModel):
    status: str
    remarks: str
    completion_photo_url: Optional[str] = None

class AIChatMessage(BaseModel):
    message: str
    chat_history: Optional[List[dict]] = None

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def run_rule_based_ai(title: str, description: str, is_emergency: bool) -> dict:
    text = (title + " " + description).lower()
    
    department = "Municipality"
    if any(k in text for k in ["road", "pothole", "asphalt", "bridge", "highway", "sidewalk"]):
        department = "Public Works Department"
    elif any(k in text for k in ["water", "leak", "pipe", "drain", "sewage", "overflow", "gutter"]):
        department = "Water Supply Department"
    elif any(k in text for k in ["light", "electricity", "power", "blackout", "wire", "pole", "transformer"]):
        department = "Electricity Department"
    elif any(k in text for k in ["garbage", "trash", "waste", "dumping", "litter", "rubbish", "smell"]):
        department = "Municipality"

    priority_score = 40
    reasons = ["Base priority assignment"]

    if any(k in text for k in ["danger", "hazard", "unsafe", "accident", "slip", "injury"]):
        priority_score += 20
        reasons.append("Safety hazard keywords matched (+20)")

    if any(k in text for k in ["school", "hospital", "kindergarten", "clinic", "children"]):
        priority_score += 15
        reasons.append("Near schools or hospitals (+15)")

    if is_emergency:
        priority_score = 95
        reasons = ["Emergency manual flag override (+95)"]

    priority_score = min(100, max(10, priority_score))

    severity = "Medium"
    if priority_score >= 90:
        severity = "Critical"
    elif priority_score >= 70:
        severity = "High"
    elif priority_score >= 40:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "department": department,
        "priority_score": priority_score,
        "severity": severity,
        "ai_summary": title[:100],
        "ai_reasoning": f"Rule-based matched keys: {', '.join(reasons)}",
        "engine": "Rule-Based"
    }

async def run_hybrid_ai(title: str, description: str, is_emergency: bool) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return run_rule_based_ai(title, description, is_emergency)

    try:
        client = genai.Client(api_key=api_key)
        system_instructions = (
            "You are CivicLens AI. Analyze the complaint and reply in RAW JSON:\\n"
            "{\\n"
            "  \\\"department\\\": \\\"Public Works Department\\\" | \\\"Municipality\\\" | \\\"Electricity Department\\\" | \\\"Water Supply Department\\\" | \\\"Pollution Control\\\",\\n"
            "  \\\"priority_score\\\": integer (1 to 100),\\n"
            "  \\\"severity\\\": \\\"Low\\\" | \\\"Medium\\\" | \\\"High\\\" | \\\"Critical\\\",\\n"
            "  \\\"ai_summary\\\": \\\"Short summary\\\",\\n"
            "  \\\"ai_reasoning\\\": \\\"Explanation\\\"\\n"
            "}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_instructions}\\n\\nTitle: {title}\\nDescription: {description}"
        )
        import json
        return json.loads(response.text.strip())
    except Exception:
        return run_rule_based_ai(title, description, is_emergency)
`;
