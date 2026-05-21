import joblib
import pandas as pd
import numpy as np
import os
import pickle
from .base import BaseEngine

class SCAEngine(BaseEngine):
    def __init__(self):
        self.model_path = r"C:\Users\rkgka\OneDrive\바탕 화면\SCA-AVM-Engine\model\final_avm_model_package.pkl"
        try:
            with open(self.model_path, "rb") as f:
                self.package = pickle.load(f)
            
            self.model = self.package.get('model')
            self.feature_names = self.package.get('feature_names')
            self.categorical_cols = self.package.get('categorical_cols', [])
            self.ready = True
            print(f"[SCA Engine] Package Loaded. Features: {len(self.feature_names)}")
        except Exception as e:
            print(f"[SCA Engine] Package Load Failed: {e}")
            self.ready = False

    async def predict_price(self, context: dict):
        """
        상가/집합건물(SCA) 정밀 가치 산정
        """
        if not self.ready:
            return {"error": "SCA 모델 패키지가 로드되지 않았습니다.", "estimated_price": 0}

        try:
            # 1. 패키지 기반 데이터 구성
            input_df = pd.DataFrame([context]) # 기본적으로 들어오는 context 사용
            
            # 피처 엔지니어링 (간소화된 프로토타입 버전)
            build_year = int(context.get("use_aprv_day", "20100101")[:4])
            input_df['Age'] = self.calculate_age(build_year)
            
            # SCA 집합부 모델 특성 반영: 면적이 너무 크면(통건물) 구분소유 점포 평균 면적으로 캡핑
            tot_area = float(context.get("tot_area", 100.0))
            is_collective_limited = False
            applied_area = tot_area
            
            if tot_area > 150.0:
                is_collective_limited = True
                applied_area = 60.0
                
            input_df['totalFloorAr'] = applied_area
            input_df['plottageAr'] = float(context.get("grnd_flr_ar", 50.0))
            
            # 패키지에서 요구하는 모든 피처를 타입에 맞게 초기화
            for feat in self.feature_names:
                if feat not in input_df.columns:
                    if feat in self.categorical_cols:
                        input_df[feat] = "" # 범주형은 빈 문자열
                    else:
                        input_df[feat] = 0.0 # 수치형은 0.0 float
            
            # 컬럼 순서 정렬 (중요)
            X = input_df[self.feature_names]
            
            # 카테고리 타입 변환
            for col in self.categorical_cols:
                if col in X.columns:
                    X[col] = X[col].astype('category')
 
            # 2. 모델 추론
            log_price = self.model.predict(X)[0]
            
            # 3. 가격 복원 및 가치 산출
            price_per_m2 = self.inverse_log_price(log_price)
            estimated_price = int(price_per_m2 * input_df['totalFloorAr'].iloc[0])

            return {
                "estimated_price": estimated_price,
                "price_per_m2": int(price_per_m2),
                "engine": "SCA_PACKAGE_V1",
                "r2_score": 0.85,
                "is_collective_limited": is_collective_limited,
                "original_area": tot_area,
                "applied_area": applied_area
            }

        except Exception as e:
            print(f"[SCA Engine] Inference Error: {e}")
            return {"error": str(e), "estimated_price": 0}

