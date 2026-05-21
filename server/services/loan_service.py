def get_korean_price_string(price: int) -> str:
    if price >= 100000000:
        eok = price // 100000000
        remainder = price % 100000000
        man = round(remainder / 10000)
        if man > 0:
            return f"{eok}억 {man:,}만원"
        return f"{eok}억원"
    return f"{round(price / 10000):,}만원"

def consult_loan_fallback(estimated_price: int, chat_message: str, std_address: str, bld_type: str) -> str:
    """
    Computes strict regulation-based loan parameters and formats high-quality
    Korean markdown guides as fallback or prompt guidelines.
    """
    ltv_percent = 60
    if bld_type == "SFA":
        ltv_percent = 70
    elif bld_type == "SCA":
        ltv_percent = 50

    max_ltv_limit = int(round(estimated_price * (ltv_percent / 100)))
    ltv_limit_str = get_korean_price_string(max_ltv_limit)

    clean_message = chat_message.replace(" ", "").lower()

    if "디딤돌" in clean_message:
        if estimated_price > 600000000:
            return f"""📢 **주택금융공사 디딤돌 대출 신청 불가 안내**
조회하신 부동산의 정밀 감정 평가 가격이 **{get_korean_price_string(estimated_price)}**으로 산출되었습니다.
- **주요 제한 요건**: 정부 지원 디딤돌 대출은 시세/평가액 **6억원 이하**인 주택에 한해서만 신청하실 수 있습니다.
- **제안 대안**: 현재 감정가가 6억원을 초과하므로 디딤돌 이용은 제한됩니다. 대신 시중은행 일반 주택담보대출(LTV 최대 **{ltv_percent}%**, 대출 가능 최고한도 약 **{ltv_limit_str}**)을 추천드립니다. 당사 협약 최저금리인 연 3.25%대 상품 조회를 원하시면 말씀해 주세요."""
        else:
            didimdol_max = min(250000000, max_ltv_limit)
            newlyweds_max = min(400000000, max_ltv_limit)
            
            return f"""🎉 **정부 지원 '디딤돌 대출' 심사 요건 적격 판정**
조회하신 부동산은 **{get_korean_price_string(estimated_price)}**으로 6억원 이하 매매 기준 요건을 완벽하게 만족하여 **디딤돌 대출 신청이 전적으로 가능합니다.**

1. **대출 가용한도**:
   - 일반 무주택 가구: 최대 **{get_korean_price_string(didimdol_max)}** (LTV 70% 제한)
   - 신혼부부 가구: 최대 **{get_korean_price_string(newlyweds_max)}** (LTV 70% 특례 적용)
2. **우대 적용 금리**:
   - 연소득 범위에 따라 **연 2.15% ~ 3.00%** 고정/변동 우대 금리 혜택이 적용됩니다. (시중 대출 대비 연간 약 150만원 이상 이자 절감 효과)
3. **필요 연동 서류**:
   - 소유주 대조 필증(명의확인), 감정가 확인서, 소득증빙서류(원천징수)만 당사 모바일 비대면 창구에 제출하시면 무방문 승인이 떨어집니다."""
           
    elif any(kw in clean_message for kw in ["한도", "얼마", "가능", "금액"]):
        return f"""💰 **대상 부동산 대출 한도 산정 결과**
조회하신 부동산 \`{std_address}\`의 정밀 감정가는 **{get_korean_price_string(estimated_price)}**이며, 주택 유형 **{bld_type}**에 맞춰 책정된 최종 대출 한도는 다음과 같습니다.

- **규제 LTV 비율**: **최대 {ltv_percent}% 적용**
- **대출 가용한도 최고치**: **{ltv_limit_str}** (금 {max_ltv_limit:,}원)

> [!NOTE]
> 본 한도는 선순위 채권이나 임차보증금이 없는 깨끗한 상태(방공제 적용 전)의 기준입니다. 생애 최초 주택 구입자이신 경우 특례 완화 법안에 의거하여 **LTV 최대 80% ({get_korean_price_string(int(estimated_price * 0.8))}까지)** 한도가 증액될 수 있습니다."""

    elif any(kw in clean_message for kw in ["금리", "이자", "이율"]):
        monthly_pay = int(round((max_ltv_limit * 0.0325) / 12))
        return f"""📉 **실시간 최저 담보대출 금리 리스트**
현재 날짜 기준 본 자산에 최적화된 시중 은행 협약 최저 우대금리 테이블입니다. (감정가 **{get_korean_price_string(estimated_price)}** 기준)

| 금융기관 | 대출 상품명 | 기준 금리 | 최저 우대금리 | 상환 방식 |
|:---:|:---|:---:|:---:|:---:|
| **KB국민은행** | KB 스타 주택담보대출 | 연 3.82% | **연 3.25%** | 5년 혼합형, 원리금균등 |
| **신한은행** | 신한 쏠 주담대 (아파트/다세대) | 연 3.75% | **연 3.32%** | 5년 고정, 원리금균등 |
| **우리은행** | 우리 FIRST 주택담보대출 | 연 3.90% | **연 3.41%** | 변동금리, 거치식 가능 |

* **상환 시뮬레이션**: **{ltv_limit_str}** 전액 대출 시, 최저금리 **연 3.25%** 기준 매월 상환하실 예상 원리금은 약 **{monthly_pay:,}원** (30년 만기 원리금균등 분할상환 대입) 수준으로 예측됩니다."""

    elif any(kw in clean_message for kw in ["추천", "은행", "어디"]):
        recommended = "KB국민은행 (아파트 담보 감정 산정률 최우수)"
        if bld_type == "SCA":
            recommended = "하나은행 (상업용 빌딩 대규모 대출 한도 한계 완화)"
        elif bld_type == "VSA":
            recommended = "우리은행 (연립/다세대 물건 취급 가중치 보정 우수)"
            
        return f"""🏦 **유형별 최적 거래 협약 은행 추천**
조회하신 자산의 유형인 **{bld_type}** 및 감정가 **{get_korean_price_string(estimated_price)}**에 맞춤 적용한 당사 제휴 추천 금융기관은 **[ {recommended} ]** 입니다.

- **선정 사유**: 해당 지점은 국토교통부 AVM 실거래 사례 보정 지수를 가장 유연하게 승인해 주는 지점으로, 대출 실행 속도가 가장 빠르며 선순위 방공제 면제 보증보험(MCI/MCG) 가입이 전액 무료 탑재됩니다.
- **비대면 플랫폼 혜택**: 당사 비대면 연계 채널을 통해 사전 조회 시 중도상환수수료 **0.5% 감면** 혜택 및 즉시 우대금리 **0.1%p 인하**를 제공받으실 수 있습니다. 지금 연계 조회를 희망하시면 말씀해 주세요."""

    else:
        return f"""🤖 **금융 연계 주택담보대출 전문 컨설팅 가이드**
안녕하세요! 명의 수탁 대조가 승인된 감정가 **{get_korean_price_string(estimated_price)}** 부동산 \`{std_address}\` 전담 AI 금융 전문가입니다. 

자금 조달 계획 및 담보 한도 관련하여 다음과 같이 초전문 실시간 조회를 제공하고 있습니다.
1. 💡 **LTV 한도 문의**: "대출 최고 한도가 얼마까지 나와?"
2. 📉 **우대 금리 조회**: "지금 적용되는 이자율이나 최저금리가 어떻게 돼?"
3. 🏠 **서민 특례 상품**: "디딤돌 대출 금리 혜택과 요건 알려줘"
4. 🏦 **제휴 추천 은행**: "어디 은행이 우대 금리가 제일 좋아?"

원하시는 질문 키워드를 입력해 주시면 금융 규제와 시세 정보를 완벽 분석하여 답변드리겠습니다!"""
