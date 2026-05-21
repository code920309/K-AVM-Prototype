import os
import sys
import io
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Fix UTF-8 output on Windows Korean locale safely without breaking sys.excepthook on shutdown
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


db_instance = MongoDB()


async def connect_to_mongo():
    uri = MONGO_URI
    if not uri:
        uri = "mongodb://localhost:27017"

    import certifi
    ca = certifi.where()
    
    print(f"[DB] Connecting to MongoDB: {uri[:40]}...")
    # SSL Handshake 에러 해결을 위해 tls 관련 옵션 최적화
    db_instance.client = AsyncIOMotorClient(
        uri, 
        tlsCAFile=ca,
        tlsAllowInvalidCertificates=True,
        retryWrites=False, # 일부 네트워크 환경에서 핸드쉐이크 에러 완화
        tls=True,
        connectTimeoutMS=5000
    )
    db_instance.db = db_instance.client["k_avm_database"]
    print("[DB] Connected to MongoDB database: k_avm_database")


async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("[DB] MongoDB connection closed.")


def get_db():
    return db_instance.db
