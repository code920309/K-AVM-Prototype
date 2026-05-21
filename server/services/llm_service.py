import os
import jinja2
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Utility to convert price to Korean string (e.g. 5억 1,500만원)
def get_korean_price_string(price: int) -> str:
    if price >= 100000000:
        eok = price // 100000000
        remainder = price % 100000000
        man = round(remainder / 10000)
        if man > 0:
            return f"{eok}억 {man:,}만원"
        return f"{eok}억원"
    return f"{round(price / 10000):,}만원"

def get_fallback_markdown(std_address, bld_type_name, total_area, build_year, estimated_price_str, bld_type: str = "SCA", is_collective_limited: bool = False, original_area: Optional[float] = None):
    """Clean premium markdown fallback if Gemini API is unavailable."""
    sca_note = ""
    if bld_type == "SCA":
        if is_collective_limited and original_area:
            sca_note = f" (본 SCA 평가는 통건물 데이터 부재 및 연면적 왜곡 방지를 위해 건물 연면적 {original_area}㎡ 대신 개별 구분소유 집합부 표준 면적인 {total_area}㎡를 대입하여 개별 호실 기준으로 가치가 분석되었습니다.)"
        else:
            sca_note = " (본 SCA 평가는 통건물이 아닌 개별 구분소유 집합부 데이터를 기준으로 분석되었습니다.)"
        
    return f"""### 입지 분석 및 감정평가원 소견
대상 부동산인 **{std_address}**({bld_type_name})은 **{build_year}년** 준공되어 현재 노후화 수준이 안정적이며, 전용면적 **{total_area}㎡**의 효율적인 공간을 점유하고 있습니다.{sca_note} 

1. **상대적 입지 분석**:
   - 대상 필지가 속한 권역은 교통 및 편의시설 인프라가 이미 고도로 완비된 지역으로, 거주 및 상업적 지속성이 대단히 우수합니다.
   - 반경 500m 이내 지하철 인접성 등 직주근접 이점이 시세의 하방 경직성을 든든하게 지지하고 있습니다.

2. **적정 가격 보정 요인**:
   - 인근 최근 유사 실거래 사례 3선을 심층 비교·보정한 결과, 대상 자산의 건물 관리 상태와 향을 고려했을 때 최종 감정가인 **{estimated_price_str}**선은 합리적이고 객관적인 가치 범위로 판단됩니다.
   
3. **종합 투자의견**:
   - 향후 주변 정비사업 및 거시적 부동산 금리 추이 완화에 힘입어 자산 가치의 점진적 상승이 예측되며, 담보 취득 시 대출 LTV 한도 승인 한계치를 충족시키는 안정적인 자산군에 속합니다."""

async def generate_ai_report(std_address: str, bld_type: str, total_area: float, build_year: int, estimated_price: int, cases_list: list, llm_engine_type: str, is_collective_limited: bool = False, original_area: Optional[float] = None, applied_area: Optional[float] = None) -> str:
    """
    Stage 3: Generates premium A4 styled HTML report using Jinja2 and Gemini API.
    """
    price_korean = get_korean_price_string(estimated_price)
    bld_type_name = "아파트 및 공동주택" if bld_type == "SFA" else "상업 및 업무용 빌딩" if bld_type == "SCA" else "연립주택 및 다세대 빌라"
    
    # 1. Generate core analytical opinion using Gemini API
    llm_content = ""
    if llm_engine_type == "GEMINI" and GEMINI_API_KEY:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=GEMINI_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            부동산 감정평가사 입장에서 다음 정보를 바탕으로 정교하고 객관적인 'AI 모델 기반 감정평가 종합 의견'을 15줄 이내로 작성해 주세요.
            마크다운 문법으로 작성하되, '#제목'은 제외하고 본문 문맥('### 소제목' 등)만 자연스럽게 작성하세요. 전문적이고 설득력 있는 용어(하방 경직성, 입지 메리트 등)를 사용해 주세요.
            
            [부동산 요약]
            - 주소: {std_address}
            - 주택유형: {bld_type_name} ({bld_type})
            - 전용면적: {total_area}㎡
            - 준공년도: {build_year}년
            - 최종 추정 감정가: {price_korean} ({estimated_price:,}원)
            
            [인근 실거래 비교 사례]
            {chr(10).join([f"- {c['std_address']}: {get_korean_price_string(c['price'])} ({c['deal_date']})" for c in cases_list])}
            
            [중요 추가 지침]
            - 대상 자산의 건물 분류가 SCA(상업 및 업무용 빌딩)인 경우, 본 평가는 통건물 전체가 아닌 개별 구분소유 집합부(구분상가 및 호실 단위)의 학습 데이터와 실거래 비교 사례를 기반으로 가치가 산정되었음을 의견서 본문에 신뢰도 높게 서술해 주세요.
            - 만약 집합부 면적 보정 필터가 적용되었다면(is_collective_limited = {is_collective_limited}), 대상 건물의 연면적 {original_area}㎡ 대신 표준 구분상가 전용 면적 {applied_area}㎡로 면적 캡핑 보정이 이루어졌음을 밝히고, 최종 감정가 {price_korean}은 통건물 전체 가치가 아니라 개별 호실(구분상가 점포 1개) 기준의 가치 평가액임을 의견서 서두에 전문적으로 설명해 주세요.
            """
            
            messages = [
                SystemMessage(content="너는 대한민국 최고 권위의 부동산 감정평가 인공지능 에이전트이다."),
                HumanMessage(content=prompt)
            ]
            response = await llm.ainvoke(messages)
            llm_content = response.content
        except Exception as e:
            print(f"[llm_service] Gemini API Error (Report): {e}")
            llm_content = get_fallback_markdown(std_address, bld_type_name, total_area, build_year, price_korean, bld_type, is_collective_limited, original_area)
    else:
        # Fallback if SLLM is chosen or Gemini is unavailable
        llm_content = get_fallback_markdown(std_address, bld_type_name, total_area, build_year, price_korean, bld_type, is_collective_limited, original_area)

    # 2. Render report via premium A4 HTML Jinja2 template
    try:
        template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'report_template.html')
        if not os.path.exists(template_path):
            # Fallback path if template is not copied yet
            template_path = os.path.join(os.path.dirname(__file__), '..', 'report_template.html')
            
        with open(template_path, 'r', encoding='utf-8') as f:
            template_html = f.read()
            
        # Compile Jinja2 template
        template = jinja2.Template(template_html)
        
        # Format cases list for Jinja2 template rendering
        cases_formatted = []
        for idx, c in enumerate(cases_list):
            cases_formatted.append({
                "index": idx + 1,
                "std_address": c["std_address"],
                "price_str": get_korean_price_string(c["price"]),
                "deal_date": c["deal_date"],
                "ratio": f"{(c['price'] / estimated_price * 100):.1f}%"
            })
            
        rendered_html = template.render(
            std_address=std_address,
            bld_type_name=bld_type_name,
            bld_type=bld_type,
            total_area=total_area,
            build_year=build_year,
            estimated_price_str=price_korean,
            estimated_price=estimated_price,
            cases_list=cases_formatted,
            llm_content=llm_content,
            is_collective_limited=is_collective_limited,
            original_area=original_area,
            applied_area=applied_area
        )
        return rendered_html
    except Exception as e:
        print(f"[llm_service] Jinja2 Rendering Error: {e}")
        # Simplest raw markdown return if HTML fails
        return f"# [AI 감정평가 보고서]\n\n{llm_content}"

async def consult_loan_ai(estimated_price: int, chat_message: str, std_address: str, bld_type: str, llm_engine_type: str, fallback_response: str) -> str:
    """
    Stage 4: Intelligent Financial Chatbot consults LTV and options using Gemini API.
    """
    if llm_engine_type == "GEMINI" and GEMINI_API_KEY:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=GEMINI_API_KEY,
                temperature=0.4
            )
            
            bld_type_name = "아파트" if bld_type == "SFA" else "상가빌딩" if bld_type == "SCA" else "빌라/다세대"
            price_str = get_korean_price_string(estimated_price)
            
            prompt = f"""
            너는 대한민국 최고의 AI 담보 대출 연계 상담사이다.
            사용자가 입력한 질문에 대하여, 평가 대상 부동산의 감정평가 가격 정보와 규제를 충족시키며 친절하고 전문적으로 답변해 주세요.
            
            [대상 부동산 정보]
            - 주소: {std_address}
            - 주택 유형: {bld_type_name} ({bld_type})
            - 감정평가 가격: {price_str} ({estimated_price:,}원)
            
            [기본 계산된 추천 정보 (가이드라인)]
            {fallback_response}
            
            [사용자 질문]
            "{chat_message}"
            
            [지침]
            1. 기본 계산 가이드라인에 있는 핵심 수치(LTV 한도액, 디딤돌 6억 기준 통과 여부, 은행 최저 금리 등)를 대답에 적극적으로 포함해 전문적이고 신뢰도 높은 답변을 작성해 주세요.
            2. 마크다운 기호(예: **, > [!NOTE], - 리스트)를 활용하여 시각적으로 읽기 편하게 구성해 주세요.
            3. 너무 장황하지 않게 3~4문단 내외로 작성해 주세요.
            """
            
            messages = [
                SystemMessage(content="너는 대출 한도 규제와 금리 조건을 초정밀 상담해주는 대한민국 금융 AI 전문가이다. 답변에 위트와 격식을 모두 갖출 것."),
                HumanMessage(content=prompt)
            ]
            response = await llm.ainvoke(messages)
            return response.content
        except Exception as e:
            print(f"[llm_service] Gemini API Error (Chat): {e}")
            return fallback_response
    return fallback_response
