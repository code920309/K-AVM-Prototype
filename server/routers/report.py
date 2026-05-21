import asyncio
from fastapi import APIRouter, HTTPException, status
from db.schemas import ReportRequest, ReportResponse
from services.llm_service import generate_ai_report

router = APIRouter(prefix="/api/v1/ai", tags=["AI Reports"])

@router.post("/generate-report", response_model=ReportResponse)
async def generate_report(payload: ReportRequest):
    """
    Stage 3 report compilation. Formats a gorgeous premium A4 HTML report.
    """
    if not payload.std_address or not payload.estimated_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="감정평가서 작성 데이터가 불충분합니다."
        )
    print(f"[FastAPI Stage 3 Report] Engine: {payload.llm_engine_type}, Address: {payload.std_address}")
    try:
        # Map the case pydantic model to list of dicts for Jinja2
        cases_list = [c.model_dump() for c in payload.cases_list]
        
        # Generates premium A4 HTML report
        rendered_html = await generate_ai_report(
            std_address=payload.std_address,
            bld_type=payload.bld_type,
            total_area=payload.total_area,
            build_year=payload.build_year,
            estimated_price=payload.estimated_price,
            cases_list=cases_list,
            llm_engine_type=payload.llm_engine_type,
            is_collective_limited=payload.is_collective_limited,
            original_area=payload.original_area,
            applied_area=payload.applied_area
        )
        
        # Brief latency buffer (1.2 seconds) to simulate deep valuation processing for realistic UX
        await asyncio.sleep(1.2)
        
        return {"ai_report": rendered_html}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"감정보고서 실시간 출력 생성 중 지연 오류가 발생했습니다: {str(e)}"
        )
