import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "blood_bank")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections (aap apne hisaab se add kar sakte hain)
users_collection = db["users"]
donor_profiles_collection = db["donor_profiles"]
blood_requests_collection = db["blood_requests"]
# ... baaki collections