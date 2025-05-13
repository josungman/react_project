import pymysql
import requests
import time

'''
데이터 중복삽입 방지 ON DUPLICATE KEY UPDATE
year, entrps_nm, adres 기준 필드
위경도 추가 삽입
'''
# ✅ 파일 로딩 함수
def load_config(filepath):
    config = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                config[key] = value
    return config

# ✅ 설정 불러오기
secrets = load_config('secrets.txt')
db_conf = load_config('db_config.txt')

KAKAO_API_KEY = secrets['KAKAO_API_KEY']
API_USER_ID = secrets['API_USER_ID']
API_KEY = secrets['API_KEY']

# ✅ 위경도 변환 함수
def get_lat_lng_from_kakao(address, kakao_rest_api_key):
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {kakao_rest_api_key}"}
    params = {"query": address}

    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code == 200:
        documents = resp.json().get("documents")
        if documents:
            doc = documents[0]
            return float(doc["y"]), float(doc["x"])  # 위도, 경도
    return None, None

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

# ✅ API 호출
YEAR = 2023
params = {
    "PID": "REA06",
    "YEAR": str(YEAR),
    "USRID": API_USER_ID,
    "KEY": API_KEY
}
url = "https://www.recycling-info.or.kr/sds/JsonApi.do"
response = requests.get(url, params=params)
data = response.json().get("data", [])

# ✅ INSERT SQL
sql = """
INSERT INTO waste_company_by_region (
    year, entrps_nm, rprsntv, adres, telno,
    empl_cnt, area, wste, product_name, process_mth,
    latitude, longitude
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON DUPLICATE KEY UPDATE
  telno = VALUES(telno),
  empl_cnt = VALUES(empl_cnt),
  area = VALUES(area),
  wste = VALUES(wste),
  product_name = VALUES(product_name),
  process_mth = VALUES(process_mth),
  rprsntv = VALUES(rprsntv),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude)
"""

# ✅ 데이터 저장
for i, item in enumerate(data):
    adres = item.get("ADRES") or ""
    lat, lng = get_lat_lng_from_kakao(adres, KAKAO_API_KEY)

    cursor.execute(sql, (
        YEAR,
        item.get("ENTRPS_NM"),
        item.get("RPRSNTV"),
        adres,
        item.get("TELNO") or "",
        int(item.get("EMPL_CNT") or 0),
        item.get("AREA"),
        item.get("WSTE"),
        item.get("PRODUCT_NAME"),
        item.get("PROCESS_MTH"),
        lat,
        lng
    ))

    print(f"✅ {i+1}/{len(data)} 저장 완료: {item.get('ENTRPS_NM')}")
    time.sleep(0.3)

cursor.close()
conn.close()
print("🎉 전체 데이터 저장 완료!")