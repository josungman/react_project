import os
import pandas as pd
import pymysql
import traceback

'''
생활(가정)폐기물 발생량 엑셀 DB 제너레이터
제공 최신 데이터(2022년) 기준
다운 받은 xls 파일을 xlsx로 변환 후 실행
변환 방법:
1. xlsToxlsx.py 실행
2. 변환된 xlsx 파일을 '폐기물데이터_xlsx' 폴더에 넣기
3. 이 스크립트 실행
'''


# ✅ NaN → None 치환 함수
def clean(value):
    return None if pd.isna(value) else value

# ✅ 설정 파일 로드 함수
def load_config(filepath):
    config = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                config[key] = value
    return config

# ✅ 설정 불러오기
db_conf = load_config('db_config.txt')
YEAR = 2022
BASE_DIR = r"폐기물데이터_xlsx\생활(가정)폐기물발생량\2022"

# ✅ DB 연결
conn = pymysql.connect(
    host=db_conf['DB_HOST'],
    user=db_conf['DB_USER'],
    password=db_conf['DB_PASSWORD'],
    database=db_conf['DB_NAME'],
    charset='utf8mb4',
    autocommit=True
)
cursor = conn.cursor()

# ✅ INSERT SQL (공공처리 포함)
sql = """
INSERT INTO waste_generation_by_region (
    year, sido, sigungu, waste_type, total_amount, recycle_amount,
    incineration_amount, landfill_amount, other_amount,
    self_recycle_amount, self_incineration_amount, self_landfill_amount, self_other_amount,
    consigned_recycle_amount, consigned_incineration_amount, consigned_landfill_amount, consigned_other_amount,
    public_recycle_amount, public_incineration_amount, public_landfill_amount, public_other_amount
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON DUPLICATE KEY UPDATE
    waste_type = VALUES(waste_type),
    total_amount = VALUES(total_amount),
    recycle_amount = VALUES(recycle_amount),
    incineration_amount = VALUES(incineration_amount),
    landfill_amount = VALUES(landfill_amount),
    other_amount = VALUES(other_amount),
    self_recycle_amount = VALUES(self_recycle_amount),
    self_incineration_amount = VALUES(self_incineration_amount),
    self_landfill_amount = VALUES(self_landfill_amount),
    self_other_amount = VALUES(self_other_amount),
    consigned_recycle_amount = VALUES(consigned_recycle_amount),
    consigned_incineration_amount = VALUES(consigned_incineration_amount),
    consigned_landfill_amount = VALUES(consigned_landfill_amount),
    consigned_other_amount = VALUES(consigned_other_amount),
    public_recycle_amount = VALUES(public_recycle_amount),
    public_incineration_amount = VALUES(public_incineration_amount),
    public_landfill_amount = VALUES(public_landfill_amount),
    public_other_amount = VALUES(public_other_amount)
"""

# ✅ 모든 파일 순회
for root, dirs, files in os.walk(BASE_DIR):
    for file in files:
        if file.endswith(".xlsx"):
            file_path = os.path.join(root, file)
            print(f"📄 처리중: {file_path}")
            try:
                df_raw = pd.read_excel(file_path, header=[2, 3], engine='openpyxl')
                df_raw.columns = ['_'.join(filter(None, map(str, col))).strip() for col in df_raw.columns]
                df_raw.columns = df_raw.columns.str.strip()

                # ✅ 컬럼 리네이밍
                df = df_raw.rename(columns={
                    '시도_Unnamed: 0_level_1': 'sido',
                    '시군구_Unnamed: 1_level_1': 'sigungu',
                    '폐기물 종류_Unnamed: 2_level_1': 'waste_type',
                    '2022발생량_Unnamed: 5_level_1': 'total_amount',
                    '총계_재활용': 'recycle_amount',
                    '총계_소각': 'incineration_amount',
                    '총계_매립': 'landfill_amount',
                    '총계_기타': 'other_amount',
                    '자가처리_재활용': 'self_recycle_amount',
                    '자가처리_소각': 'self_incineration_amount',
                    '자가처리_매립': 'self_landfill_amount',
                    '자가처리_기타': 'self_other_amount',
                    '위탁처리_재활용': 'consigned_recycle_amount',
                    '위탁처리_소각': 'consigned_incineration_amount',
                    '위탁처리_매립': 'consigned_landfill_amount',
                    '위탁처리_기타': 'consigned_other_amount',
                    '공공처리_재활용': 'public_recycle_amount',
                    '공공처리_소각': 'public_incineration_amount',
                    '공공처리_매립': 'public_landfill_amount',
                    '공공처리_기타': 'public_other_amount'
                })

                # ✅ '합계'만 필터링
                df['waste_type'] = df['waste_type'].astype(str).str.strip().str.replace(r'\s+', '', regex=True)
                df = df[df['waste_type'].str.contains('합계')]

                if df.empty:
                    print(f"⚠️ '합계' 행 없음 → 건너뜀")
                    continue

                # ✅ 누락 컬럼 채움
                for col in [
                    'recycle_amount', 'incineration_amount', 'landfill_amount', 'other_amount',
                    'self_recycle_amount', 'self_incineration_amount', 'self_landfill_amount', 'self_other_amount',
                    'consigned_recycle_amount', 'consigned_incineration_amount',
                    'consigned_landfill_amount', 'consigned_other_amount',
                    'public_recycle_amount', 'public_incineration_amount',
                    'public_landfill_amount', 'public_other_amount'
                ]:
                    if col not in df.columns:
                        df[col] = 0

                # ✅ INSERT 실행
                for _, row in df.iterrows():
                    cursor.execute(sql, (
                        YEAR,
                        clean(row['sido']),
                        clean(row['sigungu']),
                         '생활(가정)폐기물',  # ← waste_type 고정
                        clean(row.get('total_amount', 0)),
                        clean(row.get('recycle_amount', 0)),
                        clean(row.get('incineration_amount', 0)),
                        clean(row.get('landfill_amount', 0)),
                        clean(row.get('other_amount', 0)),
                        clean(row.get('self_recycle_amount', 0)),
                        clean(row.get('self_incineration_amount', 0)),
                        clean(row.get('self_landfill_amount', 0)),
                        clean(row.get('self_other_amount', 0)),
                        clean(row.get('consigned_recycle_amount', 0)),
                        clean(row.get('consigned_incineration_amount', 0)),
                        clean(row.get('consigned_landfill_amount', 0)),
                        clean(row.get('consigned_other_amount', 0)),
                        clean(row.get('public_recycle_amount', 0)),
                        clean(row.get('public_incineration_amount', 0)),
                        clean(row.get('public_landfill_amount', 0)),
                        clean(row.get('public_other_amount', 0))
                    ))
                print(f"✅ 저장 완료: {file_path}")

            except Exception as e:
                print(f"❌ 오류 발생: {file_path}")
                traceback.print_exc()

cursor.close()
conn.close()
print("🎉 전체 지역 폐기물 데이터 저장 완료!")
