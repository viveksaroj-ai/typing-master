from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== ENUMS =====
class DifficultyLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"

class PracticeMode(str, Enum):
    words = "words"
    sentences = "sentences"
    paragraphs = "paragraphs"
    numbers = "numbers"
    punctuation = "punctuation"

# ===== MODELS =====
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    level: str = "beginner"
    xp: int = 0
    badges: List[str] = []
    created_at: str
    streak_days: int = 0
    last_practice_date: Optional[str] = None

class UserStats(BaseModel):
    total_tests: int = 0
    average_wpm: float = 0.0
    average_accuracy: float = 0.0
    total_practice_time: int = 0
    best_wpm: float = 0.0

class PracticeSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mode: str
    duration: int  # in seconds
    text_content: str
    wpm: float
    accuracy: float
    errors: int
    created_at: str

class PracticeSessionCreate(BaseModel):
    mode: str
    duration: int
    typed_text: str
    original_text: str
    wpm: float
    accuracy: float
    errors: int

class TypingTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_number: int
    title: str
    content: str
    duration: int  # in seconds
    target_wpm: int
    difficulty: str
    created_at: str

class TestResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    test_id: str
    wpm: float
    accuracy: float
    errors: int
    duration: int
    typed_text: str
    passed: bool
    created_at: str

class TestResultCreate(BaseModel):
    test_id: str
    typed_text: str
    wpm: float
    accuracy: float
    errors: int
    duration: int

class LeaderboardEntry(BaseModel):
    username: str
    wpm: float
    accuracy: float
    level: str
    xp: int

# ===== HELPER FUNCTIONS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_xp(wpm: float, accuracy: float) -> int:
    base_xp = int(wpm * (accuracy / 100))
    return max(base_xp, 1)

def get_level_from_xp(xp: int) -> str:
    if xp < 100:
        return "beginner"
    elif xp < 500:
        return "intermediate"
    elif xp < 1500:
        return "advanced"
    else:
        return "expert"

async def update_user_streak(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    
    today = datetime.now(timezone.utc).date().isoformat()
    last_date = user.get("last_practice_date")
    
    if last_date == today:
        return
    
    if last_date:
        last = datetime.fromisoformat(last_date).date()
        yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1))
        if last == yesterday:
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"streak_days": 1}, "$set": {"last_practice_date": today}}
            )
        else:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"streak_days": 1, "last_practice_date": today}}
            )
    else:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"streak_days": 1, "last_practice_date": today}}
        )

# ===== AUTH ROUTES =====
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "level": "beginner",
        "xp": 0,
        "badges": [],
        "streak_days": 0,
        "last_practice_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_admin": False
    }
    
    await db.users.insert_one(user_dict)
    token = create_access_token({"sub": user_dict["id"]})
    
    return {
        "token": token,
        "user": {
            "id": user_dict["id"],
            "email": user_dict["email"],
            "username": user_dict["username"],
            "level": user_dict["level"],
            "xp": user_dict["xp"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "level": user["level"],
            "xp": user["xp"],
            "is_admin": user.get("is_admin", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "level": user["level"],
        "xp": user["xp"],
        "badges": user.get("badges", []),
        "streak_days": user.get("streak_days", 0),
        "is_admin": user.get("is_admin", False)
    }

# ===== PRACTICE ROUTES =====
@api_router.post("/practice/session")
async def create_practice_session(session_data: PracticeSessionCreate, user: dict = Depends(get_current_user)):
    session_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mode": session_data.mode,
        "duration": session_data.duration,
        "text_content": session_data.original_text,
        "wpm": session_data.wpm,
        "accuracy": session_data.accuracy,
        "errors": session_data.errors,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.practice_sessions.insert_one(session_dict)
    
    # Update user XP and level
    xp_gained = calculate_xp(session_data.wpm, session_data.accuracy)
    new_xp = user["xp"] + xp_gained
    new_level = get_level_from_xp(new_xp)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"xp": new_xp, "level": new_level}}
    )
    
    # Update streak
    await update_user_streak(user["id"])
    
    return {"id": session_dict["id"], "xp_gained": xp_gained, "new_xp": new_xp, "new_level": new_level}

@api_router.get("/practice/history")
async def get_practice_history(user: dict = Depends(get_current_user), limit: int = 20):
    sessions = await db.practice_sessions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return sessions

@api_router.get("/practice/stats")
async def get_practice_stats(user: dict = Depends(get_current_user)):
    sessions = await db.practice_sessions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    tests = await db.test_results.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    if not sessions and not tests:
        return {
            "total_tests": 0,
            "average_wpm": 0,
            "average_accuracy": 0,
            "best_wpm": 0,
            "total_practice_time": 0
        }
    
    all_results = sessions + tests
    total_tests = len(all_results)
    avg_wpm = sum(r["wpm"] for r in all_results) / total_tests if total_tests > 0 else 0
    avg_accuracy = sum(r["accuracy"] for r in all_results) / total_tests if total_tests > 0 else 0
    best_wpm = max((r["wpm"] for r in all_results), default=0)
    total_time = sum(s.get("duration", 0) for s in sessions)
    
    return {
        "total_tests": total_tests,
        "average_wpm": round(avg_wpm, 2),
        "average_accuracy": round(avg_accuracy, 2),
        "best_wpm": round(best_wpm, 2),
        "total_practice_time": total_time
    }

@api_router.get("/practice/content/{mode}")
async def get_practice_content(mode: str):
    content_map = {
        "words": "the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs sphinx of black quartz judge my vow how vexingly quick daft zebras jump waltz nymph for quick jigs vex bud crazy frederick bought many very exquisite opal jewels",
        "sentences": "The sun sets over the horizon painting the sky in shades of orange and pink. Technology has transformed the way we communicate and interact with each other. Learning new skills requires dedication patience and consistent practice. Every journey begins with a single step forward into the unknown.",
        "paragraphs": "In the digital age, the ability to type quickly and accurately has become an essential skill for professional success. Whether you are writing emails, creating documents, or communicating with colleagues, your typing speed directly impacts your productivity. Regular practice with structured exercises can significantly improve your typing abilities over time. The key is to maintain proper finger positioning and develop muscle memory through repetition. As you progress, you will notice that your speed increases naturally while your accuracy improves. Consistent daily practice, even for just fifteen minutes, can lead to remarkable improvements in your typing proficiency.",
        "numbers": "1234567890 9876543210 1029384756 5647382910 3141592653 2718281828 1618033988 1414213562 1732050807 2236067977 9999888877 7766555544 4433221100 1357924680 2468013579",
        "punctuation": "Hello, world! How are you today? I'm doing great, thanks for asking. Let's practice some punctuation: semicolons; colons: and commas, periods. Don't forget apostrophes, quotation marks, and hyphens-dashes. Question marks? Exclamation points! Parentheses (like this) and brackets [also these]."
    }
    return {"content": content_map.get(mode, content_map["words"])}

# ===== TEST ROUTES =====
@api_router.get("/tests")
async def get_tests():
    tests = await db.typing_tests.find({}, {"_id": 0}).sort("test_number", 1).to_list(100)
    if not tests:
        # Create default tests if none exist
        await initialize_default_tests()
        tests = await db.typing_tests.find({}, {"_id": 0}).sort("test_number", 1).to_list(100)
    return tests

@api_router.get("/tests/{test_id}")
async def get_test(test_id: str):
    test = await db.typing_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

@api_router.post("/tests/submit")
async def submit_test(result: TestResultCreate, user: dict = Depends(get_current_user)):
    test = await db.typing_tests.find_one({"id": result.test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    passed = result.wpm >= test["target_wpm"] and result.accuracy >= 90
    
    result_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "test_id": result.test_id,
        "wpm": result.wpm,
        "accuracy": result.accuracy,
        "errors": result.errors,
        "duration": result.duration,
        "typed_text": result.typed_text,
        "passed": passed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.test_results.insert_one(result_dict)
    
    # Update user XP
    xp_gained = calculate_xp(result.wpm, result.accuracy)
    if passed:
        xp_gained = int(xp_gained * 1.5)  # Bonus for passing
    
    new_xp = user["xp"] + xp_gained
    new_level = get_level_from_xp(new_xp)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"xp": new_xp, "level": new_level}}
    )
    
    await update_user_streak(user["id"])
    
    return {
        "id": result_dict["id"],
        "passed": passed,
        "xp_gained": xp_gained,
        "new_xp": new_xp,
        "new_level": new_level
    }

@api_router.get("/tests/results/history")
async def get_test_results(user: dict = Depends(get_current_user), limit: int = 20):
    results = await db.test_results.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with test details
    for result in results:
        test = await db.typing_tests.find_one({"id": result["test_id"]}, {"_id": 0, "title": 1})
        if test:
            result["test_title"] = test["title"]
    
    return results

# ===== LEADERBOARD ROUTES =====
@api_router.get("/leaderboard/global")
async def get_global_leaderboard(limit: int = 50):
    users = await db.users.find(
        {},
        {"_id": 0, "username": 1, "xp": 1, "level": 1}
    ).sort("xp", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for user in users:
        stats = await get_user_best_stats(user.get("id", ""))
        leaderboard.append({
            "username": user["username"],
            "xp": user["xp"],
            "level": user["level"],
            "wpm": stats.get("wpm", 0),
            "accuracy": stats.get("accuracy", 0)
        })
    
    return leaderboard

@api_router.get("/leaderboard/weekly")
async def get_weekly_leaderboard(limit: int = 50):
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    # Get recent sessions
    sessions = await db.practice_sessions.find(
        {"created_at": {"$gte": week_ago}},
        {"_id": 0}
    ).to_list(1000)
    
    # Aggregate by user
    user_stats = {}
    for session in sessions:
        user_id = session["user_id"]
        if user_id not in user_stats:
            user_stats[user_id] = {"total_wpm": 0, "count": 0, "best_wpm": 0}
        user_stats[user_id]["total_wpm"] += session["wpm"]
        user_stats[user_id]["count"] += 1
        user_stats[user_id]["best_wpm"] = max(user_stats[user_id]["best_wpm"], session["wpm"])
    
    # Build leaderboard
    leaderboard = []
    for user_id, stats in user_stats.items():
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user:
            leaderboard.append({
                "username": user["username"],
                "wpm": round(stats["best_wpm"], 2),
                "average_wpm": round(stats["total_wpm"] / stats["count"], 2),
                "level": user["level"],
                "xp": user["xp"]
            })
    
    leaderboard.sort(key=lambda x: x["wpm"], reverse=True)
    return leaderboard[:limit]

async def get_user_best_stats(user_id: str):
    sessions = await db.practice_sessions.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    if not sessions:
        return {"wpm": 0, "accuracy": 0}
    best_session = max(sessions, key=lambda x: x["wpm"])
    return {"wpm": round(best_session["wpm"], 2), "accuracy": round(best_session["accuracy"], 2)}

# ===== ADMIN ROUTES =====
@api_router.post("/admin/tests")
async def create_test(test_data: dict, user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    test_dict = {
        "id": str(uuid.uuid4()),
        "test_number": test_data["test_number"],
        "title": test_data["title"],
        "content": test_data["content"],
        "duration": test_data["duration"],
        "target_wpm": test_data["target_wpm"],
        "difficulty": test_data["difficulty"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.typing_tests.insert_one(test_dict)
    return {"id": test_dict["id"]}

@api_router.put("/admin/tests/{test_id}")
async def update_test(test_id: str, test_data: dict, user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.typing_tests.update_one(
        {"id": test_id},
        {"$set": test_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {"success": True}

@api_router.delete("/admin/tests/{test_id}")
async def delete_test(test_id: str, user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.typing_tests.delete_one({"id": test_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {"success": True}

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_current_user), skip: int = 0, limit: int = 50):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find(
        {},
        {"_id": 0, "password": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    return users

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_tests = await db.typing_tests.count_documents({})
    total_sessions = await db.practice_sessions.count_documents({})
    total_results = await db.test_results.count_documents({})
    
    return {
        "total_users": total_users,
        "total_tests": total_tests,
        "total_practice_sessions": total_sessions,
        "total_test_results": total_results
    }

# ===== INITIALIZE DEFAULT DATA =====
async def initialize_default_tests():
    tests_data = [
        {
            "test_number": 1,
            "title": "SSC CGL Mock Test 1",
            "content": "The development of technology has transformed the way we communicate and work in modern society. Digital platforms enable instant connection across vast distances, revolutionizing business operations and personal relationships. Social media networks have created unprecedented opportunities for information sharing and community building. However, this rapid digitalization also presents challenges regarding privacy, security, and the digital divide. As we navigate this technological landscape, it is crucial to balance innovation with ethical considerations and ensure equitable access to digital resources for all members of society.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 2,
            "title": "SSC CGL Mock Test 2",
            "content": "Environmental conservation has become one of the most pressing issues of our time. Climate change, deforestation, and pollution threaten ecosystems worldwide, impacting both wildlife and human populations. Sustainable practices in agriculture, industry, and daily life are essential for preserving natural resources for future generations. Governments, organizations, and individuals must collaborate to implement effective environmental policies and adopt eco-friendly technologies. Education and awareness are key factors in promoting conservation efforts and encouraging responsible stewardship of our planet.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 3,
            "title": "SSC CGL Mock Test 3",
            "content": "Economic growth and development are fundamental objectives for nations worldwide. A strong economy provides employment opportunities, improves living standards, and enables investment in infrastructure and public services. However, sustainable economic development must consider environmental impact and social equity. Inclusive growth strategies ensure that economic benefits reach all segments of society, reducing poverty and inequality. Innovation, education, and international trade play vital roles in fostering economic prosperity while maintaining environmental sustainability and social justice.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 4,
            "title": "SSC CGL Mock Test 4",
            "content": "Healthcare systems worldwide face unprecedented challenges in providing quality medical services to growing populations. Advances in medical technology have extended life expectancy and improved treatment outcomes for many diseases. However, healthcare accessibility remains unequal, with disparities based on geography, income, and social factors. Preventive care, public health initiatives, and healthcare infrastructure development are essential for building resilient health systems. The COVID-19 pandemic highlighted the importance of preparedness, international cooperation, and investment in healthcare capacity.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 5,
            "title": "SSC CGL Mock Test 5",
            "content": "Education is the cornerstone of individual and societal development. Quality education empowers individuals with knowledge, skills, and critical thinking abilities necessary for personal growth and professional success. Educational systems must evolve to meet the demands of a rapidly changing world, incorporating technology, fostering creativity, and promoting lifelong learning. Access to education should be universal, ensuring that all children regardless of background have opportunities to reach their full potential. Teachers play a crucial role in shaping minds and inspiring future generations.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 6,
            "title": "SSC CGL Mock Test 6",
            "content": "Transportation infrastructure is vital for economic development and social connectivity. Modern transportation systems facilitate the movement of people and goods, supporting trade, tourism, and daily commutes. Sustainable transportation solutions, including public transit, electric vehicles, and cycling infrastructure, are essential for reducing carbon emissions and urban congestion. Investment in transportation infrastructure creates jobs, stimulates economic growth, and improves quality of life. Smart city initiatives integrate technology with transportation planning to create efficient, user-friendly mobility solutions.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 7,
            "title": "SSC CGL Mock Test 7",
            "content": "Cultural diversity enriches societies by bringing together different perspectives, traditions, and values. Multicultural communities benefit from the exchange of ideas, artistic expressions, and culinary traditions. Respect for diversity promotes social harmony, creativity, and innovation. However, cultural differences can also lead to misunderstandings and conflicts if not approached with tolerance and open-mindedness. Education about different cultures fosters mutual understanding and appreciation. Celebrating diversity while finding common ground strengthens community bonds and creates inclusive societies.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 8,
            "title": "SSC CGL Mock Test 8",
            "content": "Renewable energy sources are essential for addressing climate change and reducing dependence on fossil fuels. Solar, wind, hydroelectric, and geothermal energy provide clean alternatives that minimize environmental impact. Transitioning to renewable energy requires significant investment in technology, infrastructure, and research. Government policies, private sector innovation, and public support are crucial for accelerating the adoption of clean energy. Energy efficiency measures complement renewable energy deployment, reducing overall consumption and environmental footprint while maintaining economic growth.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 9,
            "title": "SSC CGL Mock Test 9",
            "content": "Food security is a fundamental human right and a critical global challenge. Agricultural productivity, distribution systems, and access to nutritious food determine the well-being of populations worldwide. Climate change, population growth, and resource constraints threaten food security in many regions. Sustainable agriculture practices, technological innovation, and equitable distribution systems are necessary to ensure adequate food supply for all. Reducing food waste, promoting local food systems, and supporting small-scale farmers contribute to building resilient food systems.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 10,
            "title": "SSC CGL Mock Test 10",
            "content": "Artificial intelligence and automation are reshaping industries and labor markets worldwide. While these technologies offer tremendous potential for productivity gains and innovation, they also raise concerns about job displacement and economic inequality. Preparing the workforce for the future requires investment in education, training, and skills development. Ethical considerations surrounding AI include privacy, bias, and accountability. Balancing technological advancement with social responsibility ensures that the benefits of AI are distributed equitably and contribute to human welfare.",
            "duration": 900,
            "target_wpm": 35,
            "difficulty": "intermediate"
        },
        {
            "test_number": 11,
            "title": "SSC CGL Mock Test 11 - Advanced",
            "content": "The intricate relationship between urbanization and environmental sustainability presents multifaceted challenges for contemporary policymakers and urban planners. Metropolitan areas consume disproportionate amounts of resources while generating substantial waste and pollution. Implementing green building standards, expanding public transportation networks, and creating urban green spaces are essential strategies for mitigating environmental degradation. Smart city technologies offer innovative solutions for resource management, traffic optimization, and energy efficiency. However, successful urban sustainability requires coordinated efforts across governmental, private, and community sectors, along with significant behavioral changes among urban residents.",
            "duration": 900,
            "target_wpm": 40,
            "difficulty": "advanced"
        },
        {
            "test_number": 12,
            "title": "SSC CGL Mock Test 12 - Advanced",
            "content": "Globalization has fundamentally altered economic structures, cultural exchanges, and political dynamics across nations. International trade agreements facilitate the movement of goods, services, and capital, creating interconnected markets. While globalization has lifted millions out of poverty and fostered technological advancement, it has also contributed to income inequality, cultural homogenization, and environmental challenges. The COVID-19 pandemic exposed vulnerabilities in global supply chains, prompting discussions about resilience and self-sufficiency. Navigating the complexities of globalization requires balancing economic integration with local interests, cultural preservation, and environmental protection.",
            "duration": 900,
            "target_wpm": 40,
            "difficulty": "advanced"
        }
    ]
    
    for test_data in tests_data:
        test_data["id"] = str(uuid.uuid4())
        test_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.typing_tests.insert_one(test_data)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize default tests if none exist
    test_count = await db.typing_tests.count_documents({})
    if test_count == 0:
        await initialize_default_tests()
        logger.info("Initialized default typing tests")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
