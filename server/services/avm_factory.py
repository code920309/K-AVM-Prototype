from .engines.sfa_engine import SFAEngine
from .engines.vsa_engine import VSAEngine
from .engines.sca_engine import SCAEngine
import os

class AVMEngineFactory:
    def __init__(self):
        # 엔진 초기화
        self.sfa_engine = SFAEngine()
        self.vsa_engine = VSAEngine()
        self.sca_engine = SCAEngine()
        print("[AVM Factory] All Engines Loaded: SFA, VSA, SCA")

    async def calculate(self, building_data: dict):
        """
        건물 유형별 적절한 엔진을 선택하여 가치 산정 수행
        """
        bld_type = building_data.get("main_purps_cd_nm", "")
        
        # 1. 유형별 엔진 매핑
        if any(keyword in bld_type for keyword in ["아파트", "단독", "다가구"]):
            print(f"[AVM Factory] Routing to SFA Engine (Type: {bld_type})")
            return await self.sfa_engine.predict_price(building_data)
        
        elif any(keyword in bld_type for keyword in ["연립", "다세대", "빌라"]):
            print(f"[AVM Factory] Routing to VSA Engine (Type: {bld_type})")
            return await self.vsa_engine.predict_price(building_data)
            
        elif any(keyword in bld_type for keyword in ["제1종", "제2종", "상가", "판매", "근린", "SCA"]):
            print(f"[AVM Factory] Routing to SCA Engine (Type: {bld_type})")
            return await self.sca_engine.predict_price(building_data)
            
        else:
            # 분류가 모호한 경우 VSA 엔진으로 통합 처리 (범용성)
            print(f"[AVM Factory] Defaulting to VSA Engine (Type: {bld_type})")
            return await self.vsa_engine.predict_price(building_data)

# 싱글톤 인스턴스 생성
avm_factory = AVMEngineFactory()

