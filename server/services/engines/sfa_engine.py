import joblib
import pandas as pd
import numpy as np
import os
from catboost import CatBoostRegressor
from .base import BaseEngine

class SFAEngine(BaseEngine):
    def __init__(self):
        # 모델 파일 경로 설정
        self.base_path = r"C:\Users\rkgka\OneDrive\바탕 화면\SFA-AVM-Engine\models"
        
        try:
            self.xgb_model = joblib.load(os.path.join(self.base_path, "xgb_model.pkl"))
            self.lgb_model = joblib.load(os.path.join(self.base_path, "lgb_model.pkl"))
            self.cat_model = CatBoostRegressor().load_model(os.path.join(self.base_path, "cat_model.cbm"))
            self.ready = True
        except Exception as e:
            print(f"[SFA Engine] Model Load Failed: {e}")
            self.ready = False
        
        # 앙상블 가중치 (성능 보고서 기반 R2 가중치 반영)
        self.weights = {'XGB': 0.35, 'LGB': 0.35, 'CAT': 0.30}
        
        # 모델이 학습한 피처 순서 (train_tuned_ensemble.py 기준)
        self.feature_names = [
            'houseType', 'buildYear', 'plottageAr', 'totalFloorAr', 'dealYear',
            'Age', 'floor_area_ratio', 'deal_month_sin', 'deal_month_cos',
            'sggCd', 'umdNm', 'spatial_block_id_str',
            'is_old_building', 'umd_old_building_ratio', 'block_mean_age',
            'block_deal_ratio', 'umd_block_count', 'is_urban_core'
        ]

    async def predict_price(self, context: dict):
        """
        입력된 맥락(Context) 데이터를 바탕으로 SFA 정밀 가치 산정
        """
        if not self.ready:
            return {"error": "SFA 모델이 준비되지 않았습니다.", "estimated_price": 0}

        try:
            # 1. 텍스트/좌표 기반 피처 엔지니어링
            from datetime import datetime
            now = datetime.now()
            
            # 입력 데이터 추출
            house_type = context.get("main_purps_cd_nm", "단독")
            build_year = int(context.get("use_aprv_day", "20100101")[:4])
            plottage_ar = float(context.get("grnd_flr_ar", 100.0))
            total_floor_ar = float(context.get("tot_area", 150.0))
            sgg_cd = context.get("sigungu_cd", "26500")
            umd_nm = context.get("bjdong_nm", "망미동")
            jibun = context.get("bun", "0")
            
            # 파생 변수 계산
            age = self.calculate_age(build_year)
            floor_area_ratio = total_floor_ar / (plottage_ar + 1e-5)
            
            # DataFrame 생성
            input_df = pd.DataFrame([{
                'houseType': house_type,
                'buildYear': build_year,
                'plottageAr': plottage_ar,
                'totalFloorAr': total_floor_ar,
                'dealYear': now.year,
                'Age': age,
                'floor_area_ratio': floor_area_ratio,
                'deal_month_sin': np.sin(2 * np.pi * now.month / 12),
                'deal_month_cos': np.cos(2 * np.pi * now.month / 12),
                'sggCd': sgg_cd,
                'umdNm': umd_nm,
                'spatial_block_id_str': f"{sgg_cd}_{umd_nm}_{jibun}",
                'is_old_building': 1 if age >= 30 else 0,
                'umd_old_building_ratio': 0.2, # 통계값 (추후 DB 연동)
                'block_mean_age': age,
                'block_deal_ratio': 0.005,
                'umd_block_count': 30,
                'is_urban_core': 1
            }])

            # 범주형 변수 인코딩 (트리 모델용 정수 변환)
            cat_cols = ['houseType', 'sggCd', 'umdNm', 'spatial_block_id_str']
            for col in cat_cols:
                input_df[col] = input_df[col].apply(lambda x: abs(hash(str(x))) % 10000)

            # 피처 순서 정렬
            X = input_df[self.feature_names]

            # 2. 개별 모델 추론 (Log Scale)
            pred_xgb = self.xgb_model.predict(X)[0]
            pred_lgb = self.lgb_model.predict(X)[0]
            pred_cat = self.cat_model.predict(X)[0]
            
            # 가중 평균 앙상블
            final_log_price = (pred_xgb * self.weights['XGB'] + 
                               pred_lgb * self.weights['LGB'] + 
                               pred_cat * self.weights['CAT'])
            
            # 3. 가격 복원 (np.expm1)
            price_per_m2 = self.inverse_log_price(final_log_price)
            estimated_price = int(price_per_m2 * total_floor_ar)
            
            # 아파트의 경우 보정치 (SFA 보정)
            if "아파트" in house_type:
                estimated_price = int(estimated_price * 1.05)

            return {
                "estimated_price": estimated_price,
                "price_per_m2": int(price_per_m2),
                "r2_score": 0.87,
                "engine": "SFA_V3_ENSEMBLE"
            }

        except Exception as e:
            print(f"[SFA Engine] Inference Error: {e}")
            return {"error": str(e), "estimated_price": 0}
