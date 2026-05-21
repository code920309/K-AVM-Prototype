import asyncio
from fastapi import APIRouter, HTTPException, status
from db.schemas import ChatRequest, ChatResponse
from services.loan_service import consult_loan_fallback
from services.llm_service import consult_loan_ai

router = APIRouter(prefix="/api/v1/chat", tags=["Financial Chatbot"])

@router.post("/loan-consult", response_model=ChatResponse)
async def loan_consult(payload: ChatRequest):
    """
    Stage 4 financial consult chatbot. Processes parameters and answers questions.
    """
    if not payload.estimated_price or not payload.chat_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="대출 질문 또는 산정 가격이 누락되었습니다."
        )
    print(f"[FastAPI Stage 4 Chat] Query: \"{payload.chat_message}\" for price: {payload.estimated_price}")
    try:
        # 1. Fetch strict rule-based fallback details
        fallback = consult_loan_fallback(
            estimated_price=payload.estimated_price,
            chat_message=payload.chat_message,
            std_address=payload.std_address,
            bld_type=payload.bld_type
        )
        
        # 2. Let Gemini formulate a hyper-professional response incorporating parameters
        response_text = await consult_loan_ai(
            estimated_price=payload.estimated_price,
            chat_message=payload.chat_message,
            std_address=payload.std_address,
            bld_type=payload.bld_type,
            llm_engine_type=payload.llm_engine_type,
            fallback_response=fallback
        )
        
        # Latency buffer (1.0 second) for chatbot UX consistency
        await asyncio.sleep(1.0)
        
        return {"chat_response": response_text}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"금융 대출 컨설턴트 챗봇 응답 지연 오류가 발생했습니다: {str(e)}"
        )
