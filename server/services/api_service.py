import os
import urllib.parse
import httpx
from typing import Optional, List, Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
PUBLIC_DATA_API_KEY = os.getenv("PUBLIC_DATA_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

async def search_address_kakao(q: str) -> List[Dict[str, Any]]:
    """
    카카오 로컬 API를 통해 주소를 검색하고 검색 제안 후보 리스트를 반환합니다.
    """
    if not KAKAO_REST_API_KEY:
        print("[Kakao API] KAKAO_REST_API_KEY가 설정되지 않았습니다.")
        return []

    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    params = {"query": q}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=5.0)
            if response.status_code != 200:
                print(f"[Kakao API] 오류: 상태 코드 {response.status_code}")
                return []
            
            data = response.json()
            documents = data.get("documents", [])
            results = []

            for doc in documents:
                address_name = doc.get("address_name", "")
                road_address = doc.get("road_address")
                road_address_name = road_address.get("address_name", "") if road_address else ""
                
                x = doc.get("x", "")
                y = doc.get("y", "")
                
                # 지번 정보가 포함된 address 객체에서 대장 매핑 정보 파싱
                address_info = doc.get("address")
                sigungu_cd = ""
                bjdong_cd = ""
                bun = ""
                ji = ""

                if address_info:
                    b_code = address_info.get("b_code", "")
                    if len(b_code) >= 10:
                        sigungu_cd = b_code[:5]
                        bjdong_cd = b_code[5:10]
                    bun = address_info.get("main_address_no", "")
                    ji = address_info.get("sub_address_no", "")

                results.append({
                    "address_name": address_name,
                    "road_address_name": road_address_name,
                    "x": x,
                    "y": y,
                    "sigungu_cd": sigungu_cd,
                    "bjdong_cd": bjdong_cd,
                    "bun": bun,
                    "ji": ji
                })
            
            return results

    except Exception as e:
        print(f"[Kakao API] 예외 발생: {e}")
        return []

async def get_building_official_data(sigungu_cd: str, bjdong_cd: str, bun: str, ji: str) -> Dict[str, Any]:
    """
    국토교통부 건축물대장 API (getBrTitleInfo)를 사용하여 건물 공공 스펙 정보를 조회합니다.
    """
    fallback_data = {
        "sigungu_cd": sigungu_cd,
        "bjdong_cd": bjdong_cd,
        "bun": bun,
        "ji": ji,
        "plat_plc": "조회 대상 대지 위치",
        "bld_nm": "정보 없음",
        "tot_area": 84.95,
        "grnd_flr_ar": 60.0,
        "use_aprv_day": "20180101",
        "main_purps_cd_nm": "공동주택",
        "std_address": f"임시 주소지 {bun}-{ji}",
        "bld_type": "VSA",
        "total_area": 84.95,
        "build_year": 2018
    }

    if not PUBLIC_DATA_API_KEY:
        print("[Public Data API] PUBLIC_DATA_API_KEY가 설정되지 않았습니다.")
        return fallback_data

    url = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"
    # serviceKey의 경우 이미 인코딩된 키가 배포되므로, 
    # httpx의 params 자동 인코딩을 피하기 위해 URL에 직접 쿼리 스트링으로 결합
    import urllib.parse
    
    # bun, ji 4자리 zfill 포맷팅 (부번이 없으면 빈 문자열로 처리하는 것이 유리한 경우가 있음)
    bun_str = str(bun).zfill(4) if bun else "0000"
    ji_str = str(ji).zfill(4) if ji and str(ji) not in ["0", "0000", ""] else ""

    # 기본 파라미터 구성 (serviceKey 제외)
    query_params = {
        "sigunguCd": sigungu_cd,
        "bjdongCd": bjdong_cd,
        "bun": bun_str,
        "ji": ji_str,
        "numOfRows": 1,
        "pageNo": 1,
        "_type": "json"
    }
    
    # URL 직접 생성: serviceKey는 이미 인코딩된 PUBLIC_DATA_API_KEY를 그대로 사용
    full_url = f"{url}?serviceKey={PUBLIC_DATA_API_KEY}&{urllib.parse.urlencode(query_params)}"
    print(f"[Public Data API] Requesting: {sigungu_cd} {bjdong_cd} {bun_str}-{ji_str}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(full_url, timeout=10.0)
            print(f"[Public Data API] Response Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[Public Data API] 건축물대장 API HTTP 오류: 상태 코드 {response.status_code}")
                return fallback_data
            
            data = response.json()
            
            body = data.get("response", {}).get("body", {})
            items = body.get("items", {})

            if items and isinstance(items, dict) and "item" in items:
                item_data = items["item"]
                # item_data가 리스트인 경우와 단일 객체인 경우 모두 처리
                if isinstance(item_data, list):
                    if len(item_data) > 0:
                        item = item_data[0]
                    else:
                        print(f"[Public Data API] 건축물대장 API: 결과 항목이 비어있습니다. (RAW: {data})")
                        return None
                else:
                    item = item_data
                
                print(f"[Public Data API] Data Found: {item.get('bldNm', '건물명 없음')}")
                
                # 데이터 추출
                plat_plc = item.get("platPlc", "").strip()
                
                # 건물명이 없으면 구조명으로 대체
                bld_nm = item.get("bldNm", "").strip()
                strct_cd_nm = item.get("strctCdNm", "").strip()
                if not bld_nm or bld_nm == "정보 없음":
                    bld_nm = f"({strct_cd_nm})" if strct_cd_nm else "정보 없음"
                
                try:
                    tot_area = float(item.get("totArea", 84.95))
                except (ValueError, TypeError):
                    tot_area = 84.95
                    
                try:
                    grnd_flr_ar = float(item.get("grndFlrAr", 60.0))
                except (ValueError, TypeError):
                    grnd_flr_ar = 60.0
                    
                use_aprv_day = item.get("useAprvDay", "20180101")
                if not use_aprv_day or use_aprv_day == "None":
                    use_aprv_day = "20180101"
                
                main_purps_cd_nm = item.get("mainPurpsCdNm", "공동주택").strip()

                # 주소 표준화 포맷팅
                std_address = f"{plat_plc} {bld_nm}".strip()
                
                # AVM 건물 유형(bld_type) 매핑
                # SFA (단독/다가구/아파트/공동), SCA (상업용/근린생활), VSA (연립/다세대/기타)
                bld_type = "VSA"
                if any(keyword in main_purps_cd_nm for keyword in ["단독", "다가구", "아파트", "공동주택"]):
                    bld_type = "SFA"
                elif any(keyword in main_purps_cd_nm for keyword in ["근린생활", "상업", "업무", "판매", "상가"]):
                    bld_type = "SCA"

                # 준공년도 파싱
                try:
                    build_year = int(use_aprv_day[:4]) if len(use_aprv_day) >= 4 else 2018
                except ValueError:
                    build_year = 2018

                return {
                    "sigungu_cd": sigungu_cd,
                    "bjdong_cd": bjdong_cd,
                    "bun": bun,
                    "ji": ji,
                    "plat_plc": plat_plc,
                    "bld_nm": bld_nm if bld_nm else "대장 건물",
                    "tot_area": round(tot_area, 2),
                    "grnd_flr_ar": round(grnd_flr_ar, 2),
                    "use_aprv_day": use_aprv_day,
                    "main_purps_cd_nm": main_purps_cd_nm,
                    "std_address": std_address,
                    "bld_type": bld_type,
                    "total_area": round(tot_area, 2),
                    "build_year": build_year
                }
            else:
                print(f"[Public Data API] 건축물대장 API: 결과 항목이 비어있거나 존재하지 않습니다. (RAW: {data})")
                return None

    except Exception as e:
        print(f"[Public Data API] 건축물대장 API 예외 발생: {e}")
        
    return fallback_data

async def get_building_panorama_google(lat: float, lon: float) -> Tuple[Optional[bytes], str]:
    """
    구글 스트리트뷰 Static API를 사용하여 위경도 기준 스트리트뷰 이미지를 수집합니다.
    촬영본이 없는 경우 (None, "NO_IMAGE")를 반환합니다.
    """
    if not GOOGLE_MAPS_API_KEY:
        print("[Google API] GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.")
        return None, "API_ERROR"

    # 1. 스트리트뷰 메타데이터 API를 호출하여 이미지 실존 여부를 먼저 체크
    metadata_url = "https://maps.googleapis.com/maps/api/streetview/metadata"
    meta_params = {
        "location": f"{lat},{lon}",
        "key": GOOGLE_MAPS_API_KEY
    }

    try:
        async with httpx.AsyncClient() as client:
            meta_res = await client.get(metadata_url, params=meta_params, timeout=3.0)
            if meta_res.status_code == 200:
                meta_data = meta_res.json()
                status = meta_data.get("status", "")
                if status == "ZERO_RESULTS":
                    print(f"[Google API] Google Street View 촬영본이 없는 좌표입니다: {lat}, {lon}")
                    return None, "NO_IMAGE"
                elif status != "OK":
                    print(f"[Google API] Google Street View 메타데이터 상태 에러: {status}")
                    return None, "API_ERROR"
            else:
                return None, "API_ERROR"

            # 2. 메타데이터가 존재하면 실제 이미지 다운로드
            img_url = "https://maps.googleapis.com/maps/api/streetview"
            img_params = {
                "size": "600x400",
                "location": f"{lat},{lon}",
                "key": GOOGLE_MAPS_API_KEY
            }
            img_res = await client.get(img_url, params=img_params, timeout=5.0)
            if img_res.status_code == 200:
                return img_res.content, "SUCCESS"
            
    except Exception as e:
        print(f"[Google API] Google Street View API 예외 발생: {e}")
        return None, "API_ERROR"

    return None, "API_ERROR"
