---
title: K-AVM-Prototype
emoji: 🏠
colorFrom: violet
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 통합 AVM 및 금융 연계 플랫폼 (K-AVM-Prototype)

## 1. 배포 주소 (Deployment URL)
* Hugging Face Spaces 배포 서버: https://huggingface.co/spaces/donggyuuu/K-AVM-Prototype

## 2. 주요 화면 (Key Screens)
* 주소 실시간 자동 제안 검색 화면
  - 카카오 로컬 주소 API와 실시간 연동되어, 입력하는 주소 파편을 기반으로 표준 행정구역 주소를 실시간 자동 완성 및 추천 제안합니다.
* 공적대장 스펙 및 스트리트뷰 연동 카드
  - 선정된 주소에 대한 대한민국 공공 건축물대장을 조회하여 건물명, 연면적, 사용승인일, 주용도를 가시화하고, 구글 Maps 스트리트뷰 API를 통해 현장 전경 파노라마를 초고해상도로 출력합니다.
* 통합 AVM 3대 엔진 가치 산출 연산 카드
  - 세 종류의 거래사례비교법 엔진(SCA: 상가집합부, SFA: 단독/다가구, VSA: 연립/다세대)이 공시 정보 및 거래 이력을 분석하여 최종 감정가를 제시하며, 연면적이 비정상적으로 거대하여 가치가 왜곡되는 것을 막기 위한 구분상가 면적 보정 기능이 연동되어 작동합니다.
* A4 정밀 인쇄용 프리미엄 AI 감정보고서 뷰어
  - Jinja2 템플릿과 Google Gemini RAG 엔진이 결합되어 실거래 사례 비교와 인근 가치 평가 등급이 정밀 분석된 3페이지 분량의 초프리미엄 인쇄용 HTML 감정평가 리포트를 생성합니다.
* 실시간 대출 상담 AI 챗봇 인터페이스
  - 감정 완료된 최종 가치 데이터를 실시간 컨텍스트로 전달하여 최적의 대출 LTV, 담보 대출 금리 밴드, 대출 가능 한도 및 우대 이율 조항을 맞춤식으로 답변하는 지능형 가이드 챗봇을 제공합니다.

## 3. 핵심 기능 (Key Features)
* 정밀 주소 검색 및 좌표 매핑
  - 카카오 로컬 API와 연계하여 오타나 축약어 주소 입력 시에도 표준 주소와 정확한 위경도 좌표로 즉각 치환합니다.
* 공공 공적대장 실시간 수집 및 파싱
  - 국토교통부 건축물대장 오픈 API를 다각도로 쿼리하여 건축물의 공적 스펙 정보(구조, 면적, 용도, 사용승인일자)를 완전 자동 로딩합니다.
* 구글 스트리트뷰 전경 즉각 로딩
  - 변환된 위경도 정보를 Google Maps 파노라마 이미지 다운로더에 매핑하여 현장에 직접 방문한 것과 같은 건물의 입체 전경 이미지를 추출합니다.
* 하이브리드 AVM 3대 엔진 가치 산출 알고리즘
  - 감정평가의 공인 방식인 거래사례비교법을 기반으로 주거/상업 유형별로 세분화된 3대 특화 엔진인 SCA(상가집합부), SFA(단독/다가구), VSA(연립/다세대) 모델을 연동하여 정확한 가치를 산출합니다.
* 대형 구분상가 가치 왜곡 보정 레이어
  - 구분소유된 상가 면적이 과도하게 대형일 경우 통상적인 거래 가치 왜곡을 원천 예방하기 위해 표준 구분소유 면적으로 보정하여 단가를 계산하는 안전 장치가 적용되어 있습니다.
* Jinja2 및 Gemini API RAG 프리미엄 인쇄용 PDF 포맷 출력
  - 브라우저 인쇄(A4 세로 모드) 규격에 완벽히 레이아웃이 최적화된 고품격 A4 HTML 리포트를 발행하여 오프라인 보고서로 즉시 사용할 수 있습니다.
* MongoDB Atlas 및 인메모리 이중 장애 가용성 방어 (Hybrid Resilience Mode)
  - 네트워크 순단 등으로 외부 데이터베이스 연결이 실패하더라도 서비스 가동이 전면 차단되지 않도록 로컬 메모리 버퍼(Mock Memory History)로 자동 전환되는 완전 무중단 아키텍처를 도입했습니다.

## 4. 기술 스택 (Tech Stack)
* 프론트엔드
  - React (v18+)
  - TypeScript (v5+)
  - Vite
  - Tailwind CSS (스타일링 레이아웃)
  - Lucide Icons (벡터 아이콘)
  - Kakao Map SDK (실시간 주소 위치 확인)
* 백엔드
  - FastAPI (Python 3.10+)
  - Uvicorn (비동기 ASGI 서버)
  - Jinja2 (HTML 문서 실시간 템플릿 렌더링)
  - Pydantic v2 (타입 안정성 및 검증 스키마)
* 데이터베이스 및 저장소
  - MongoDB Atlas (클라우드 NoSQL 서비스)
  - Motor (FastAPI 비동기 MongoDB 드라이버)
  - In-memory Fallback Buffer Cache (장애 완충 레이어)
* AI 및 LLM 모델
  - Google Gemini 1.5 Pro / Flash API
  - Gemini AI RAG 컨텍스트 모델 아키텍처

## 5. 아키텍처 개요 (Architecture Overview)
```
[React/Vite 프론트엔드 UI] --(HTTP REST API)--> [FastAPI 백엔드 서비스]
                                                          |
             +--------------------+-----------------------+--------------------+
             v                    v                       v                    v
      [공공데이터포털 API]   [카카오 로컬 API]        [구글 Maps API]      [Gemini API RAG]
     (건축물대장/실거래)     (주소 자동 제안)       (스트리트뷰 파노라마)    (보고서 & 챗봇 생성)
                                                          |
                                                          v
                                                [MongoDB Atlas 저장소]
                                             (연결 장애 시 메모리 버퍼로 전환)
```

## 6. 프로젝트 구조 (Project Structure)
```
K-AVM-Prototype/
|-- front/                   # React/Vite 프론트엔드 애플리케이션
|   |-- src/
|   |   |-- App.tsx            # 메인 싱글 스크롤 UX 및 가치평가 대시보드
|   |   |-- App.css            # 글로벌 레이아웃 스타일
|   |   |-- index.css          # Tailwind CSS 커스텀 지시어
|   |   |-- main.tsx           # 리액트 가상 DOM 진입점
|   |   |-- types.ts           # 데이터 공통 타입 및 인터페이스
|   |   `-- assets/            # 정적 파일
|   |-- package.json           # 프론트엔드 의존성 및 빌드 스크립트
|   `-- tailwind.config.js     # 스타일 커스텀 테마 설정
|-- server/                  # FastAPI 백엔드 애플리케이션
|   |-- main.py                # 백엔드 서버 엔트리 포인트
|   |-- routers/               # API 컨트롤러 레이어
|   |   |-- avm.py             # 주소 검색, 대장 조회, AVM 연산 라우터
|   |   |-- report.py          # AI 감정평가서 발행 라우터
|   |   `-- chat.py            # 대출 가이드 챗봇 라우터
|   |-- services/              # 비즈니스 로직 코어
|   |   |-- engines/           # 유형별 거래사례비교 알고리즘 구현부 (SCA: 상가집합부, SFA: 단독/다가구, VSA: 연립/다세대)
|   |   |-- api_service.py     # 카카오/공공데이터/구글 외부 API 연동
|   |   |-- avm_service.py     # AVM 데이터 가치평가 오케스트레이션
|   |   |-- llm_service.py     # Gemini API RAG 및 HTML 템플릿 렌더링
|   |   `-- loan_service.py    # 챗봇 룰 기반 가이드 및 텍스트 파서
|   |-- db/                    # DB 드라이버 및 스키마
|   |   |-- mongodb.py         # MongoDB Atlas 비동기 연결 핸들러
|   |   `-- schemas.py         # Pydantic 데이터 검증 객체 정의
|   |-- report_template.html   # 프리미엄 A4 프린트용 HTML 인쇄 양식
|   |-- requirements.txt       # 파이썬 백엔드 패키지 사양
|   `-- .env                   # 서비스 비밀키 및 로컬 설정 파일
|-- Dockerfile               # Hugging Face Spaces 멀티스테이지 컨테이너 명세
|-- deploy_hf.bat            # 로컬 빌드 및 Hugging Face Spaces 동기화 스크립트
`-- README.md                # 전체 프로젝트 종합 문서
```

## 7. 설치 방법 (Installation Guide)

### 7.1 요구 조건 (Prerequisites)
* Node.js v18 이상 및 npm
* Python v3.10 이상
* 각 오픈 API 인증키 발급 (.env 설정 필요)

### 7.2 프론트엔드 빌드 및 배포 준비
```bash
cd front
npm install
npm run build
```
* 빌드가 완료되면 `front/dist` 디렉토리에 정적 에셋 파일이 생성됩니다. 백엔드 FastAPI 서버가 해당 경로의 정적 파일들을 서빙합니다.

### 7.3 백엔드 패키지 설치 및 실행
```bash
cd server
python -m venv venv
# Windows 환경 가상환경 활성화
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
* 서버가 작동되면 웹 브라우저에서 `http://localhost:7860` 주소로 즉시 통합 웹 화면에 진입할 수 있습니다.

## 8. 환경변수 전체 가이드 (Environment Variables Guide)
서버 구동을 위해서는 `server/.env` 파일 작성이 필수적입니다. 다음 가이드를 참고하여 작성해 주십시오.

```env
# Google Gemini API Key
# Gemini RAG 감정평가 설명 생성 및 금융 상담 챗봇 구동을 위해 필요합니다.
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# MongoDB Atlas Connection URI
# 검색 이력의 적재 및 과거 유사사례 탐색을 위한 원격 DB 커넥션 URI입니다.
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?appName=Cluster0

# Kakao REST API Key
# 실시간 행정구역 주소 자동 완성 및 지리 좌표 변환을 위한 로컬 서비스 키입니다.
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY

# 공공데이터포털 일반 인증키 (Encoding/Decoding 전체 키 지원)
# 국토교통부 표준 건축물대장 수집을 위해 공공데이터포털에서 발급받은 일반 인증키를 기재합니다.
PUBLIC_DATA_API_KEY=YOUR_PUBLIC_DATA_API_KEY

# Google Maps API Key
# 건물 위치 분석 및 Google Street View 정밀 로드 파노라마 이미지 추출용 키입니다.
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

## 9. 주요 API (Key APIs)

### 9.1 주소 실시간 자동 제안 API
* Endpoint: `GET /api/v1/avm/search`
* Query Parameter: `q` (검색어)
* Response: 카카오 로컬 API 기반 일치 주소 항목 배열

### 9.2 건축물대장 및 스트리트뷰 정보 조회 API
* Endpoint: `GET /api/v1/avm/info`
* Query Parameters: `sigunguCd`, `bjdongCd`, `bun`, `ji`, `lat`, `lon`
* Response: 공식 표제부 데이터 + Google Street View 이미지 base64 스트링

### 9.3 통합 AVM 3대 엔진 가치 산산 연산 API
* Endpoint: `POST /api/v1/avm/calculate`
* Request Body: 건축물의 구조 스펙 및 주소 매개변수
* Response: 최종 감정 가격, 인근 실거래 사례 매칭 3선 카드 데이터 및 제한 면적 왜곡 보정 적용 여부

### 9.4 프리미엄 AI A4 감정보고서 실시간 발행 API
* Endpoint: `POST /api/v1/ai/generate-report`
* Request Body: 가치 산정 산출물 및 거래사례비교 목록
* Response: 브라우저 프린터 규격에 부합하게 렌더링된 고화질 HTML 스트링

### 9.5 실시간 대출 상담 AI 챗봇 API
* Endpoint: `POST /api/v1/chat/loan-consult`
* Request Body: 대상 자산 산정액, 주소 스펙 및 사용자 채팅 메시지
* Response: Gemini RAG 및 룰 기반 하이브리드 금융 컨설턴트 챗봇의 분석 답변 텍스트

## 10. 모델 권장 (CPU 환경)
* 이 플랫폼의 하이브리드 AVM 추론 엔진(SCA, SFA, VSA)은 복잡한 심층 신경망 가중치를 CPU 인프라에서 병목 없이 고속 추론할 수 있도록 최적화된 통계 분석 및 매트릭스 수치 대조법을 사용하여 구현되었습니다.
* 이에 따라, 값비싼 고성능 GPU 리소스 없이 오직 일반 CPU 환경에서도 실시간 연산 요청을 10ms 이하의 속도로 고속 서빙합니다.
* 권장 사양
  - 최소 사양: 1 vCPU / 2GB RAM (Hugging Face Spaces CPU Basic 무료 플랜 환경 포함)
  - 권장 사양: 2 vCPU / 4GB RAM 이상

## 11. 트러블슈팅 (Troubleshooting)

### 11.1 MongoDB Atlas 연결 지연 및 네트워크 차단 현상
* 문제: 일부 인프라나 특수 클라우드 가상 사설망(VPN) 환경에서 방화벽 등으로 인해 MongoDB Atlas 연결 포트가 완전히 블로킹되거나 타임아웃 오류가 발생하여 전체 API 응답이 대기 상태에 빠지는 현상.
* 해결: 백엔드 모듈에 `Hybrid Resilience Fallback Buffer`를 장착하여, 초기 연결 수립 실패 시 즉각적으로 로컬 메모리 버퍼로 전환되어 검색 이력을 서빙하고 영구 디스크 입출력을 우회하여 시스템 장애율을 0%로 통제했습니다.

### 11.2 공공데이터포털 특수 기호 인코딩 처리 문제
* 문제: 공공데이터포털에서 발급한 일반 인증키 문자열에 `%` 등의 인코딩 특수 기호가 다수 유입되어, 백엔드에서 다시 URL 인코딩을 가했을 때 무효한 키로 판명되는 인증 에러 현상.
* 해결: 공공데이터포털 수집 모듈 내에서 원본 디코딩 키와 인코딩 키를 사전에 검사한 후 적절하게 분기 포매팅하여 쿼리를 전달하는 세이프 가드 필터를 백엔드 로더에 탑재했습니다.

### 11.3 거대 연면적 상가 가치 과대 계상 문제
* 문제: 집합 상가 평가 시 연면적이 비정상적으로 지나치게 거대하여 단가 승수 연산에 왜곡이 생겨 비현실적인 감정가가 도출되는 계산 이상치 현상.
* 해결: `Applied Area 보정 레이어`를 추가하여 대상 건축물의 면적이 특정 임계점을 상회할 경우 이를 가이드 표준 면적으로 치환 계산하고, 원본 면적과의 괴리 비율을 보정 상수로 가산 연산하는 보정기 알고리즘을 도입했습니다.

## 12. 향후 로드맵 (Future Roadmap)
* 권리분석 기능 도입
  - 대장 및 부동산 등기부등본 정보를 실시간 크롤링 및 파싱하여 근저당권, 압류, 가등기 등 채권 및 소유권 제한 사항에 대한 상세 권리분석 리포트를 제공합니다.
* 담보대출소개 파이프라인 연계
  - 감정된 가격과 사용자의 소득 정보를 바탕으로 제1금융권 및 제2금융권의 맞춤형 주택담보대출 상품을 자동으로 매칭하여 금리 및 한도를 설계하고 소개해 주는 연계 파이프라인을 구축합니다.
* 사용자 안전 본인인증 체계 도입
  - 민감한 개인 자산 조회 및 대출 컨설팅 프로세스의 보안 강화를 위해 PASS, 공동인증서, 간편인증(카카오, 네이버 등)을 통한 본인인증 레이어를 탑재합니다.
* 특수건물 및 전체 건물 평가 엔진 확장
  - 현재 개별 호실(구분소유) 기준인 상가집합부 조회 한계를 극복하기 위해 빌딩 전체나 상가 전체 건물 단위의 통합 가치 산정 모델을 구축하고, 병원 및 종교시설 등 특수목적 건물 전용의 평가 엔진을 추가로 도입합니다.
