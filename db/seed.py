import os
import sys
import io
import time
import pandas as pd
from pymongo import MongoClient, ASCENDING, IndexModel
from dotenv import load_dotenv

# Fix UTF-8 output on Windows Korean locale
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("[ERROR] 'MONGODB_URI' is not found in server/.env file.")
    sys.exit(1)

# CSV file paths
VSA_CSV_PATH = r"C:\VSA-AVM-Engine\data\processed\nationwide_RHTrade_enriched.csv"
SCA_CSV_PATH = r"C:\SCA-avm-engine\data\processed\commercial_combined_v2.csv"

BATCH_SIZE = 5000


def get_korean_price(price_str):
    """Clean and parse dealAmount string into integer Won."""
    if pd.isna(price_str):
        return 0
    if isinstance(price_str, (int, float)):
        val = int(price_str)
        return val * 10000 if val < 100000000 else val

    cleaned = str(price_str).replace(",", "").replace(" ", "").strip()
    try:
        val = int(cleaned)
        if val < 5000000:
            return val * 10000
        return val
    except ValueError:
        return 0


def seed_database():
    start_time = time.time()
    print("[*] Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=15000)
    db = client["k_avm_database"]
    properties_col = db["properties"]

    # Clear existing collection
    print("[*] Dropping existing properties collection...")
    properties_col.drop()
    print("[OK] Collection dropped.")

    # -------------------------------------------------------
    # 1. SEED RESIDENTIAL (VSA / SFA) DATA
    # -------------------------------------------------------
    print(f"\n[1/2] Loading Residential CSV from:\n      {VSA_CSV_PATH}")
    if os.path.exists(VSA_CSV_PATH):
        total_seeded_vsa = 0
        chunk_count = 0
        total_rows_vsa = 468423

        cols = [
            'sggCd', 'umdNm', 'jibun', 'mhouseNm', 'buildYear',
            'houseType', 'excluUseAr', 'dealYear', 'dealMonth', 'dealDay',
            'dealAmount', 'lat', 'lng', 'subway_name', 'subway_dist'
        ]

        # Check which columns actually exist in the file
        sample = pd.read_csv(VSA_CSV_PATH, nrows=1)
        available_cols = [c for c in cols if c in sample.columns]

        chunks = pd.read_csv(
            VSA_CSV_PATH,
            chunksize=BATCH_SIZE,
            usecols=available_cols,
            low_memory=False
        )

        for chunk in chunks:
            records = []
            for _, row in chunk.iterrows():
                try:
                    deal_date = f"{int(row['dealYear']):04d}-{int(row['dealMonth']):02d}-{int(row['dealDay']):02d}"
                except Exception:
                    deal_date = "2020-01-01"

                raw_type = str(row.get('houseType', 'VSA'))
                bld_type = "SFA" if "아파트" in raw_type or raw_type == "SFA" else "VSA"
                price = get_korean_price(row.get('dealAmount', 0))

                record = {
                    "umdNm":      str(row.get('umdNm', '')).strip(),
                    "jibun":      str(row.get('jibun', '')).strip() if not pd.isna(row.get('jibun', float('nan'))) else "",
                    "mhouseNm":   str(row.get('mhouseNm', '')).strip() if not pd.isna(row.get('mhouseNm', float('nan'))) else "",
                    "buildYear":  int(row['buildYear']) if not pd.isna(row.get('buildYear', float('nan'))) else 2020,
                    "bld_type":   bld_type,
                    "total_area": float(row['excluUseAr']) if not pd.isna(row.get('excluUseAr', float('nan'))) else 0.0,
                    "price":      price,
                    "deal_date":  deal_date,
                    "lat":        float(row['lat']) if 'lat' in row and not pd.isna(row.get('lat', float('nan'))) else None,
                    "lng":        float(row['lng']) if 'lng' in row and not pd.isna(row.get('lng', float('nan'))) else None,
                    "subway_name": str(row['subway_name']).strip() if 'subway_name' in row and not pd.isna(row.get('subway_name', float('nan'))) else None,
                    "subway_dist": float(row['subway_dist']) if 'subway_dist' in row and not pd.isna(row.get('subway_dist', float('nan'))) else None,
                }
                records.append(record)

            if records:
                properties_col.insert_many(records, ordered=False)
                total_seeded_vsa += len(records)
                chunk_count += 1
                elapsed = time.time() - start_time
                if chunk_count % 10 == 0:
                    print(f"   [VSA] {total_seeded_vsa:,} / {total_rows_vsa:,} records  ({elapsed:.0f}s elapsed)")

        print(f"[DONE] Seeded {total_seeded_vsa:,} residential (VSA/SFA) records.")
    else:
        print(f"[WARNING] VSA CSV not found at: {VSA_CSV_PATH}")

    # -------------------------------------------------------
    # 2. SEED COMMERCIAL (SCA) DATA
    # -------------------------------------------------------
    print(f"\n[2/2] Loading Commercial CSV from:\n      {SCA_CSV_PATH}")
    if os.path.exists(SCA_CSV_PATH):
        total_seeded_sca = 0
        chunk_count = 0
        total_rows_sca = 200229

        cols = [
            'buildYear', 'buildingAr', 'buildingType',
            'dealAmount', 'dealDay', 'dealMonth', 'dealYear', 'jibun', 'umdNm'
        ]

        sample = pd.read_csv(SCA_CSV_PATH, nrows=1)
        available_cols = [c for c in cols if c in sample.columns]

        chunks = pd.read_csv(
            SCA_CSV_PATH,
            chunksize=BATCH_SIZE,
            usecols=available_cols,
            low_memory=False
        )

        for chunk in chunks:
            records = []
            for _, row in chunk.iterrows():
                try:
                    deal_date = f"{int(row['dealYear']):04d}-{int(row['dealMonth']):02d}-{int(row['dealDay']):02d}"
                except Exception:
                    deal_date = "2020-01-01"

                price = get_korean_price(row.get('dealAmount', 0))
                building_name = str(row.get('buildingType', '일반상가'))

                record = {
                    "umdNm":      str(row.get('umdNm', '')).strip(),
                    "jibun":      str(row.get('jibun', '')).strip() if not pd.isna(row.get('jibun', float('nan'))) else "",
                    "mhouseNm":   building_name,
                    "buildYear":  int(row['buildYear']) if not pd.isna(row.get('buildYear', float('nan'))) else 2015,
                    "bld_type":   "SCA",
                    "total_area": float(row['buildingAr']) if not pd.isna(row.get('buildingAr', float('nan'))) else 0.0,
                    "price":      price,
                    "deal_date":  deal_date,
                    "lat":        None,
                    "lng":        None,
                    "subway_name": None,
                    "subway_dist": None,
                }
                records.append(record)

            if records:
                properties_col.insert_many(records, ordered=False)
                total_seeded_sca += len(records)
                chunk_count += 1
                elapsed = time.time() - start_time
                if chunk_count % 10 == 0:
                    print(f"   [SCA] {total_seeded_sca:,} / {total_rows_sca:,} records  ({elapsed:.0f}s elapsed)")

        print(f"[DONE] Seeded {total_seeded_sca:,} commercial (SCA) records.")
    else:
        print(f"[WARNING] SCA CSV not found at: {SCA_CSV_PATH}")

    # -------------------------------------------------------
    # 3. CREATE INDEXES
    # -------------------------------------------------------
    print("\n[*] Creating Atlas Indexes for sub-10ms queries...")
    indexes = [
        IndexModel([("umdNm", ASCENDING)]),
        IndexModel([("buildYear", ASCENDING)]),
        IndexModel([("total_area", ASCENDING)]),
        IndexModel([("bld_type", ASCENDING)]),
        IndexModel([("umdNm", ASCENDING), ("bld_type", ASCENDING), ("total_area", ASCENDING)]),
    ]
    properties_col.create_indexes(indexes)
    print("[OK] Indexes created: umdNm, buildYear, total_area, bld_type, composite")

    elapsed_time = time.time() - start_time
    total_count = properties_col.count_documents({})
    print(f"\n===================================")
    print(f"[COMPLETE] Total records in DB : {total_count:,}")
    print(f"[COMPLETE] Total time elapsed  : {elapsed_time:.1f} seconds")
    print(f"===================================")
    client.close()


if __name__ == "__main__":
    seed_database()
