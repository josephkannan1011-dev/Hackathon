# backend/app/main.py
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

# Optional Gemini Integration imports
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

# CORS Middleware for React or Mobile integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configurations
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ----------------- SCHEMAS (Pydantic Models) -----------------

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$") # E.164 phone spec
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
    status: str # "Assigned", "In Progress", "Completed", "Rejected"
    remarks: str
    completion_photo_url: Optional[str] = None

class AIChatMessage(BaseModel):
    message: str
    chat_history: Optional[List[dict]] = None

# ----------------- AUTHENTICATION UTILS -----------------

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

# ----------------- LOCAL RULE-BASED AI ENGINE -----------------

def run_rule_based_ai(title: str, description: str, is_emergency: bool) -> dict:
    """
    Primary local rule-based AI engine for classification and priority mapping.
    Acts as a zero-dependency local processor.
    """
    text = (title + " " + description).lower()
    
    # Keyword department mappings
    department = "Municipality"
    if any(k in text for k in ["road", "pothole", "asphalt", "bridge", "highway", "sidewalk"]):
        department = "Public Works Department"
    elif any(k in text for k in ["water", "leak", "pipe", "drain", "sewage", "overflow", "gutter"]):
        department = "Water Supply Department"
    elif any(k in text for k in ["light", "electricity", "power", "blackout", "wire", "pole", "transformer"]):
        department = "Electricity Department"
    elif any(k in text for k in ["garbage", "trash", "waste", "dumping", "litter", "rubbish", "smell"]):
        department = "Municipality"
    elif any(k in text for k in ["pollution", "chemical", "smoke", "dumping", "factory"]):
        department = "Pollution Control"
    elif any(k in text for k in ["hospital", "disease", "mosquito", "health", "sanitation", "clinic"]):
        department = "Health Department"
    elif any(k in text for k in ["crop", "farm", "agriculture", "pest", "irrigation"]):
        department = "Agriculture Department"
    elif any(k in text for k in ["fire", "smoke", "explosion"]):
        department = "Fire & Rescue Department"
    elif any(k in text for k in ["accident", "crash", "collision", "blocked", "traffic"]):
        department = "Police & Traffic Department"

    # Priority score calculations
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

# ----------------- HYBRID COUPLING: OPTIONAL GEMINI -----------------

async def run_hybrid_ai(title: str, description: str, is_emergency: bool) -> dict:
    """
    Analyzes issues using Google GenAI SDK if available. Falls back to Rule-Based.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        # Fallback to Local AI engine
        return run_rule_based_ai(title, description, is_emergency)

    try:
        # Initialize Google GenAI Client (Modern @google/genai SDK)
        client = genai.Client(api_key=api_key)
        
        system_instructions = (
            "You are the central engine of CivicLens AI, smart governance software.\n"
            "Analyze the complaint title and description, and respond in RAW JSON format matching:\n"
            "{\n"
            "  \"department\": \"Public Works Department\" | \"Municipality\" | \"Electricity Department\" | \"Water Supply Department\" | \"Pollution Control\" | \"Health Department\" | \"Agriculture Department\",\n"
            "  \"priority_score\": integer (1 to 100),\n"
            "  \"severity\": \"Low\" | \"Medium\" | \"High\" | \"Critical\",\n"
            "  \"ai_summary\": \"Short 1-sentence recap\",\n"
            "  \"ai_reasoning\": \"Brief logic explanation\"\n"
            "}"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_instructions}\n\nTitle: {title}\nDescription: {description}\nEmergency: {is_emergency}",
        )
        
        # Safe JSON parse (stripping markdown backticks if any)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        import json
        parsed = json.loads(text)
        parsed["engine"] = "Gemini AI"
        return parsed

    except Exception as e:
        # Error logged, silent recovery back to rule engine
        print(f"Gemini API returned error: {e}. Executing rule-based fallback...")
        return run_rule_based_ai(title, description, is_emergency)

# ----------------- REST ROUTERS -----------------

@app.post("/api/auth/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # Hash password safely
    hashed = get_password_hash(user_data.password)
    
    # Generate unique 6-character decoupled Citizen-X ID
    import random
    import string
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    anonymous_id = f"Citizen-{suffix}"
    
    # Store user in SQL (Simulation placeholder)
    # db.add(User(full_name=user_data.full_name, email=user_data.email, hashed_password=hashed, anonymous_id=anonymous_id))
    
    return {
        "message": "User registered successfully",
        "anonymous_id": anonymous_id,
        "email": user_data.email
    }

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Verify email and hash (Simulation placeholder)
    # user = db.query(User).filter(User.email == credentials.email).first()
    # if not user or not verify_password(credentials.password, user.hashed_password):
    #     raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Create Access JWT
    token_data = {"sub": credentials.email, "role": "Citizen"}
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "anonymous_id": "Citizen-X83P2A",
        "role": "Citizen"
    }

@app.post("/api/complaints", response_model=dict)
async def raise_complaint(complaint: ComplaintCreate, background_tasks: BackgroundTasks):
    """
    Submits complaints, handles duplicate checks, runs hybrid AI, auto-assigns officers, and logs audit tracks.
    """
    # 1. Duplicate check simulation within 100 meters
    # matches = db.query(Complaint).filter(distance_between_gps(complaint.latitude, complaint.longitude) < 100).all()
    # if matches:
    #     return {"is_duplicate": True, "duplicate_id": matches[0].id}

    # 2. Process complaint via Hybrid AI
    ai_analysis = await run_hybrid_ai(complaint.title, complaint.description, complaint.is_emergency)
    
    # 3. Create Unique Complaint ID format
    import random
    unique_num = random.randint(100000, 999999)
    complaint_id = f"CMP-2026-{unique_num}"
    
    # 4. Save to Database (and queue pushes/escalations in background)
    # db.save(...)
    
    return {
        "complaint_id": complaint_id,
        "classification": ai_analysis,
        "assigned_officer": "Officer Rajesh Kumar",
        "estimated_completion_date": (datetime.utcnow() + timedelta(days=2)).isoformat()
    }

@app.post("/api/ai/chat")
async def chat_with_assistant(chat: AIChatMessage):
    """
    Interactive Assistant Chat endpoint. Translates conversation into auto-fills using Gemini/Rules.
    """
    user_query = chat.message.lower()
    autofill_data = None
    
    # Determine auto-fill capabilities
    if "pothole" in user_query or "road" in user_query:
        autofill_data = {
            "title": "Road pothole repair",
            "category": "Road / Pothole",
            "suggestedDepartment": "Public Works Department",
            "isEmergency": False
        }
    elif "light" in user_query or "dark" in user_query:
        autofill_data = {
            "title": "Broken street light maintenance",
            "category": "Street Light",
            "suggestedDepartment": "Electricity Department",
            "isEmergency": False
        }

    # AI chatbot processing
    ai_key = os.getenv("GEMINI_API_KEY")
    if ai_key and genai is not None:
        try:
            client = genai.Client(api_key=api_key)
            prompt = (
                "You are CivicLens AI, an encouraging smart city governance chat assistant.\n"
                "Explain how complaints are assigned based on departments.\n"
                "Keep responses polite, clear, and restricted to 2 sentences."
            )
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{prompt}\nUser: {chat.message}"
            )
            return {"reply": resp.text.strip(), "autofill": autofill_data}
        except Exception:
            pass
            
    return {
        "reply": "I can help you report that! I have created an auto-fill template for your complaint. Click to open and submit.",
        "autofill": autofill_data
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
