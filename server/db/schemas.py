from pydantic import BaseModel, Field
from typing import List, Optional

# --- Phase 1: Hook-Spec ---
class SpecRequest(BaseModel):
    raw_address: str = Field(..., description="사용자가 입력한 검색 주소")

class SpecResponse(BaseModel):
    std_address: str = Field(..., description="표준 주소")
    bld_type: str = Field(..., description="건물 유형 (VSA, SFA, SCA)")
    total_area: float = Field(..., description="전용 면적 또는 건물 면적 (㎡)")
    build_year: int = Field(..., description="준공년도")
    roadview_url: str = Field(..., description="로드뷰 이미지 매핑 URL")

# --- Phase 2: AVM Calculate ---
class CalculateRequest(BaseModel):
    std_address: str = Field(..., description="표준화된 건물 주소")
    bld_type: str = Field(..., description="건물 분류")
    user_name: str = Field(..., description="본인인증 승인 소유주 이름")
    bld_nm: Optional[str] = None
    tot_area: Optional[float] = 84.95
    grnd_flr_ar: Optional[float] = 60.0
    use_aprv_day: Optional[str] = "20180101"
    sigungu_cd: Optional[str] = "26500"
    bjdong_nm: Optional[str] = "망미동"
    bun: Optional[str] = "0"
    ji: Optional[str] = ""

class CaseModel(BaseModel):
    std_address: str = Field(..., description="유사 거래사례 주소")
    price: int = Field(..., description="거래 가격 (원)")
    deal_date: str = Field(..., description="거래 계약 일자 (YYYY-MM-DD)")
    ratio: Optional[float] = Field(None, description="대상 자산 대비 가치 비율")

class CalculateResponse(BaseModel):
    is_owner_matched: bool = Field(..., description="소유자 이름 일치 여부")
    estimated_price: int = Field(..., description="AVM 최종 정밀 감정평가액 (원)")
    cases_list: List[CaseModel] = Field(..., description="동적으로 조회된 인근 유사 실거래 3선")
    is_collective_limited: Optional[bool] = Field(False, description="집합부 면적 제한 필터링 적용 여부")
    original_area: Optional[float] = Field(None, description="제한 적용 전 원본 면적 (㎡)")
    applied_area: Optional[float] = Field(None, description="제한 적용 후 적용 면적 (㎡)")

# --- Phase 3: AI Report ---
class ReportRequest(BaseModel):
    std_address: str
    bld_type: str
    total_area: float
    build_year: int
    estimated_price: int
    cases_list: List[CaseModel]
    llm_engine_type: str = Field("GEMINI", description="추론 엔진 (GEMINI, SLLM)")
    is_collective_limited: Optional[bool] = Field(False)
    original_area: Optional[float] = Field(None)
    applied_area: Optional[float] = Field(None)

class ReportResponse(BaseModel):
    ai_report: str = Field(..., description="생성된 마크다운 보고서 본문")

# --- Phase 4: Financial Chat ---
class ChatRequest(BaseModel):
    estimated_price: int
    chat_message: str
    std_address: str
    bld_type: str
    llm_engine_type: str = Field("GEMINI", description="추론 엔진")

class ChatResponse(BaseModel):
    chat_response: str = Field(..., description="금융 챗봇 상담사 답변")

# --- Kakao Address Search & Building Official Data & History ---
class KakaoAddressItem(BaseModel):
    address_name: str = Field(..., description="전체 지번 주소")
    road_address_name: str = Field("", description="전체 도로명 주소")
    x: str = Field(..., description="경도 (longitude)")
    y: str = Field(..., description="위도 (latitude)")
    sigungu_cd: str = Field(..., description="시군구 코드")
    bjdong_cd: str = Field(..., description="법정동 코드")
    bun: str = Field(..., description="지번 본번")
    ji: str = Field(..., description="지번 부번")

class BuildingOfficialData(BaseModel):
    sigungu_cd: str
    bjdong_cd: str
    bun: str
    ji: str
    plat_plc: str = Field(..., description="대지위치")
    bld_nm: str = Field(..., description="건물명 또는 구조명")
    tot_area: float = Field(..., description="연면적 (㎡)")
    grnd_flr_ar: float = Field(..., description="건축면적 (㎡)")
    use_aprv_day: str = Field(..., description="사용승인일 (YYYYMMDD)")
    main_purps_cd_nm: str = Field(..., description="주용도코드명")
    panorama_image: Optional[str] = Field(None, description="base64 인코딩된 스트리트뷰 이미지")
    panorama_status: str = Field(..., description="SUCCESS | NO_IMAGE | API_ERROR")
    
    # AVM 호환용 필드
    std_address: str
    bld_type: str
    total_area: float
    build_year: int
    is_empty_land: Optional[bool] = Field(False, description="건물이 존재하지 않는 대지 여부")

class SearchHistoryItem(BaseModel):
    id: str = Field(..., description="로그 고유 ID")
    raw_address: str = Field(..., description="원본 검색 주소")
    std_address: str = Field(..., description="표준화 주소")
    coords: dict = Field(..., description="위경도 좌표 {'lat': float, 'lon': float}")
    building_spec: dict = Field(..., description="건축물대장 스펙 정보")
    timestamp: str = Field(..., description="검색 일시")

