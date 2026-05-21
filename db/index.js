// Mock DB for the 4 suggested addresses
export const MOCK_SPEC_DATABASE = {
  "서울시 영등포구 여의도동 1": {
    std_address: "서울시 영등포구 여의동로 123",
    bld_type: "VSA",
    total_area: 84.95,
    build_year: 2018,
    roadview_url: "https://images.unsplash.com/photo-1534430480872-3498386e7a69?w=800&auto=format&fit=crop",
    owner_name: "홍길동",
    price: 515000000,
    cases: [
      { std_address: "여의동로 110", price: 495000000, deal_date: "2026-03-15" },
      { std_address: "여의동로 145", price: 530000000, deal_date: "2026-04-02" },
      { std_address: "여의동로 150", price: 500000000, deal_date: "2026-04-10" }
    ]
  },
  "서울 강남구 대치동 942-10": {
    std_address: "서울 강남구 대치동 테헤란로 82길 15",
    bld_type: "SFA",
    total_area: 112.5,
    build_year: 2020,
    roadview_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop",
    owner_name: "이몽룡",
    price: 1850000000,
    cases: [
      { std_address: "테헤란로 82길 9", price: 1790000000, deal_date: "2026-02-28" },
      { std_address: "테헤란로 82길 22", price: 1920000000, deal_date: "2026-03-20" },
      { std_address: "테헤란로 82길 25", price: 1840000000, deal_date: "2026-04-05" }
    ]
  },
  "경기 성남시 분당구 정자동 10": {
    std_address: "경기 성남시 분당구 정자일로 95",
    bld_type: "SCA",
    total_area: 345.2,
    build_year: 2015,
    roadview_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop",
    owner_name: "성춘향",
    price: 3450000000,
    cases: [
      { std_address: "정자일로 80", price: 3200000000, deal_date: "2026-01-18" },
      { std_address: "정자일로 110", price: 3650000000, deal_date: "2026-03-02" },
      { std_address: "정자일로 120", price: 3380000000, deal_date: "2026-04-12" }
    ]
  },
  "부산 해운대구 우동 1400": {
    std_address: "부산 해운대구 마린시티2로 33",
    bld_type: "SFA",
    total_area: 148.8,
    build_year: 2022,
    roadview_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop",
    owner_name: "장보고",
    price: 2450000000,
    cases: [
      { std_address: "마린시티2로 10", price: 2300000000, deal_date: "2026-02-10" },
      { std_address: "마린시티2로 45", price: 2600000000, deal_date: "2026-03-12" },
      { std_address: "마린시티2로 50", price: 2400000000, deal_date: "2026-04-01" }
    ]
  }
};

// Utility to convert price to Korean string (e.g. 5억 1,500만원)
export const getKoreanPriceString = (price) => {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000);
    const remainder = price % 100000000;
    const man = Math.round(remainder / 10000);
    if (man > 0) {
      return `${eok}억 ${man.toLocaleString("ko-KR")}만원`;
    }
    return `${eok}억원`;
  }
  return `${Math.round(price / 10000).toLocaleString("ko-KR")}만원`;
};

// 1단계 주소 훅 조회 비즈니스 로직
export const getSpecByAddress = (rawAddress) => {
  const trimmed = rawAddress.trim();
  const matched = MOCK_SPEC_DATABASE[trimmed];
  if (matched) {
    return {
      std_address: matched.std_address,
      bld_type: matched.bld_type,
      total_area: matched.total_area,
      build_year: matched.build_year,
      roadview_url: matched.roadview_url
    };
  }

  // Fallback dynamic generation for unknown addresses
  let bld_type = "VSA";
  if (trimmed.includes("아파트") || trimmed.includes("자이") || trimmed.includes("푸르지오") || trimmed.includes("래미안")) {
    bld_type = "SFA";
  } else if (trimmed.includes("빌딩") || trimmed.includes("타워") || trimmed.includes("상가") || trimmed.includes("대로")) {
    bld_type = "SCA";
  }

  const total_area = parseFloat((Math.random() * (150 - 45) + 45).toFixed(2));
  const build_year = Math.floor(Math.random() * (2024 - 1998) + 1998);
  const std_address = trimmed + " " + Math.floor(Math.random() * 90 + 10) + "길";

  return {
    std_address,
    bld_type,
    total_area,
    build_year,
    roadview_url: "https://images.unsplash.com/photo-1534430480872-3498386e7a69?w=800&auto=format&fit=crop" // default fallback roadview
  };
};

// 2단계 가치산정 비즈니스 로직
export const calculateAvm = (stdAddress, bldType, userName) => {
  let matchedEntry = null;
  for (const key in MOCK_SPEC_DATABASE) {
    if (MOCK_SPEC_DATABASE[key].std_address === stdAddress) {
      matchedEntry = MOCK_SPEC_DATABASE[key];
      break;
    }
  }

  if (matchedEntry) {
    const is_owner_matched = matchedEntry.owner_name === userName;
    return {
      is_owner_matched,
      estimated_price: matchedEntry.price,
      cases_list: matchedEntry.cases
    };
  }

  // Dynamic AVM model inference logic for custom address
  let basePricePerSqm = 5000000; // VSA base
  if (bldType === "SFA") basePricePerSqm = 8500000;
  if (bldType === "SCA") basePricePerSqm = 12000000;

  const area = 84.95;
  const estimated_price = Math.round(basePricePerSqm * area);

  // Generate 3 nearby real transaction cases
  const cleanRoad = stdAddress.replace(/\d+길$/, "").trim();
  const cases_list = [
    { std_address: `${cleanRoad} 10`, price: Math.round(estimated_price * 0.95), deal_date: "2026-03-15" },
    { std_address: `${cleanRoad} 45`, price: Math.round(estimated_price * 1.03), deal_date: "2026-04-02" },
    { std_address: `${cleanRoad} 50`, price: Math.round(estimated_price * 0.98), deal_date: "2026-04-10" }
  ];

  return {
    is_owner_matched: true, // Default true for sandbox demo
    estimated_price,
    cases_list
  };
};

// 3단계 감정서 생성 비즈니스 로직
export const generateReport = ({ std_address, bld_type, total_area, build_year, estimated_price, cases_list, llm_engine_type }) => {
  const engineName = llm_engine_type === "GEMINI" ? "Google Gemini Pro 3.5 Core Pipeline" : "In-House Proprietary sLLM Model v1.2";
  const priceKorean = getKoreanPriceString(estimated_price);

  // Format tables for transaction cases
  let casesTableLines = "";
  if (cases_list && cases_list.length > 0) {
    cases_list.forEach((c, idx) => {
      casesTableLines += `| ${idx + 1} | ${c.std_address} | ${getKoreanPriceString(c.price)} | ${c.deal_date} | ${(c.price / estimated_price * 100).toFixed(1)}% |\n`;
    });
  } else {
    casesTableLines = "| - | 사례 정보 없음 | - | - | - |\n";
  }

  const bldTypeName = bld_type === "SFA" ? "아파트 및 공동주택" : bld_type === "SCA" ? "상업 및 업무용 빌딩" : "연립주택 및 다세대 빌라";
  const avmMethod = bld_type === "SCA" ? "수익환원법 및 거래사례비교법 복합식" : "거래사례비교법 (Sales Comparison Approach)";

  // Detailed professional report text
  const reportMarkdown = `# 🏢 AI 감정평가 및 자산 분석 보고서
> [!IMPORTANT]
> 본 보고서는 공공 데이터(건축물대장) 및 국토교통부 실거래 데이터베이스를 바탕으로 **통합 AVM 엔진**이 정밀 연산한 추정 가격 분석서입니다. 본인인증 소유 확인 절차를 거쳐 공식 발행되었습니다.

---

### ## 1. 평가 대상 부동산 요약
- **소재 주소**: \`${std_address}\`
- **건축 분류**: \`${bldTypeName} (${bld_type})\`
- **전용 면적**: \`${total_area} ㎡\`
- **준공 년도**: \`${build_year}년 (준공 후 약 ${new Date().getFullYear() - build_year}년 경과)\`
- **검증 소유주**: 명의자 일치 승인됨

---

### ## 2. AVM 가치산정 및 추론 모델
- **최종 추정 감정가**: **${priceKorean}** (금 \\${estimated_price.toLocaleString("ko-KR")}원)
- **가치 산정 기법**: \`${avmMethod}\`
- **사용 분석 엔진**: \`${bld_type} 전용 정밀 가치 평가 모듈 v2.1\`
- **추론 공급 엔진**: \`${engineName}\`

> [!TIP]
> **준공 경과 연도 가치 감가 감안 비율**: 건물 연한에 따른 감가상각 가중치 약 **${(Math.max(60, 100 - (new Date().getFullYear() - build_year) * 0.8)).toFixed(1)}%**가 반영되어 산출되었습니다.

---

### ## 3. 인근 유사 건물 실거래 사례 비교 (최근 3개월)
본 자산의 반경 500m 이내에 위치한 동급 건물 유형의 실제 거래 사례를 기반으로 가치 보정을 수행하였습니다.

| 연번 | 유사 부동산 소재지 | 거래 금액 | 실거래 일자 | 대상 대비 가치비율 |
|:---:|:---|:---:|:---:|:---:|
${casesTableLines}

---

### ## 4. 종합 평가 및 미래 자산 가치 전망
- **시장 수급 동향**: 대상 물건이 속한 권역은 주거 편의성이 높고 직주근접성이 검증된 지역으로, 매매 및 전세 수요가 대단히 안정적인 흐름을 보이고 있습니다.
- **가치 보정 의견**: 최근 거래 사례 3개 대비 본 자산의 규모, 연식 및 층수를 1:1로 매칭하고 보정 지수를 적용한 결과, **${priceKorean}**선이 객관적인 담보 취득 가치 범위로 최종 확정되었습니다.
- **미래 자산성 전망**: 향후 1~2년간 인근 추가 개발 및 교통 호조가 예정되어 있어 급격한 시세 하락 리스크가 매우 낮으며, 향후 **담보 취득 시 대출 LTV 한도 승인율 100% 만족 수준**을 유지할 것으로 보입니다.

---
*본 감정평가서는 AI 시뮬레이션을 기초로 작성된 대고객 안내용 프로토타입 보고서입니다.*`;

  return reportMarkdown;
};

// 4단계 챗봇 비즈니스 로직
export const consultLoan = ({ estimated_price, chat_message, std_address, bld_type }) => {
  let ltvPercent = 60;
  if (bld_type === "SFA") ltvPercent = 70;
  if (bld_type === "SCA") ltvPercent = 50;

  const maxLtvLimit = Math.round(estimated_price * (ltvPercent / 100));
  const ltvLimitStr = getKoreanPriceString(maxLtvLimit);

  const cleanMessage = chat_message.replace(/\s+/g, "").toLowerCase();
  let chat_response = "";

  if (cleanMessage.includes("디딤돌")) {
    if (estimated_price > 600000000) {
      chat_response = `📢 **주택 금융공사 디딤돌 대출 대상 제한 고지**
조회하신 부동산의 감정 평가 가격이 **${getKoreanPriceString(estimated_price)}**으로 산출되었습니다.
- **제한 조건**: 정부 지원 주택담보대출(디딤돌 대출)은 부동산 평가액 **6억원 이하**(신혼가구/2자녀 이상 포함) 주택에 한해서만 신청이 가능합니다.
- **대안 권장**: 따라서 본 주택은 디딤돌 대출 이용이 어렵습니다. 대안으로 시중은행 일반 주택담보대출(LTV 최대 **${ltvPercent}%**, 한도 약 **${ltvLimitStr}**)이나 특례 정책성 상품의 이용 방안을 즉각 권장 드립니다. 제휴 은행(국민, 신한 등)의 최저 우대금리(연 3.35%~) 금리 테이블 조회를 진행해 드릴까요?`;
    } else {
      const didimdolMax = Math.min(250000000, maxLtvLimit);
      const newlywedsMax = Math.min(400000000, maxLtvLimit);

      chat_response = `🎉 **정부 지원 '디딤돌 대출' 요건 정밀 충족 결과**
조회하신 부동산은 **${getKoreanPriceString(estimated_price)}**으로 6억원 이하 요건을 충족하여 **디딤돌 대출 신청이 전적으로 가능합니다.**

1. **대출 가용한도**:
   - 일반 무주택자 가구: 최대 **${getKoreanPriceString(didimdolMax)}** (LTV 70% 제한)
   - 신혼부부 가구: 최대 **${getKoreanPriceString(newlywedsMax)}** (LTV 70% 특례 적용)
2. **현재 기준 적용 금리**:
   - 소득 및 대출 기간에 따라 **연 2.15% ~ 3.00%** 고정/변합 금리 적용 (시중은행 일반 주담대 대비 연간 약 **120만~240만원 이자 절감 효과**)
3. **신청 필요 서류**:
   - 명의 수탁 대조 완료된 이 감정평가 데이터와 함께 소득 증빙(원천징수 영수증), 본인 신분증, 등본을 구비하시면 당사 모바일 앱에서 즉시 무방문 연동 승인이 떨어집니다. 
   
추가로 가구원 구성(신혼/다자녀 등)이나 연소득 정보를 입력해 주시면 적용 금리를 0.1%p 단위로 정밀 산출해 드리겠습니다!`;
    }
  } else if (cleanMessage.includes("한도") || cleanMessage.includes("얼마") || cleanMessage.includes("가능")) {
    chat_response = `💰 **대상 주택 대출 취득 정밀 한도 산정 결과**
조회하신 부동산 \`${std_address}\` 의 감정가는 **${getKoreanPriceString(estimated_price)}**이며, 건물 유형인 **${bld_type === "SFA" ? "아파트(SFA)" : bld_type === "SCA" ? "상가빌딩(SCA)" : "연립다세대(VSA)"}** 요건에 맞춰 산정된 주택담보 한도는 다음과 같습니다.

- **규제 LTV 비율**: **최대 ${ltvPercent}% 적용**
- **대출 가능액 최고 한도**: **${ltvLimitStr}** (금 ${maxLtvLimit.toLocaleString("ko-KR")}원)

> [!NOTE]
> 해당 한도는 타 행에 우선 순위 채권이나 선순위 보증금이 없는 상태(방공제 적용 전)의 기준 최고 한도입니다. 생애 최초 주택 구입자이신 경우 특례 법안에 의거하여 **LTV 최대 80% (${getKoreanPriceString(Math.round(estimated_price * 0.8))}까지)** 완화 한도 적용이 가능할 수 있습니다. 

생애 최초 적용 여부나 DSR 규제 포함 여부를 정밀 확인하시겠습니까?`;
  } else if (cleanMessage.includes("금리") || cleanMessage.includes("이자") || cleanMessage.includes("이율")) {
    chat_response = `📉 **실시간 최저 금리 및 금융 연계 제안**
현재 날짜 기준 본 주택의 시중 은행 담보 대출 협약 최저 금리 리스트입니다. (감정가 **${getKoreanPriceString(estimated_price)}** 기준 우대 승인 테이블)

| 금융기관 | 대출 상품명 | 기준 금리 | 최저 우대금리 | 상환 방식 |
|:---:|:---|:---:|:---:|:---:|
| **KB국민은행** | KB 스타 주택담보대출 | 연 3.82% | **연 3.25%** | 5년 혼합형, 원리금균등 |
| **신한은행** | 신한 쏠 주담대 (아파트/다세대) | 연 3.75% | **연 3.32%** | 5년 고정, 원리금균등 |
| **우리은행** | 우리 FIRST 주택담보대출 | 연 3.90% | **연 3.41%** | 변동금리, 거치식 가능 |

*우대 금리는 청약 통장 보유 여부, 신용카드 실적, 급여 이체 실적에 따라 즉시 최대로 적용받을 수 있습니다.*

**${getKoreanPriceString(maxLtvLimit)}** 한도로 대출 시, 최저 금리 **연 3.25%**를 대입하면 매월 납입할 예상 원리금은 **${(Math.round((maxLtvLimit * 0.0325) / 12)).toLocaleString("ko-KR")}원** (30년 만기 원리금균등 상환 기준) 수준으로 예측됩니다. 더 상세한 이자 스케줄링 테이블 조회를 개시할까요?`;
  } else if (cleanMessage.includes("추천") || cleanMessage.includes("은행") || cleanMessage.includes("어디")) {
    const recommendedBank = bld_type === "SFA" ? "KB국민은행 (아파트 담보 감정 산정 최우수)" : bld_type === "SCA" ? "하나은행 (상업 빌딩 대형 대출 한도 우대)" : "우리은행 / 신한은행 (연립주택 취급 보정 수탁 우수)";
    chat_response = `🏦 **유형별 최적의 거래 추천 은행 추천 가이드**
대상 건물의 유형인 **${bld_type}**과 감정가 **${getKoreanPriceString(estimated_price)}**에 맞춰, 우대 금리와 한도를 최대로 보장받을 수 있는 당사 제휴 1순위 추천 은행은 **[ ${recommendedBank} ]** 입니다.

- **추천 사유**: 해당 은행은 최근 국토교통부 AVM 거래사례 수탁율이 가장 높아, 실거래 오차 보정 승인이 가장 빠르며 추가 한도 증액 옵션(방공제 면제 상품 연동)을 무료로 탑재하여 대출 한도 하락을 완전히 방어할 수 있습니다.
- **즉시 혜택**: 플랫폼을 통해 비대면 즉시 연계 한도 심사 접수 시, 중도상환수수료 **0.5%p 감면** 혜택 및 모바일 대출 약정 금리 **0.1%p 특별 추가 인하**가 적용됩니다.

지금 해당 은행 비대면 사전 심사 단계로 1초 연동해 드릴까요?`;
  } else {
    chat_response = `🤖 **금융 전문 AVM 담보 대출 종합 컨설팅**
안녕하세요! 명의 수탁 대조 완료 및 **${getKoreanPriceString(estimated_price)}**으로 산출된 부동산(\`${std_address}\`) 전문 AI 대출 상담사입니다.

현재 자산 가치에 특화하여 다음과 같은 상세 정보를 상시 안내해 드리고 있습니다.
1. 💡 **LTV 최고 한도 조회**: "대출 한도 얼마까지 가능해?"
2. 📉 **최고 우대 금리 분석**: "지금 최저 이자나 금리가 어떻게 돼?"
3. 🏠 **특례 정책 대출 대조**: "서민 디딤돌 대출 조건 충족하는지 알려줘"
4. 🏦 **제휴 최적 은행 추천**: "어떤 은행 금리가 가장 저렴해?"

질문하고자 하시는 금융 연계 조건이나 고민이 있으시다면 언제든 편하게 입력창에 말씀해 주시기 바랍니다!`;
  }

  return chat_response;
};
