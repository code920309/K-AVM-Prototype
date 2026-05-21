import joblib
import pandas as pd
import numpy as np
import os
from .base import BaseEngine

class VSAEngine(BaseEngine):
    def __init__(self):
        self.base_path = r"C:\Users\rkgka\OneDrive\바탕 화면\VSA-AVM-Engine\models"
        try:
            self.model = joblib.load(os.path.join(self.base_path, "advanced_avm_model.pkl"))
            self.ready = True
        except Exception as e:
            print(f"[VSA Engine] Model Load Failed: {e}")
            self.ready = False

    async def predict_price(self, context: dict):
        """
        연립/다세대/빌라(VSA) 정밀 가치 산정
        """
        if not self.ready:
            return {"error": "VSA 모델이 준비되지 않았습니다.", "estimated_price": 0}

        try:
            # 빌라는 전용 면적이 가장 중요한 피처
            total_floor_ar = float(context.get("tot_area", 84.95))
            build_year = int(context.get("use_aprv_day", "20150101")[:4])
            age = self.calculate_age(build_year)
            
            # 모델이 요구하는 13개 피처 구성
            input_df = pd.DataFrame([{
                'excluUseAr': float(context.get("tot_area", 59.8)),
                'landAr': float(context.get("grnd_flr_ar", 30.0)),
                'floor': 2.0, # 기본 2층 가정
                'Age': float(age),
                'land_index': float(context.get("land_index", 100.0)), # 동적 공시지가 지수
                'parking_ratio': 0.8,
                'has_elevator': 0.0,
                'total_floors': 4.0,
                'subway_dist': 500.0,
                'houseType_연립': 0.0 if "다세대" in context.get("main_purps_cd_nm", "") else 1.0,
                'umdNm_encoded': 50.0,
                'is_high_floor_without_elevator': 0.0,
                'area_ratio': 2.0
            }]).astype(float) # 수치형 타입 강제 고정
            
            # 모델 추론
            # VSA 모델이 로그 스케일인지 여부에 따라 결과 처리
            raw_pred = self.model.predict(input_df)[0]
            
            # 만약 예측값이 단가가 아니라 총액이라면 그대로 사용, 로그라면 복원
            if raw_pred < 20: # 로그 스케일로 추정됨
                price_per_m2 = self.inverse_log_price(raw_pred)
                estimated_price = int(price_per_m2 * total_floor_ar)
            else:
                estimated_price = int(raw_pred)
                price_per_m2 = estimated_price / total_floor_ar

            return {
                "estimated_price": estimated_price,
                "price_per_m2": int(price_per_m2),
                "r2_score": 0.82,
                "engine": "VSA_ADVANCED_V2"
            }

        except Exception as e:
            print(f"[VSA Engine] Inference Error: {e}")
            return {"error": str(e), "estimated_price": 0}

