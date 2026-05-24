import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Clock,
  Calculator,
  Coins,
  MessageSquare,
  MapPin,
  RotateCcw,
  FileText,
  ChevronRight,
  UserCheck,
  Info,
  Trash2,
  ArrowRight,
  Building,
  Check,
  ImageOff,
  AlertTriangle,
  Download
} from "lucide-react";
import type {
  BldType,
  CalculateData,
  StageType,
  TimelineItem,
  SearchHistoryItem,
  BuildingOfficialData,
  KakaoAddressItem
} from "./types";
import MarkdownRenderer from "./components/MarkdownRenderer";


export default function App() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [recentAddresses, setRecentAddresses] = useState<SearchHistoryItem[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageType>("ADDRESS_INPUT");
  const [llmEngineType, setLlmEngineType] = useState<"GEMINI" | "SLLM">("GEMINI");
  const [reportModalHtml, setReportModalHtml] = useState<string | null>(null);

  // Autocomplete search states
  const [searchResults, setSearchResults] = useState<KakaoAddressItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Storage states for standard AVM flow
  const [currentSpec, setCurrentSpec] = useState<BuildingOfficialData | null>(null);
  const [currentAvmResult, setCurrentAvmResult] = useState<CalculateData | null>(null);
  const [userName, setUserName] = useState("홍길동");

  // Authentication Delay State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownAddress, setCountdownAddress] = useState("");

  const timelineEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Recent Addresses from database on mount
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/v1/avm/history");
      if (res.ok) {
        const data: SearchHistoryItem[] = await res.json();
        setRecentAddresses(data);
      }
    } catch (e) {
      console.error("Failed to fetch search history", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Real-time search address input (Instantly fetch without debounce delay)
  useEffect(() => {
    if (addressInput.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const fetchSearch = async () => {
      try {
        const res = await fetch(`/api/v1/avm/search?q=${encodeURIComponent(addressInput)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error("Search failed", e);
      }
    };

    fetchSearch();
  }, [addressInput]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll to bottom whenever timeline changes
  useEffect(() => {
    const timer = setTimeout(() => {
      timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [timeline, countdown]);

  // Handle countdown timer for 5-second intercept
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown completed! Trigger F-UI-02 가로채기 Lock
      setCountdown(null);
      setIsInputDisabled(true);
      setCurrentStage("AUTH_WAIT");

      const authReqId = "auth-req-" + Date.now();
      setTimeline(prev => [
        ...prev,
        {
          id: authReqId,
          type: "auth_request",
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          data: { address: countdownAddress }
        }
      ]);
    }
  }, [countdown, countdownAddress]);

  // Delete search history item individually
  const deleteHistoryItem = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/avm/history/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  // Clear search address history
  const clearHistory = async () => {
    try {
      await Promise.all(
        recentAddresses.map(item =>
          fetch(`/api/v1/avm/history/${item.id}`, { method: "DELETE" })
        )
      );
      fetchHistory();
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  };

  // Reset timeline and start whole flow with fresh address
  const startAvmFlow = async (target: string | KakaoAddressItem) => {
    let addressName = "";
    let kakaoItem: KakaoAddressItem | null = null;

    if (typeof target === "string") {
      addressName = target;
    } else {
      addressName = target.address_name;
      kakaoItem = target;
    }

    if (!addressName.trim()) return;

    // Reset all interactive states
    setCountdown(null);
    setIsInputDisabled(true);
    setCurrentStage("ADDRESS_INPUT");
    setCurrentSpec(null);
    setCurrentAvmResult(null);
    setShowDropdown(false);

    // Initial query card added
    const queryId = "q-" + Date.now();
    const specLoadingId = "spec-load-" + Date.now();

    setTimeline([
      {
        id: queryId,
        type: "address_query",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: addressName
      },
      {
        id: specLoadingId,
        type: "spec_card",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isLoading: true
      }
    ]);

    try {
      // 만약 target이 string이라면 먼저 카카오 검색 API를 수행해서 정보를 가져옴 (히스토리나 추천 주소 대응)
      if (!kakaoItem) {
        const searchRes = await fetch(`/api/v1/avm/search?q=${encodeURIComponent(addressName)}`);
        if (!searchRes.ok) {
          throw new Error("주소 검색 결과가 존재하지 않거나 실패했습니다.");
        }
        const searchData: KakaoAddressItem[] = await searchRes.json();
        if (searchData.length === 0) {
          throw new Error("유효한 주소 검색 결과를 찾을 수 없습니다.");
        }
        kakaoItem = searchData[0];
      }

      // Stage 1: [주소 입력] -> Fetch preliminary spec details
      const params = new URLSearchParams({
        sigunguCd: kakaoItem.sigungu_cd,
        bjdongCd: kakaoItem.bjdong_cd,
        bun: kakaoItem.bun,
        ji: kakaoItem.ji,
        lat: kakaoItem.y,
        lon: kakaoItem.x
      });

      const response = await fetch(`/api/v1/avm/info?${params.toString()}`);

      if (!response.ok) {
        let errMsg = "공공 건축물대장 및 스트리트뷰 정보를 가져오는데 실패했습니다.";
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMsg = errData.detail;
          }
        } catch (e) {
          // fallback to default
        }
        throw new Error(errMsg);
      }

      const specData: BuildingOfficialData = await response.json();
      setCurrentSpec(specData);
      fetchHistory(); // DB 적재 후 목록 갱신

      // Replace loading item with real spec data card in the timeline
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === specLoadingId) {
            return {
              ...item,
              isLoading: false,
              data: specData
            };
          }
          return item;
        });
      });

      // Stage 2: Trigger the precise 5-second countdown lock logic (F-UI-02)
      setCountdownAddress(specData.std_address);
      setCountdown(5);

    } catch (err: any) {
      console.error(err);
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === specLoadingId) {
            return {
              ...item,
              isLoading: false,
              type: "system_notice",
              text: `[오류] 가치산정 차단 중 오류 발생: ${err?.message || "서버 통신 실패"}`
            };
          }
          return item;
        });
      });
      setIsInputDisabled(false);
    }
  };

  const handleAddressFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || isInputDisabled) return;

    // 만약 현재 자동완성 검색 결과가 있으면 첫 번째 결과를 사용해 조회 시작
    if (searchResults.length > 0) {
      const firstItem = searchResults[0];
      setAddressInput("");
      startAvmFlow(firstItem);
    } else {
      const searchVal = addressInput;
      setAddressInput("");
      startAvmFlow(searchVal);
    }
  };

  // Perform demo verification release action
  const handleAuthConfirmSubmit = async () => {
    if (!currentSpec) return;

    // Transition to evaluation stage
    setCurrentStage("AVM_RUNNING");

    // Replace the specific verification card with an authorized status inside timeline
    setTimeline(prev => {
      return prev.map(item => {
        if (item.type === "auth_request") {
          return {
            ...item,
            text: `🔒 : 소유자 정보 일치 판정 (인증 완료 - 승인자: ${userName})`
          };
        }
        return item;
      });
    });

    const avmLoadingId = "avm-load-" + Date.now();
    setTimeline(prev => [
      ...prev,
      {
        id: avmLoadingId,
        type: "avm_result",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isLoading: true
      }
    ]);

    try {
      // Stage 3: AVM Model Calculation (F-AVM-02)
      const res = await fetch("/api/v1/avm/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          std_address: currentSpec.std_address,
          bld_type: currentSpec.bld_type,
          user_name: userName,
          bld_nm: currentSpec.bld_nm,
          tot_area: currentSpec.total_area,
          grnd_flr_ar: currentSpec.grnd_flr_ar,
          use_aprv_day: currentSpec.build_year ? `${currentSpec.build_year}0101` : "20180101",
          sigungu_cd: currentSpec.sigungu_cd,
          bjdong_nm: (() => {
            const parts = currentSpec.std_address.split(' ');
            const matched = parts.find(p => p.endsWith('동') || p.endsWith('읍') || p.endsWith('면'));
            return matched || "망미동";
          })(),
          bun: currentSpec.bun,
          ji: currentSpec.ji
        })
      });

      if (!res.ok) {
        throw new Error("정밀 감정가 연산에 실패했습니다.");
      }

      const avmData: CalculateData = await res.json();
      setCurrentAvmResult(avmData);

      // Rendering outcome
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === avmLoadingId) {
            return {
              ...item,
              isLoading: false,
              data: {
                spec: currentSpec,
                avm: avmData
              }
            };
          }
          return item;
        });
      });

    } catch (err: any) {
      console.error(err);
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === avmLoadingId) {
            return {
              ...item,
              isLoading: false,
              type: "system_notice",
              text: `[오류] 감정평가 연산 모델 수행 중 지연 발생: ${err?.message || "서버 점검 중"}`
            };
          }
          return item;
        });
      });
    }
  };

  // Perform LLM Report Generation (F-LLM-01)
  const generateAiReport = async () => {
    if (!currentSpec || !currentAvmResult) return;

    setCurrentStage("REPORT_GENERATING");

    const reportLoadingId = "report-load-" + Date.now();
    setTimeline(prev => [
      ...prev,
      {
        id: reportLoadingId,
        type: "ai_report",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isLoading: true
      }
    ]);

    try {
      const res = await fetch("/api/v1/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          std_address: currentSpec.std_address,
          bld_type: currentSpec.bld_type,
          total_area: currentSpec.total_area,
          build_year: currentSpec.build_year,
          estimated_price: currentAvmResult.estimated_price,
          cases_list: currentAvmResult.cases_list,
          llm_engine_type: llmEngineType
        })
      });

      if (!res.ok) {
        throw new Error("보고서 실시간 출력 생성 요건 오류");
      }

      const reportData = await res.json();

      // Update report card
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === reportLoadingId) {
            return {
              ...item,
              isLoading: false,
              text: reportData.ai_report
            };
          }
          return item;
        });
      });

      // Stage 4: Trigger loan-chat sessions (F-CHAT-01)
      const notifyId = "sys-notify-" + Date.now();
      setTimeline(prev => [
        ...prev,
        {
          id: notifyId,
          type: "system_notice",
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          text: "[안내] AI 담보대출 연계 상담 모드가 즉각 개방되었습니다. 이제 하단 입력창을 통해 이 주택에 관한 디딤돌 대출 자격 여부, 대출 LTV 한도, 우대 금리 등을 자유롭게 질문하십시오."
        }
      ]);

      setCurrentStage("CHAT_ACTIVE");
      setIsInputDisabled(false);

    } catch (err: any) {
      console.error(err);
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === reportLoadingId) {
            return {
              ...item,
              isLoading: false,
              type: "system_notice",
              text: `[오류] 감정 보고서 작성 실패: ${err?.message || "서버 통신 실패"}`
            };
          }
          return item;
        });
      });
      setIsInputDisabled(false);
    }
  };

  // Perform chatbot consultations (F-CHAT-01)
  const handleChatFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentAvmResult || isInputDisabled) return;

    const userMessage = chatInput;
    setChatInput("");
    setIsInputDisabled(true);

    const userMsgId = "c-user-" + Date.now();
    const botLoadingId = "c-bot-wait-" + Date.now();

    setTimeline(prev => [
      ...prev,
      {
        id: userMsgId,
        type: "chat_message",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: userMessage
      },
      {
        id: botLoadingId,
        type: "chat_response",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isLoading: true
      }
    ]);

    try {
      const res = await fetch("/api/v1/chat/loan-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_price: currentAvmResult.estimated_price,
          chat_message: userMessage,
          std_address: currentSpec?.std_address || "",
          bld_type: currentSpec?.bld_type || "VSA",
          llm_engine_type: llmEngineType
        })
      });

      if (!res.ok) {
        throw new Error("상담 컨설팅 응답 실패");
      }

      const consultData = await res.json();

      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === botLoadingId) {
            return {
              ...item,
              isLoading: false,
              text: consultData.chat_response
            };
          }
          return item;
        });
      });

    } catch (err: any) {
      console.error(err);
      setTimeline(prev => {
        return prev.map(item => {
          if (item.id === botLoadingId) {
            return {
              ...item,
              isLoading: false,
              type: "system_notice",
              text: `[오류] 전문상담사 통신 지연: ${err?.message || "네트워크를 검토해 주세요"}`
            };
          }
          return item;
        });
      });
    } finally {
      setIsInputDisabled(false);
    }
  };

  // Human price converter wrapper for the UI
  const getKoreanPriceString = (price: number): string => {
    if (price >= 100000000) {
      const eok = Math.floor(price / 100000000);
      const remainder = price % 100000000;
      const man = Math.round(remainder / 10000);
      if (man > 0) {
        return `${eok}억 ${man.toLocaleString('ko-KR')}만원`;
      }
      return `${eok}억원`;
    }
    return `${Math.round(price / 10000).toLocaleString('ko-KR')}만원`;
  };

  // Restart flow
  const handleRestart = () => {
    setTimeline([]);
    setCurrentStage("ADDRESS_INPUT");
    setCurrentSpec(null);
    setCurrentAvmResult(null);
    setCountdown(null);
    setIsInputDisabled(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50" id="main-root-container">

      {/* 1. LEFT SIDEBAR: Grid 2 (col-span-2 equivalent) */}
      <aside className="w-64 flex-shrink-0 hidden md:flex flex-col bg-white border-r border-slate-200/80 p-5 h-full overflow-hidden select-none" id="left-sidebar-navigation">

        {/* Brand Logo Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="bg-violet-600 rounded-xl p-2 text-white flex items-center justify-center shadow-lg shadow-violet-100">
            <Calculator size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="font-bold text-[15px] text-slate-800 tracking-tight block leading-none">
              통합 AVM 플랫폼
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">REAL-TIME CORE V2</span>
          </div>
        </div>



        {/* Recent Search Address History */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-500 tracking-wide flex items-center gap-1">
              <Clock size={13} className="text-slate-400" />
              인증 검색 히스토리
            </h3>
            {recentAddresses.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded-lg transition-colors flex items-center gap-0.5"
                title="기록 전체 삭제"
              >
                <Trash2 size={10} />
                비우기
              </button>
            )}
          </div>

          {recentAddresses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <MapPin size={24} className="text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                조사된 주소가 없습니다.<br />주소를 입력하여 조회를 시작하세요.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {recentAddresses.map((item) => (
                <div
                  key={item.id}
                  className="relative w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-50/30 transition-all group cursor-pointer"
                  onClick={() => startAvmFlow(item.raw_address)}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[9px] text-slate-400 font-mono tracking-wider">
                      {new Date(item.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || item.timestamp}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-200 transition-colors">
                        가치산정
                      </span>
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                        title="이 기록 삭제"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-700 truncate mb-1">
                    {item.raw_address}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                    <Check size={10} className="text-emerald-500 flex-shrink-0" />
                    {item.std_address}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer signature */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-500">보안 통신 채널</span>
          </div>
          {currentStage !== "ADDRESS_INPUT" && (
            <button
              onClick={handleRestart}
              className="text-slate-500 hover:text-violet-600 flex items-center gap-0.5 hover:underline font-bold"
            >
              <RotateCcw size={10} />
              새로고침
            </button>
          )}
        </div>
      </aside>

      {/* 2. MAIN AREA: Grid 8 (col-span-8 equivalent) */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 relative overflow-hidden" id="right-main-timeline">

        {/* Top Header bar */}
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 z-10 select-none shadow-sm shadow-slate-100/50">
          <div className="flex items-center gap-3">
            <span className="md:hidden bg-violet-600 rounded-xl p-2 text-white flex items-center justify-center shadow-md">
              <Calculator size={16} />
            </span>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-slate-900 tracking-tight leading-none flex items-center gap-2">
                AI 감정평가 플랫폼
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">


            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                AVM CORE V2.1
              </span>
            </div>
          </div>
        </header>

        {/* Timeline Scroll Area */}
        <section className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]" id="interactive-timeline-scroll">

          {timeline.length === 0 ? (
            /* INTRO WELCOME BOARD */
            <div className="max-w-2xl mx-auto py-16 text-center select-none animate-fade-in-up" id="intro-welcome-card">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-violet-600 shadow-xl shadow-violet-100/30 pulse-glow">
                <Calculator size={32} className="stroke-[2]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                단일 타임라인 대화형 가치산정
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                부동산 주소 조회부터 1차 공공대장 스펙, 5초 지연 인풋 본인인증, 3대 정밀 AVM 분석 리포트 및 대출 상담까지 한 화면에서 연속 스크롤로 진행됩니다.
              </p>
              {/* Steps Visual Guide Block */}
              <div className="mt-12 bg-white rounded-3xl p-6 border border-slate-200/80 max-w-md mx-auto text-left shadow-md">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1 justify-center sm:justify-start">
                  <Info size={13} className="text-slate-500" />
                  AI 감정평가 순서
                </h4>
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">1</span>
                    <p>주소 검색</p>
                    <MapPin size={12} className="text-violet-500" />

                  </div>
                  <div className="flex items-start gap-3 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">2</span>
                    <p>기본 공공 스펙 및 로드뷰 확인 본인확인</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">3</span>
                    <p> AVM 3대 엔진이 실행 / 최종 감정가와 유사거래 3선 카드가 연동</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">4</span>
                    <p>생성된 보고서 확인 및 출력</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">5</span>
                    <p>부동산 건물(권리분석 & 대출 상담) 챗봇</p>
                  </div>
                </div>
              </div>


            </div>
          ) : (
            /* TIMELINE STREAM OF CARDS */
            <div className="max-w-3xl mx-auto space-y-8 pb-10">
              {timeline.map((card) => {

                // 1) USER raw address search query card
                if (card.type === "address_query") {
                  return (
                    <div key={card.id} className="flex flex-col items-end gap-1.5 animate-fade-in-up">
                      <div className="text-[10px] text-slate-400 mr-1 flex items-center gap-1 font-semibold font-mono">
                        <span>사용자 검색 주소</span>
                        <span>•</span>
                        <span>{card.timestamp}</span>
                      </div>
                      <div className="bg-slate-800 text-white px-5 py-3 rounded-2xl rounded-tr-none text-sm font-bold shadow-md max-w-[85%] flex items-center gap-2 border border-slate-700">
                        <MapPin size={16} className="text-violet-300 flex-shrink-0" />
                        <span>{card.text}</span>
                      </div>
                    </div>
                  );
                }

                // 2) PRELIMINARY raw address spec details card
                if (card.type === "spec_card") {
                  if (card.isLoading) {
                    return (
                      <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 animate-pulse">
                          <Building size={14} />
                        </div>
                        <div className="flex-1 bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-3.5 max-w-[85%] animate-pulse">
                          <div className="h-4 bg-slate-200/70 rounded-full w-1/3" />
                          <div className="h-3 bg-slate-200/70 rounded-full w-2/3" />
                          <div className="h-40 bg-slate-200/60 rounded-2xl w-full" />
                        </div>
                      </div>
                    );
                  }

                  const spec: BuildingOfficialData = card.data;
                  const tagColors: Record<BldType, string> = {
                    SCA: "bg-amber-50 text-amber-600 border-amber-200/60",
                    SFA: "bg-sky-50 text-sky-600 border-sky-200/60",
                    VSA: "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                  };
                  const tagNames: Record<BldType, string> = {
                    SCA: "상가집합부 및 집합상가 (SCA)",
                    SFA: "단독주택 및 다가구주택 (SFA)",
                    VSA: "연립주택 및 빌라/다세대단지 (VSA)"
                  };

                  return (
                    <div key={card.id} className="space-y-3.5 animate-fade-in-up">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <Sparkles size={14} className="stroke-[2.5]" />
                        </div>

                        {/* Spec layout body */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden max-w-[85%] flex flex-col">

                          {/* Top Header Tag */}
                          <div className="bg-slate-50/70 px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Building size={13} className="text-violet-600" />
                              공공 건축물대장 1차 조회 성공
                            </span>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${tagColors[spec.bld_type]}`}>
                              {tagNames[spec.bld_type]}
                            </span>
                          </div>

                          {/* Specifications detail */}
                          <div className="p-5 space-y-4 text-slate-700">
                            <div>
                              <div className="text-[10px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">표준 정제 주소</div>
                              <p className="font-extrabold text-sm text-slate-800 flex items-center gap-1 leading-snug">
                                <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                {spec.std_address}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                                <span className="text-[10px] text-slate-400 font-bold block mb-1">공급 및 전용면적</span>
                                <span className="text-xs font-extrabold text-slate-700">{spec.total_area} ㎡</span>
                              </div>
                              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                                <span className="text-[10px] text-slate-400 font-bold block mb-1">준공 경과 년수</span>
                                <span className="text-xs font-extrabold text-slate-700">{spec.build_year}년 준공</span>
                              </div>
                            </div>

                            {/* 건물명 + 용도 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                                  {spec.bld_nm && spec.bld_nm.includes("구조") ? "건물구조" : "건물명"}
                                </span>
                                <span className="text-xs font-extrabold text-slate-700 truncate block">{spec.bld_nm || "(정보 없음)"}</span>
                              </div>
                              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                                <span className="text-[10px] text-slate-400 font-bold block mb-1">주용도</span>
                                <span className="text-xs font-extrabold text-slate-700 truncate block">{spec.main_purps_cd_nm}</span>
                              </div>
                            </div>

                            {/* Street View Panel */}
                            {spec.panorama_status === "SUCCESS" && spec.panorama_image ? (
                              <div className="mt-3.5 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                                <img
                                  src={`data:image/jpeg;base64,${spec.panorama_image}`}
                                  alt="Google 스트리트뷰 미리보기"
                                  className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-[2px] text-white font-mono text-[9px] font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                                  <MapPin size={9} className="text-emerald-400" />
                                  GOOGLE STREET VIEW
                                </div>
                              </div>
                            ) : spec.panorama_status === "NO_IMAGE" ? (
                              <div className="mt-3.5 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 h-44">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                  <ImageOff size={20} className="text-slate-400" />
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-bold text-slate-500">스트리트뷰 미제공 지역</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">해당 주소의 로드뷰 촬영본이 존재하지 않습니다.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3.5 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 h-44">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <AlertTriangle size={20} className="text-amber-500" />
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-bold text-amber-700">스트리트뷰 API 오류</p>
                                  <p className="text-[10px] text-amber-600/80 mt-0.5">이미지를 불러오는 중 API 오류가 발생했습니다.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Precise Countdown Locking Progress Bar */}
                      {countdown !== null && (
                        <div className="ml-11 max-w-[85%] bg-violet-50/50 rounded-2xl p-4 border border-violet-100 flex items-center gap-3.5 animate-pulse shadow-sm">
                          <Clock size={18} className="text-violet-600 animate-spin" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-extrabold text-violet-800">소유자 대조 및 정밀 보안인증 대기 중</span>
                              <span className="font-mono font-extrabold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-lg text-[10px]">{countdown}초</span>
                            </div>
                            <div className="w-full bg-violet-100/70 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-violet-600 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${(countdown / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // 3) Security Authentication card
                if (card.type === "auth_request") {
                  const isApproved = currentStage !== "AUTH_WAIT";

                  // Extract registered owner hint
                  let ownerHint = "홍길동";

                  return (
                    <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-colors shadow-md ${isApproved ? "bg-emerald-600" : "bg-red-500 animate-pulse"
                        }`}>
                        {isApproved ? <ShieldCheck size={14} className="stroke-[2.5]" /> : <Lock size={14} />}
                      </div>

                      {/* Content Box */}
                      <div className={`flex-1 rounded-3xl p-5 border shadow-sm max-w-[85%] transition-all ${isApproved
                        ? "bg-emerald-50/40 border-emerald-200 text-emerald-800"
                        : "bg-white border-red-200"
                        }`}>
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3 border-b pb-2.5 border-slate-100">
                          <h4 className={`text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider ${isApproved ? "text-emerald-800" : "text-red-600"
                            }`}>
                            {isApproved ? "보안인증 검증 완료" : "보안 본인인증 (Lock)"}
                          </h4>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${isApproved
                            ? "bg-emerald-100/70 border-emerald-200 text-emerald-700"
                            : "bg-red-50 text-red-500 border-red-200/50"
                            }`}>
                            {isApproved ? "VERIFIED" : "LOCKED"}
                          </span>
                        </div>

                        {isApproved ? (
                          /* Approved notification message */
                          <div className="space-y-2">
                            <p className="text-xs font-semibold leading-relaxed flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                              {card.text}
                            </p>
                            <p className="text-[10px] text-emerald-600/80 leading-normal font-medium">
                              건축물대장 대조 완료: 소유 관계 정상 식별. AVM 연산 3대 모델(SCA/SFA/VSA) 기반 정밀 추론 단계로 즉각 진입합니다.
                            </p>
                          </div>
                        ) : (
                          /* Intercepted lock authentication prompt */
                          <div className="space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                              안전한 AVM 추론 수행 및 소유주 매칭을 위해 보안 본인인증이 필요합니다. 아래 입력창에 소유주 성함을 입력하여 대장 정보 대조를 완료해 주십시오.
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">명의자 일치 검증용 성함</label>
                                <span className="text-[9px] text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100">
                                  {`대장상 소유주: ${ownerHint}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <UserCheck size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="인증할 소유주 성함 입력"
                                    className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAuthConfirmSubmit}
                                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  데모 인증 승인
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold pl-1.5">
                              <Info size={11} className="text-slate-400" />
                              <span>시뮬레이션 승인을 위해 성함을 그대로 둔 채 '데모 인증 승인'을 누르세요.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // 4) AVM models 추론 결과 출력 카드 (F-AVM-02)
                if (card.type === "avm_result") {
                  if (card.isLoading) {
                    return (
                      <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 animate-pulse">
                          <Building size={14} />
                        </div>
                        <div className="flex-1 bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 max-w-[85%] animate-pulse">
                          <div className="h-4 bg-slate-200/70 rounded-full w-1/3" />
                          <div className="h-2.5 bg-slate-200/70 rounded-full w-2/3" />
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="h-20 bg-slate-200/50 rounded-xl" />
                            <div className="h-20 bg-slate-200/50 rounded-xl" />
                            <div className="h-20 bg-slate-200/50 rounded-xl" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const { spec, avm }: { spec: BuildingOfficialData; avm: CalculateData } = card.data;

                  return (
                    <div key={card.id} className="space-y-4 animate-fade-in-up">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <Calculator size={14} className="stroke-[2.5]" />
                        </div>

                        {/* Inference content */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden max-w-[85%] flex flex-col">

                          {/* Card Header tag */}
                          <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                              <Sparkles size={12} className="text-violet-300 animate-pulse" />
                              통합 AVM 3대 엔진 가치 산출 최종 승인
                            </span>
                            <span className="text-[10px] font-bold text-violet-300 font-mono">
                              ENGINE: {spec.bld_type}
                            </span>
                          </div>

                          {/* Calculated values */}
                          <div className="p-5 space-y-5 text-slate-700">

                            {avm.is_collective_limited && (
                              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 animate-fade-in text-left">
                                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                  <p className="font-extrabold text-amber-900">[안내] 집합부 기준 가치산정 보정 적용</p>
                                  <p className="leading-relaxed font-medium text-amber-800">
                                    SCA(상업 및 업무용 빌딩) 모델은 개별 점포(집합부) 데이터로 학습되었습니다. 
                                    대상 건축물의 연면적이 대형({avm.original_area?.toFixed(2)}㎡)이므로, 
                                    가치가 비정상적으로 왜곡되는 것을 방지하기 위해 <strong>표준 구분상가 점포 면적({avm.applied_area?.toFixed(2)}㎡)</strong>으로 면적을 보정하여 산출하였습니다.
                                  </p>
                                  <p className="text-[10px] text-amber-600 font-semibold">
                                    * 본 결과는 통건물 전체가 아닌 건물 내 표준적인 구분점포 1개 기준의 가치 평가액입니다.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Main price showcase */}
                            <div className="text-center bg-violet-50/50 rounded-2xl p-5 border border-violet-100">
                              <span className="text-[10px] text-violet-500 font-extrabold uppercase tracking-widest block mb-1">
                                거래사례비교 분석 추정 가치 (Estimated Price)
                              </span>
                              <span className="text-2xl font-extrabold text-violet-700 tracking-tight block">
                                {getKoreanPriceString(avm.estimated_price)}
                              </span>
                              <span className="text-xs text-slate-400 font-medium block mt-1">
                                \\{avm.estimated_price.toLocaleString("ko-KR")}원
                              </span>
                            </div>

                            {/* Similar Building case list (cases_list) */}
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-3">
                                인근 유사 건물 국토교통부 실거래 사례
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {avm.cases_list.map((c, idx) => (
                                  <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1 hover:border-slate-350 transition-colors">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                                      <span>사례 {idx + 1}</span>
                                      <span className="font-mono">{c.deal_date}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 truncate" title={c.std_address}>
                                      {c.std_address}
                                    </span>
                                    <span className="text-[13px] font-extrabold text-slate-800 mt-1">
                                      {getKoreanPriceString(c.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Report Generation Trigger Button */}
                      {currentStage === "AVM_RUNNING" && (
                        <div className="ml-11 max-w-[85%] bg-white border border-violet-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-violet-50 rounded-xl text-violet-600 mt-0.5">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 leading-snug">AI 정밀 감정평가 보고서 발행</h4>
                              <p className="text-[10px] text-slate-400 leading-normal mt-0.5 font-medium">
                                해당 AVM 산정값과 실거래비교 지수를 결합한 고해상도 보고서를 실시간 생성하시겠습니까?
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={generateAiReport}
                            className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-violet-100 hover:shadow-lg transition-all flex-shrink-0"
                          >
                            <Sparkles size={12} />
                            보고서 생성하기
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 5) AI Appraisal Report markdown card
                if (card.type === "ai_report") {
                  if (card.isLoading) {
                    return (
                      <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 animate-pulse">
                          <Building size={14} />
                        </div>
                        <div className="flex-1 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4 max-w-[85%]">
                          <div className="flex items-center gap-2 text-xs font-bold text-violet-600">
                            <Sparkles size={14} className="animate-spin text-violet-600" />
                            <span>Gemini가 감정평가 마크다운 리포트를 작성하고 있습니다...</span>
                          </div>
                          <div className="space-y-2.5 animate-pulse pt-2">
                            <div className="h-4 bg-slate-200/80 rounded w-1/4" />
                            <div className="h-3 bg-slate-200/70 rounded w-3/4" />
                            <div className="h-3 bg-slate-200/70 rounded w-5/6" />
                            <div className="h-24 bg-slate-200/50 rounded-xl w-full" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isHtml = card.text && card.text.trim().startsWith("<!DOCTYPE html>");

                  return (
                    <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                        <FileText size={14} className="stroke-[2.5]" />
                      </div>

                      {/* Content Box */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-md max-w-[85%]">
                        <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            AI OFFICIAL APPRAISAL REPORT
                          </span>
                          <span className="text-[9px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                            Gemini 3.5 Core
                          </span>
                        </div>

                        {isHtml ? (
                          <div className="space-y-4">
                            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white shadow-inner relative overflow-hidden">
                              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                                <FileText size={140} />
                              </div>
                              
                              <h4 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                                <Sparkles size={16} className="text-amber-300 animate-pulse" />
                                정밀 감정평가 보고서 컴파일 완료
                              </h4>
                              <p className="text-[10.5px] text-violet-100 leading-relaxed mt-1 font-medium">
                                대상 자산의 공적 스펙, 구글 스트리트뷰 데이터, 그리고 국토교통부 인근 {currentAvmResult?.cases_list?.length || 3}개 실거래 실시간 대조 모델 연산이 성공적으로 완료되어 A4 정밀 인쇄용 보고서가 발행되었습니다.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/20 text-white/90">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-violet-200 block uppercase tracking-wider">평가 대상 자산</span>
                                  <span className="text-[11px] font-bold truncate block" title={currentSpec?.std_address}>
                                    {currentSpec?.bld_nm || "지정 부동산"}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-violet-200 block uppercase tracking-wider">정밀 감정가치</span>
                                  <span className="text-[11px] font-bold block text-amber-300">
                                    {currentAvmResult ? getKoreanPriceString(currentAvmResult.estimated_price) : "연산 완료"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (card.text) {
                                    setReportModalHtml(card.text);
                                  }
                                }}
                                className="flex-1 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-violet-100 hover:shadow-lg transition-all"
                              >
                                <Sparkles size={13} />
                                보고서 열기 및 인쇄 (A4)
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (!card.text) return;
                                  const blob = new Blob([card.text], { type: "text/html;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  const cleanAddr = currentSpec?.std_address || "AVM_Report";
                                  a.download = `AI_감정평가보고서_${cleanAddr.replace(/\s+/g, "_")}.html`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                              >
                                <Download size={13} />
                                HTML 다운로드
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-slate-700">
                            <MarkdownRenderer content={card.text || ""} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // 6) SYSTEM notifications/notices
                if (card.type === "system_notice") {
                  return (
                    <div key={card.id} className="mx-auto max-w-[85%] bg-slate-100/80 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in-up shadow-sm">
                      <div className="bg-violet-100 p-1.5 rounded-lg text-violet-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={13} className="stroke-[2.5]" />
                      </div>
                      <div className="flex-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
                        {card.text}
                      </div>
                    </div>
                  );
                }

                // 7) USER chat message in chatbot session
                if (card.type === "chat_message") {
                  return (
                    <div key={card.id} className="flex flex-col items-end gap-1.5 animate-fade-in-up">
                      <div className="text-[10px] text-slate-400 mr-1 flex items-center gap-1 font-semibold font-mono">
                        <span>사용자 상담 질문</span>
                        <span>•</span>
                        <span>{card.timestamp}</span>
                      </div>
                      <div className="bg-violet-600 text-white px-5 py-3 rounded-2xl rounded-tr-none text-sm font-bold shadow-md max-w-[85%] self-end">
                        {card.text}
                      </div>
                    </div>
                  );
                }

                // 8) CHATBOT response from dialogue sessions (F-CHAT-01)
                if (card.type === "chat_response") {
                  if (card.isLoading) {
                    return (
                      <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 animate-pulse">
                          <MessageSquare size={14} />
                        </div>
                        <div className="flex-1 bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-3 max-w-[85%] animate-pulse">
                          <div className="h-3 bg-slate-200/70 rounded w-1/4" />
                          <div className="h-2.5 bg-slate-200/70 rounded w-3/4" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={card.id} className="flex items-start gap-3 animate-fade-in-up">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                        <Coins size={14} className="stroke-[2.5]" />
                      </div>

                      {/* Content Box */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm max-w-[85%] text-slate-700 leading-relaxed text-xs">
                        <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                            <Coins size={12} className="text-violet-600" />
                            AI 담보대출 심사 전문가 답변
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold font-mono">{card.timestamp}</span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <MarkdownRenderer content={card.text || ""} />
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
              <div ref={timelineEndRef} />
            </div>
          )}
        </section>

        {/* Dynamic bottom fixed Input Panel */}
        <footer className="bg-white border-t border-slate-200/80 p-4 select-none shadow-lg shadow-slate-100" id="bottom-fixed-dock">
          <div className="max-w-3xl mx-auto">
            {currentStage === "CHAT_ACTIVE" ? (

              /* STAGE 4: FINANCE CHATBOT ACTIVE MODE (F-CHAT-01) */
              <form onSubmit={handleChatFormSubmit} className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-2xl border border-slate-200/80 transition-colors flex items-center justify-center"
                  title="새로운 주소 조회하기"
                >
                  <RotateCcw size={18} />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isInputDisabled}
                    placeholder="대출 이자 및 DSR 한도, 디딤돌 자격 조건을 질문해 보세요... (예: 디딤돌 대출 되나요?)"
                    className="w-full bg-slate-50 border border-slate-200 pr-12 pl-4 py-3 text-sm font-bold text-slate-800 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isInputDisabled}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 bg-slate-800 hover:bg-slate-900 text-white p-2 rounded-xl disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <ArrowRight size={14} className="stroke-[3]" />
                  </button>
                </div>
              </form>
            ) : (

              /* STAGE 1: ADDRESS INQUIRY SEARCH MODE */
              <div className="relative" ref={dropdownRef}>
                <form onSubmit={handleAddressFormSubmit} className="relative">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    disabled={isInputDisabled}
                    placeholder={
                      currentStage === "AUTH_WAIT"
                        ? "본인인증 승인 전까지 입력창이 비활성화(Lock) 됩니다."
                        : "부동산 주소를 입력해 주세요... (예: 서울시 영등포구 여의도동 1)"
                    }
                    className="w-full bg-slate-50 border border-slate-200 pr-12 pl-11 py-3.5 text-xs sm:text-sm font-extrabold text-slate-800 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-60"
                  />

                  {/* Search / Lock leading status icon */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                    {currentStage === "AUTH_WAIT" ? (
                      <Lock size={18} className="text-red-500 animate-pulse" />
                    ) : (
                      <Search size={18} className="text-slate-400" />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!addressInput.trim() || isInputDisabled}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 bg-violet-600 hover:bg-violet-750 text-white px-4 py-2 text-xs font-bold rounded-xl disabled:opacity-30 disabled:hover:bg-violet-600 transition-colors flex items-center gap-1.5 shadow-md shadow-violet-100"
                  >
                    조회
                    <ArrowRight size={12} className="stroke-[2.5]" />
                  </button>
                </form>

                {/* Kakao Address Autocomplete Dropdown */}
                {showDropdown && searchResults.length > 0 && !isInputDisabled && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden max-h-64 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={10} className="text-violet-500" />
                        카카오 주소 검색 결과
                      </span>
                      <span className="text-[9px] text-slate-300 font-mono">{searchResults.length}건</span>
                    </div>
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAddressInput("");
                          setShowDropdown(false);
                          startAvmFlow(result);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors border-b border-slate-50 last:border-b-0 flex items-start gap-3 group"
                      >
                        <div className="w-5 h-5 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-violet-200 transition-colors">
                          <MapPin size={10} className="text-violet-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{result.address_name}</p>
                          {result.road_address_name && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{result.road_address_name}</p>
                          )}
                        </div>
                        <ChevronRight size={13} className="text-slate-300 flex-shrink-0 mt-0.5 group-hover:text-violet-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 text-center select-none">
              <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                {currentStage === "CHAT_ACTIVE"
                  ? "현재 금융 챗봇 상담 모드가 작동 중입니다. 감정가 기반 한도 및 금리 시뮬레이션이 자동 지원됩니다."
                  : "본 시뮬레이터는 국토교통부 실거래 정보와 AVM 산출법을 실시간 매칭하는 시연용 프로토타입입니다."}
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* 3. REPORT VIEWER MODAL (F-UI-03 Modal fallback for iframe sandbox) */}
      {reportModalHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" id="report-modal-backdrop">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 select-none">
              <div className="flex items-center gap-2">
                <div className="bg-violet-100 text-violet-700 p-2 rounded-xl">
                  <FileText size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 tracking-tight leading-none">
                    AI 정밀 감정평가 보고서
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">PREMIUM APPRAISAL REPORT PREVIEW</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById("report-iframe") as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                  className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={13} />
                  인쇄 / PDF 저장
                </button>
                
                <button
                  type="button"
                  onClick={() => setReportModalHtml(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 px-3 rounded-xl transition-all"
                >
                  닫기
                </button>
              </div>
            </div>
            
            {/* Modal Body: Secure Iframe Container */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                id="report-iframe"
                srcDoc={reportModalHtml}
                title="AI Appraisal Report"
                className="w-full h-full border-0 bg-white"
              />
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
