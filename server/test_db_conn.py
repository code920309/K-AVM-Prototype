import asyncio
import os
import sys
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
    
    # Check count of different bld_types
    print("--- bld_type counts ---")
    pipeline = [
        {"$group": {"_id": "$bld_type", "count": {"$sum": 1}}}
    ]
    cursor = db.properties.aggregate(pipeline)
    async for group in cursor:
        print(f"bld_type {group['_id']}: {group['count']}")
        
    # Let's count sample umdNm values
    print("\n--- Top 10 umdNm values ---")
    pipeline = [
        {"$group": {"_id": "$umdNm", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    cursor = db.properties.aggregate(pipeline)
    async for group in cursor:
        umd = group['_id']
        print(f"umdNm {umd} (Ordinals: {[ord(c) for c in umd if umd]}): {group['count']}")

if __name__ == "__main__":
    asyncio.run(main())
