import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def main():
    uri = "mongodb+srv://code920309_db_user:2KPeP9wNqbYjuMY6@cluster0.xuba3ib.mongodb.net/?appName=Cluster0"
    ca = certifi.where()
    
    client = AsyncIOMotorClient(
        uri, 
        tlsCAFile=ca,
        tlsAllowInvalidCertificates=True,
        retryWrites=False,
        tls=True,
        connectTimeoutMS=5000
    )
    db = client["k_avm_database"]
    
    print("--- land_indices region list ---")
    cursor = db.land_indices.find().limit(20)
    async for doc in cursor:
        print({k: v for k, v in doc.items() if k not in ["_id"]})

if __name__ == "__main__":
    asyncio.run(main())
