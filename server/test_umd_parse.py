import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def test_search():
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

    test_addresses = [
        "경기도 성남시 분당구 정자동 10",
        "서울특별시 영등포구 여의도동 1",
        "부산광역시 수영구 망미동 826",
        "인천광역시 미추홀구 주안동 123",
        "충청남도 아산시 배방읍 광장로 210"
    ]
    
    print("--- Test Address parsing and DB matching ---")
    for addr in test_addresses:
        parts = addr.split(' ')
        # Naive split(' ')[2]
        naive_dong = parts[2] if len(parts) > 2 else "망미동"
        
        # Robust parser: find first word ending with 동, 읍, 면
        robust_dong = "망미동"
        for part in parts:
            if part.endswith(("동", "읍", "면")):
                robust_dong = part
                break
                
        print(f"Address: '{addr}'")
        print(f"  Naive split[2]: '{naive_dong}'")
        print(f"  Robust extract: '{robust_dong}'")
        
        # Check counts in DB for naive
        naive_count = await db.properties.count_documents({"umdNm": {"$regex": naive_dong}})
        # Check counts in DB for robust
        robust_count = await db.properties.count_documents({"umdNm": {"$regex": robust_dong}})
        
        print(f"  DB count for Naive ('{naive_dong}'): {naive_count}")
        print(f"  DB count for Robust ('{robust_dong}'): {robust_count}")
        print()

if __name__ == "__main__":
    asyncio.run(test_search())
