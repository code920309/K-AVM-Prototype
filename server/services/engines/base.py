import numpy as np

class BaseEngine:
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        두 위경도 좌표 간의 최단 거리(Haversine 공식)를 계산하여 km 단위로 반환
        """
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 999.0 # 거리 정보를 알 수 없을 경우 큰 값 반환

        R = 6371.0 # 지구 반지름 (km)
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = (np.sin(dlat / 2)**2 + 
             np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        return R * c

    def inverse_log_price(self, log_price):
        """
        로그 스케일로 예측된 단가를 원래 원화(₩) 단위로 복원 (np.expm1)
        """
        return np.expm1(log_price)

    def calculate_age(self, build_year, deal_year=None):
        """
        건물 연식 계산
        """
        from datetime import datetime
        current_year = deal_year or datetime.now().year
        try:
            year = int(build_year)
            return max(0, current_year - year)
        except:
            return 10 # 기본값
