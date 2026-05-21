import asyncio
import sys
import os

# server 폴더를 path에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.avm_factory import avm_factory

async def run_unit_tests():
    print("--- [AVM Engines Unit Test Start] ---")
    
    # 1. SFA Engine Test (Apartment/Single House)
    print("\n[Test 1] SFA Engine (Apartment)")
    sfa_sample = {
        "main_purps_cd_nm": "아파트",
        "use_aprv_day": "20150510",
        "grnd_flr_ar": 120.5,
        "tot_area": 84.9,
        "sigungu_cd": "26500",
        "bjdong_nm": "망미동",
        "bun": "826"
    }
    sfa_res = await avm_factory.calculate(sfa_sample)
    print(f"  Result: {sfa_res}")

    # 2. VSA Engine Test (Villa/Multiplex)
    print("\n[Test 2] VSA Engine (Villa)")
    vsa_sample = {
        "main_purps_cd_nm": "다세대주택",
        "use_aprv_day": "20181120",
        "tot_area": 59.8,
        "lat": 35.17,
        "lon": 129.10
    }
    vsa_res = await avm_factory.calculate(vsa_sample)
    print(f"  Result: {vsa_res}")

    # 3. SCA Engine Test (Commercial/Retail)
    print("\n[Test 3] SCA Engine (Commercial)")
    sca_sample = {
        "main_purps_cd_nm": "제2종근린생활시설",
        "use_aprv_day": "20100315",
        "grnd_flr_ar": 200.0,
        "tot_area": 500.0,
        "sigungu_cd": "11110",
        "bjdong_nm": "종로구",
        "bun": "1"
    }
    sca_res = await avm_factory.calculate(sca_sample)
    print(f"  Result: {sca_res}")

    print("\n--- [Unit Test Complete] ---")

if __name__ == "__main__":
    asyncio.run(run_unit_tests())
