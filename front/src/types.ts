export type BldType = "SCA" | "SFA" | "VSA";

export interface SpecData {
  std_address: string;
  bld_type: BldType;
  total_area: number;
  build_year: number;
  roadview_url: string;
}

export interface CaseItem {
  std_address: string;
  price: number;
  deal_date: string;
}

export interface CalculateData {
  is_owner_matched: boolean;
  estimated_price: number;
  cases_list: CaseItem[];
  is_collective_limited?: boolean;
  original_area?: number;
  applied_area?: number;
}

export type StageType = 
  | "ADDRESS_INPUT" 
  | "AUTH_WAIT" 
  | "AVM_RUNNING" 
  | "REPORT_GENERATING" 
  | "CHAT_ACTIVE";

export interface TimelineItem {
  id: string;
  type: 
    | "address_query" 
    | "spec_card" 
    | "auth_request" 
    | "avm_result" 
    | "ai_report" 
    | "system_notice" 
    | "chat_message" 
    | "chat_response";
  timestamp?: string;
  isLoading?: boolean;
  text?: string;
  data?: any; // Contains SpecData, CalculateData, BuildingOfficialData, etc. depending on type
}

export interface KakaoAddressItem {
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (lon)
  y: string; // 위도 (lat)
  sigungu_cd: string;
  bjdong_cd: string;
  bun: string;
  ji: string;
}

export interface BuildingOfficialData {
  sigungu_cd: string;
  bjdong_cd: string;
  bun: string;
  ji: string;
  plat_plc: string;
  bld_nm: string;
  tot_area: number;
  grnd_flr_ar: number;
  use_aprv_day: string;
  main_purps_cd_nm: string;
  panorama_image: string | null;
  panorama_status: "SUCCESS" | "NO_IMAGE" | "API_ERROR";
  
  // AVM 호환용 필드
  std_address: string;
  bld_type: BldType;
  total_area: number;
  build_year: number;
  is_empty_land?: boolean;
}

export interface SearchHistoryItem {
  id: string;
  raw_address: string;
  std_address: string;
  coords: { lat: number; lon: number };
  building_spec: {
    bld_nm: string;
    tot_area: number;
    grnd_flr_ar: number;
    use_aprv_day: string;
    main_purps_cd_nm: string;
  };
  timestamp: string;
}
