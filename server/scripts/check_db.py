import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    uri = "mongodb+srv://code920309_db_user:2KPeP9wNqbYjuMY6@cluster0.xuba3ib.mongodb.net/?appName=Cluster0"
    client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    db = client["k_avm_database"]
    
    umd_nm = "인계동"
    bld_type = "SCA"
    
    cursor = db.properties.find({
        "umdNm": umd_nm,
        "bld_type": bld_type
    }).sort("deal_date", -1).limit(10)
    
    records = await cursor.to_list(length=10)
    print(f"Query returned {len(records)} records.")
    for idx, r in enumerate(records):
        print(f"Record {idx + 1}:")
        print(f"  umdNm: {r.get('umdNm')}")
        print(f"  jibun: {r.get('jibun')}")
        print(f"  mhouseNm: {r.get('mhouseNm')}")
        print(f"  bld_type: {r.get('bld_type')}")
        print(f"  price: {r.get('price')}")
        print(f"  deal_date: {r.get('deal_date')}")

if __name__ == "__main__":
    asyncio.run(main())
