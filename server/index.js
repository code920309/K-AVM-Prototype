import express from "express";
import cors from "cors";
import {
  getSpecByAddress,
  calculateAvm,
  generateReport,
  consultLoan
} from "db";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. [POST] /api/v1/avm/hook-spec (1단계: 주소 입력 즉시 호출 훅)
app.post("/api/v1/avm/hook-spec", (req, res) => {
  const { raw_address } = req.body;
  
  if (!raw_address) {
    return res.status(400).json({ error: "주소 정보가 누락되었습니다." });
  }

  console.log(`[Stage 1 Hook-Spec] Raw Address: ${raw_address}`);

  const spec = getSpecByAddress(raw_address);
  return res.json(spec);
});

// 2. [POST] /api/v1/avm/calculate (2단계: 본인인증 승인 후 최종 가치산정 호출)
app.post("/api/v1/avm/calculate", (req, res) => {
  const { std_address, bld_type, user_name } = req.body;

  if (!std_address || !bld_type) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  console.log(`[Stage 2 Calculate] Std Address: ${std_address}, Bld Type: ${bld_type}, User: ${user_name}`);

  const result = calculateAvm(std_address, bld_type, user_name);
  return res.json(result);
});

// 3. [POST] /api/v1/ai/generate-report (3단계: 보고서 생성 요구 시 호출)
app.post("/api/v1/ai/generate-report", (req, res) => {
  const { std_address, bld_type, total_area, build_year, estimated_price, cases_list, llm_engine_type } = req.body;

  if (!std_address || !estimated_price) {
    return res.status(400).json({ error: "감정평가서 작성 데이터가 불충분합니다." });
  }

  console.log(`[Stage 3 Report] Engine: ${llm_engine_type}, Address: ${std_address}`);

  const reportMarkdown = generateReport({
    std_address,
    bld_type,
    total_area,
    build_year,
    estimated_price,
    cases_list,
    llm_engine_type
  });

  // Return generated report after a brief simulated generation timeout (1.2 seconds) to make it feel extremely "real"
  setTimeout(() => {
    return res.json({ ai_report: reportMarkdown });
  }, 1200);
});

// 4. [POST] /api/v1/chat/loan-consult (4단계: 최종 활성화되는 대출 대화 API)
app.post("/api/v1/chat/loan-consult", (req, res) => {
  const { estimated_price, chat_message, std_address, bld_type } = req.body;

  if (!estimated_price || !chat_message) {
    return res.status(400).json({ error: "대출 질문 또는 산정 가격이 누락되었습니다." });
  }

  console.log(`[Stage 4 Chat] Query: "${chat_message}" for price: ${estimated_price}`);

  const chat_response = consultLoan({
    estimated_price,
    chat_message,
    std_address,
    bld_type
  });

  // Brief latency buffer
  setTimeout(() => {
    return res.json({ chat_response });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});
