import pandas as pd
import os
from pymongo import MongoClient
import glob
import json

# MongoDB Connection
MONGO_URI = "mongodb+srv://code920309_db_user:2KPeP9wNqbYjuMY6@cluster0.xuba3ib.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database("k_avm_database")

def seed_land_indices():
    print("🚀 Seed: Land Indices starting...")
    base_path = r"C:\Users\rkgka\OneDrive\바탕 화면\SFA-AVM-Engine\external\land_index_raw"
    files = glob.glob(os.path.join(base_path, "land_index_*.csv"))
    
    count = 0
    for f in files:
        if "utf8" in f: continue 
        try:
            df = pd.read_csv(f, encoding='cp949')
            # 컬럼명 소문자 및 표준화 (필요시)
            data = df.to_dict(orient='records')
            if data:
                db.land_indices.delete_many({"region": data[0].get("region")}) # 기존 데이터 삭제 후 재적재
                db.land_indices.insert_many(data)
                count += len(data)
                print(f"  - Seeded: {os.path.basename(f)} ({len(data)} rows)")
        except Exception as e:
            print(f"  - Error seeding {f}: {e}")
    print(f"✅ Land Indices Seeded: Total {count} rows")

def seed_sfa_transactions():
    print("🚀 Seed: SFA Transactions starting...")
    f = r"C:\Users\rkgka\OneDrive\바탕 화면\SFA-AVM-Engine\national_single_house_5years_raw.csv"
    if not os.path.exists(f):
        print(f"  - Error: File not found {f}")
        return

    try:
        # 데이터가 클 수 있으므로 청크 단위로 처리하거나 샘플링
        df = pd.read_csv(f, encoding='cp949', low_memory=False)
        print(f"  - Loaded raw data: {len(df)} rows")
        
        # 기본 필드 매핑 및 bld_type 추가
        df['bld_type'] = 'SFA'
        
        # dealAmount에서 콤마 제거 및 정수 변환
        if 'dealAmount' in df.columns:
            df['dealAmount'] = df['dealAmount'].str.replace(',', '').astype(float)
            
        # MongoDB 저장을 위해 5만건만 샘플링 (디모용)
        if len(df) > 50000:
            df = df.sample(n=50000, random_state=42)
            print(f"  - Sampled to 50,000 rows for prototype.")

        data = df.to_dict(orient='records')
        db.properties.delete_many({"bld_type": "SFA"})
        db.properties.insert_many(data)
        print(f"✅ SFA Transactions Seeded: {len(data)} rows")
        
    except Exception as e:
        print(f"  - Error seeding transactions: {e}")

if __name__ == "__main__":
    seed_land_indices()
    seed_sfa_transactions()
