import base64
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, status
from db.mongodb import get_db
from db.schemas import (
    SpecRequest, 
    SpecResponse, 
    CalculateRequest, 
    CalculateResponse, 
    CaseModel,
    KakaoAddressItem,
    BuildingOfficialData,
    SearchHistoryItem
)
from services.avm_service import get_spec_by_address, calculate_avm
from services.api_service import search_address_kakao, get_building_official_data, get_building_panorama_google

router = APIRouter(prefix="/api/v1/avm", tags=["AVM Valuation"])

@router.get("/search", response_model=List[KakaoAddressItem])
async def search_address(q: str = Query(..., min_length=2, description="검색할 주소 질의어")):
    """
    카카오 로컬 API를 연동한 실시간 주소 검색 제안 기능
    """
    results = await search_address_kakao(q)
    return results

@router.get("/info", response_model=BuildingOfficialData)
async def get_building_info(
    sigunguCd: str = Query(..., description="시군구 코드"),
    bjdongCd: str = Query(..., description="법정동 코드"),
    bun: str = Query(..., description="본번"),
    ji: str = Query(..., description="부번"),
    lat: Optional[float] = Query(None, description="위도 좌표"),
    lon: Optional[float] = Query(None, description="경도 좌표")
):
    """
    공공 건축물대장 스펙 조회 및 구글 스트리트뷰 수집 후 MongoDB에 검색 이력 적재
    """
    # 1. 건축물대장 정보 조회
    data_dict = await get_building_official_data(sigunguCd, bjdongCd, bun, ji)
    if not data_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="조회된 건축물이 없는 주소(나대지)입니다. 건물이 존재하지 않는 주소입니다."
        )

    # 2. 구글 스트리트뷰 이미지 수집 및 base64 인코딩
    panorama_base64 = None
    panorama_status = "NO_IMAGE"

    if lat is not None and lon is not None:
        img_content, status_code = await get_building_panorama_google(lat, lon)
        panorama_status = status_code
        if img_content:
            panorama_base64 = base64.b64encode(img_content).decode("utf-8")
            
    data_dict["panorama_image"] = panorama_base64
    data_dict["panorama_status"] = panorama_status

    # 3. MongoDB Atlas search_histories 컬렉션에 검색 로그 적재
    db = get_db()
    if db is not None:
        try:
            log_doc = {
                "_id": str(uuid.uuid4()),
                "user_id": "guest",
                "raw_address": data_dict.get("plat_plc", "미정 주소"),
                "std_address": data_dict.get("std_address", "미정 표준주소"),
                "coords": {
                    "lat": lat if lat is not None else 0.0,
                    "lon": lon if lon is not None else 0.0
                },
                "building_spec": {
                    "bld_nm": data_dict.get("bld_nm", ""),
                    "tot_area": data_dict.get("tot_area", 0.0),
                    "grnd_flr_ar": data_dict.get("grnd_flr_ar", 0.0),
                    "use_aprv_day": data_dict.get("use_aprv_day", ""),
                    "main_purps_cd_nm": data_dict.get("main_purps_cd_nm", "")
                },
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            await db.search_histories.insert_one(log_doc)
        except Exception as db_err:
            print(f"[avm router] MongoDB database history insert failed: {db_err}")

    return data_dict

@router.get("/history", response_model=List[SearchHistoryItem])
async def get_search_history():
    """
    MongoDB에 영구 적재된 최근 주소 검색 로그 이력 10건 조회
    """
    db = get_db()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 연결에 실패하여 기록을 불러올 수 없습니다."
        )

    try:
        cursor = db.search_histories.find().sort("timestamp", -1).limit(10)
        logs = await cursor.to_list(length=10)
        
        results = []
        for log in logs:
            results.append({
                "id": log.get("_id"),
                "raw_address": log.get("raw_address"),
                "std_address": log.get("std_address"),
                "coords": log.get("coords", {"lat": 0.0, "lon": 0.0}),
                "building_spec": log.get("building_spec", {}),
                "timestamp": log.get("timestamp")
            })
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이력 데이터 조회 중 오류가 발생했습니다: {e}"
        )

@router.delete("/history/{id}")
async def delete_search_history(id: str):
    """
    MongoDB 이력 기록 개별 삭제
    """
    db = get_db()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 연결 실패"
        )
    
    try:
        result = await db.search_histories.delete_one({"_id": id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="삭제할 이력 항목을 찾을 수 없습니다."
            )
        return {"status": "success", "message": "이력이 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이력 삭제 도중 오류가 발생했습니다: {e}"
        )

# --- 기존 하위 호환용 API 유지 ---
@router.post("/hook-spec", response_model=SpecResponse)
async def hook_spec(payload: SpecRequest):
    """
    Stage 1 address hook. Resolves prelim address specs (Deprecated, use GET /info).
    """
    if not payload.raw_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="주소 정보가 누락되었습니다."
        )
    print(f"[FastAPI Stage 1 Hook-Spec] Raw Address: {payload.raw_address}")
    try:
        spec = await get_spec_by_address(payload.raw_address)
        return spec
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주소 조회 중 예외가 발생했습니다: {str(e)}"
        )

@router.post("/calculate", response_model=CalculateResponse)
async def calculate(payload: CalculateRequest):
    """
    Stage 2 calculation. Pulls top 3 similar cases from MongoDB.
    """
    if not payload.std_address or not payload.bld_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="필수 주소 정보가 누락되었습니다."
        )
    try:
        result = await calculate_avm(
            std_address=payload.std_address,
            bld_type=payload.bld_type,
            user_name=payload.user_name,
            bjdong_nm=payload.bjdong_nm,
            tot_area=payload.tot_area,
            grnd_flr_ar=payload.grnd_flr_ar,
            use_aprv_day=payload.use_aprv_day,
            sigungu_cd=payload.sigungu_cd,
            bun=payload.bun
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AVM 가치산정 수행 중 서버 지연 오류가 발생했습니다: {str(e)}"
        )
