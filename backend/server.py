from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
import base64
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = "skill-swap-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    location: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    skills_offered: List[str] = []
    skills_wanted: List[str] = []
    availability: Optional[str] = None
    is_public: bool = True
    role: str = "user"  # "user" or "admin"
    is_banned: bool = False
    rating_average: float = 0.0
    total_swaps: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    location: Optional[str] = None
    bio: Optional[str] = None
    skills_offered: List[str] = []
    skills_wanted: List[str] = []
    availability: Optional[str] = None
    is_public: bool = True

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills_offered: Optional[List[str]] = None
    skills_wanted: Optional[List[str]] = None
    availability: Optional[str] = None
    is_public: Optional[bool] = None

class SwapRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requester_id: str
    target_user_id: str
    requested_skill: str
    offered_skill: str
    status: str = "pending"  # "pending", "accepted", "rejected", "completed", "cancelled"
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SwapRequestCreate(BaseModel):
    target_user_id: str
    requested_skill: str
    offered_skill: str
    message: Optional[str] = None

class SwapRequestUpdate(BaseModel):
    status: str

class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    swap_request_id: str
    rater_id: str
    rated_user_id: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RatingCreate(BaseModel):
    swap_request_id: str
    rated_user_id: str
    rating: int
    comment: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(BaseModel):
    user: User
    ratings: List[Rating] = []
    recent_swaps: List[SwapRequest] = []

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_data.password)
    user = User(**user_dict)
    
    await db.users.insert_one(user.dict())
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Account has been banned")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Profile Photo Upload
@api_router.post("/users/upload-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user profile
    photo_url = f"/uploads/{filename}"
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"profile_photo": photo_url}}
    )
    
    return {"message": "Profile photo uploaded successfully", "photo_url": photo_url}

# User Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find({"is_public": True, "is_banned": False}).to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_public", True) and user["id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Profile is private")
    
    # Get user ratings
    ratings = await db.ratings.find({"rated_user_id": user_id}).to_list(100)
    
    # Get recent swaps
    recent_swaps = await db.swap_requests.find({
        "$or": [
            {"requester_id": user_id, "status": "completed"},
            {"target_user_id": user_id, "status": "completed"}
        ]
    }).sort("updated_at", -1).limit(5).to_list(5)
    
    return UserProfile(
        user=User(**user),
        ratings=[Rating(**rating) for rating in ratings],
        recent_swaps=[SwapRequest(**swap) for swap in recent_swaps]
    )

@api_router.put("/users/me", response_model=User)
async def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user.id})
    return User(**updated_user)

@api_router.get("/users/search/{skill}")
async def search_users_by_skill(skill: str, current_user: User = Depends(get_current_user)):
    users = await db.users.find({
        "is_public": True, 
        "is_banned": False,
        "skills_offered": {"$regex": skill, "$options": "i"}
    }).to_list(1000)
    return [User(**user) for user in users]

# Swap Request Routes
@api_router.post("/swap-requests", response_model=SwapRequest)
async def create_swap_request(request_data: SwapRequestCreate, current_user: User = Depends(get_current_user)):
    # Check if target user exists
    target_user = await db.users.find_one({"id": request_data.target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Check if user is trying to request from themselves
    if request_data.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create swap request to yourself")
    
    # Create swap request
    swap_dict = request_data.dict()
    swap_dict["requester_id"] = current_user.id
    swap_request = SwapRequest(**swap_dict)
    
    await db.swap_requests.insert_one(swap_request.dict())
    return swap_request

@api_router.get("/swap-requests/my-requests")
async def get_my_requests(current_user: User = Depends(get_current_user)):
    requests = await db.swap_requests.find({"requester_id": current_user.id}).to_list(1000)
    return [SwapRequest(**req) for req in requests]

@api_router.get("/swap-requests/incoming")
async def get_incoming_requests(current_user: User = Depends(get_current_user)):
    requests = await db.swap_requests.find({"target_user_id": current_user.id}).to_list(1000)
    return [SwapRequest(**req) for req in requests]

@api_router.put("/swap-requests/{request_id}")
async def update_swap_request(request_id: str, update_data: SwapRequestUpdate, current_user: User = Depends(get_current_user)):
    swap_request = await db.swap_requests.find_one({"id": request_id})
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Only target user can accept/reject, only requester can cancel
    if update_data.status in ["accepted", "rejected"] and swap_request["target_user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only target user can accept/reject requests")
    
    if update_data.status == "cancelled" and swap_request["requester_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only requester can cancel requests")
    
    update_dict = update_data.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.swap_requests.update_one({"id": request_id}, {"$set": update_dict})
    
    # Update user stats when swap is completed
    if update_data.status == "completed":
        await db.users.update_one(
            {"id": swap_request["requester_id"]},
            {"$inc": {"total_swaps": 1}}
        )
        await db.users.update_one(
            {"id": swap_request["target_user_id"]},
            {"$inc": {"total_swaps": 1}}
        )
    
    updated_request = await db.swap_requests.find_one({"id": request_id})
    return SwapRequest(**updated_request)

@api_router.delete("/swap-requests/{request_id}")
async def delete_swap_request(request_id: str, current_user: User = Depends(get_current_user)):
    swap_request = await db.swap_requests.find_one({"id": request_id})
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Only requester can delete their own requests
    if swap_request["requester_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own requests")
    
    await db.swap_requests.delete_one({"id": request_id})
    return {"message": "Swap request deleted successfully"}

# Rating Routes
@api_router.post("/ratings", response_model=Rating)
async def create_rating(rating_data: RatingCreate, current_user: User = Depends(get_current_user)):
    # Check if swap request exists and is completed
    swap_request = await db.swap_requests.find_one({"id": rating_data.swap_request_id})
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    if swap_request["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed swaps")
    
    # Check if user was part of the swap
    if current_user.id not in [swap_request["requester_id"], swap_request["target_user_id"]]:
        raise HTTPException(status_code=403, detail="Can only rate swaps you were part of")
    
    # Check if rating already exists
    existing_rating = await db.ratings.find_one({
        "swap_request_id": rating_data.swap_request_id,
        "rater_id": current_user.id
    })
    if existing_rating:
        raise HTTPException(status_code=400, detail="Rating already exists for this swap")
    
    # Create rating
    rating_dict = rating_data.dict()
    rating_dict["rater_id"] = current_user.id
    rating = Rating(**rating_dict)
    
    await db.ratings.insert_one(rating.dict())
    
    # Update user's average rating
    all_ratings = await db.ratings.find({"rated_user_id": rating_data.rated_user_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_ratings) / len(all_ratings)
    
    await db.users.update_one(
        {"id": rating_data.rated_user_id},
        {"$set": {"rating_average": round(avg_rating, 1)}}
    )
    
    return rating

@api_router.get("/ratings/user/{user_id}")
async def get_user_ratings(user_id: str, current_user: User = Depends(get_current_user)):
    ratings = await db.ratings.find({"rated_user_id": user_id}).to_list(1000)
    return [Rating(**rating) for rating in ratings]

# Admin Routes
@api_router.get("/admin/users", response_model=List[User])
async def admin_get_all_users(current_admin: User = Depends(get_current_admin)):
    users = await db.users.find({}).to_list(1000)
    return [User(**user) for user in users]

@api_router.put("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"is_banned": True}})
    return {"message": "User banned successfully"}

@api_router.put("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"is_banned": False}})
    return {"message": "User unbanned successfully"}

@api_router.get("/admin/swap-requests")
async def admin_get_all_swaps(current_admin: User = Depends(get_current_admin)):
    swaps = await db.swap_requests.find({}).to_list(1000)
    return [SwapRequest(**swap) for swap in swaps]

@api_router.get("/admin/stats")
async def admin_get_stats(current_admin: User = Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    total_swaps = await db.swap_requests.count_documents({})
    pending_swaps = await db.swap_requests.count_documents({"status": "pending"})
    completed_swaps = await db.swap_requests.count_documents({"status": "completed"})
    
    return {
        "total_users": total_users,
        "total_swaps": total_swaps,
        "pending_swaps": pending_swaps,
        "completed_swaps": completed_swaps
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()