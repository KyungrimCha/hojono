# 06 지도 만들기: 오픈스트리트맵 실제 데이터로 원도심 먹선 지도를 그려 index.html에 넣는다.
#
# 쓰는 법:  PYTHONIOENCODING=utf-8 python tools/make-map.py
#   - 데이터: tools/data/osm-wondosim.json (원도심: 해안선·물길·도로·방파제)
#             tools/data/osm-wide.json     (방선문까지 넓은 범위: 해안선·하천·큰 도로·활주로·방파제)
#   - index.html 안의 <!-- MAP:START --> ~ <!-- MAP:END --> 사이를 새로 그린 지도로 바꾼다.
#   - 지도는 두 가지 보기로 쓴다(js/fx-map.js가 viewBox를 움직임):
#       원도심 보기  0 0 1000 600  (처음 보이는 범위, 용두암~사라봉)
#       전체 보기    WIDE 값      (방선문까지 다섯 장소가 모두 들어오는 범위)
#   - 장소 좌표(js/fx-map.js의 PLACES x, y)도 여기서 계산한 값과 같아야 한다 → 실행하면 값을 출력함.
# 지도 아래 "© OpenStreetMap contributors" 표기는 꼭 남길 것(데이터 사용 조건).
import json, math, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1000, 600
LON0, LON1 = 126.505, 126.555          # 원도심 보기: 서 → 동 (용두암 ~ 별도봉)
LAT0, LAT1 = 33.5005, 33.5270          # 남 → 북
KX = W / (LON1 - LON0)
KY = KX / math.cos(math.radians((LAT0 + LAT1) / 2))   # 가로·세로 실제 거리 비율을 맞춤
OY = (H - (LAT1 - LAT0) * KY) / 2

def P(lat, lon):
    return ((lon - LON0) * KX, H - ((lat - LAT0) * KY + OY))

PLACES = {
    '용두암': (33.5149624, 126.5116869), '사라봉': (33.51921, 126.5473), '산지천': (33.5131711873, 126.5272514754),
    '동문시장': (33.5116033, 126.5260192), '방선문': (33.4522839134, 126.5178167844),
}

# 전체 보기: 다섯 장소가 모두 들어오도록(위 바다 조금, 아래 방선문 아래 여백), 가로세로 5:3
ys = [P(*v)[1] for v in PLACES.values()]; xs = [P(*v)[0] for v in PLACES.values()]
wy0, wy1 = min(ys) - 300, max(ys) + 100
wh = wy1 - wy0; ww = wh * W / H
wx0 = (min(xs) + max(xs)) / 2 - ww / 2
WIDE = (round(wx0), round(wy0), round(ww), round(wh))

load = lambda f: json.load(io.open(os.path.join(ROOT, 'tools/data', f), encoding='utf-8'))['elements']
near, wide = load('osm-wondosim.json'), load('osm-wide.json')
pts = lambda e: [P(g['lat'], g['lon']) for g in e['geometry']]
def inside(p, box=(0, 0, W, H), m=60):
    return box[0] - m <= p[0] <= box[0] + box[2] + m and box[1] - m <= p[1] <= box[1] + box[3] + m
def thin(ps, d):
    """가까운 점은 건너뛰어 파일 크기를 줄임(끝점은 남김)"""
    if len(ps) < 3: return ps
    out = [ps[0]]
    for p in ps[1:-1]:
        if math.dist(p, out[-1]) >= d: out.append(p)
    return out + [ps[-1]]
def path(ps, close=False, d=1.2):
    ps = thin(ps, d)
    return ('M' + ' L'.join(f'{x:.0f},{y:.0f}' if d >= 3 else f'{x:.1f},{y:.1f}' for x, y in ps) + (' Z' if close else '')) if ps else ''

# 해안선 조각을 끝점끼리 이어 가장 긴 한 줄로
coast = [pts(e) for e in wide if e['tags'].get('natural') == 'coastline']
chain = max(coast, key=len); rest = [c for c in coast if c is not chain]
changed = True
while changed and rest:
    changed = False
    for c in list(rest):
        if math.dist(c[-1], chain[0]) < 2: chain = c[:-1] + chain; rest.remove(c); changed = True
        elif math.dist(chain[-1], c[0]) < 2: chain = chain + c[1:]; rest.remove(c); changed = True
coast_in = [p for p in chain if inside(p, WIDE, 200)]
sea = coast_in + [(coast_in[-1][0], WIDE[1] - 600), (coast_in[0][0], WIDE[1] - 600)]

# 하천(river)은 넓게, 작은 개울(stream)은 원도심 안에 걸친 것만(전체 보기가 실선으로 복잡해지지 않게)
rivers = [e for e in wide if any(inside(p, WIDE, 0) for p in pts(e)) and (
    e['tags'].get('waterway') == 'river' or (e['tags'].get('waterway') == 'stream' and any(inside(p, m=0) for p in pts(e))))]
quays = [e for e in wide if e['tags'].get('man_made') in ('breakwater', 'pier') and any(inside(p, WIDE, 0) for p in pts(e))]
runway = [e for e in wide if e['tags'].get('aeroway') == 'runway']
near_roads = [e for e in near if e['tags'].get('highway') and any(inside(p) for p in pts(e))]
near_ids = {e['id'] for e in near_roads}
far_roads = [e for e in wide if e['tags'].get('highway') and e['id'] not in near_ids and any(inside(p, WIDE, 40) for p in pts(e))]

hills = []
for lat, lon, rs in [(33.5181, 126.5468, (46, 32, 18)), (33.5186, 126.5528, (34, 22))]:
    x, y = P(lat, lon)
    hills += [f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r*1.25:.1f}" ry="{r*.85:.1f}"/>' for r in rs]

lb = lambda lat, lon, dx=0, dy=0: tuple(round(v, 1) for v in (P(lat, lon)[0] + dx, P(lat, lon)[1] + dy))
xy = lambda t: f'x="{t[0]}" y="{t[1]}"'
km = 1 / (111.32 * math.cos(math.radians(33.512))) * KX        # 1km가 지도에서 몇 칸인지
air = P(33.5066, 126.4930)

svg = f'''<!-- MAP:START (tools/make-map.py가 만든 부분. 직접 고치지 말고 도구를 다시 실행) -->
        <defs>
          <pattern id="mapWaves" width="22" height="12" patternUnits="userSpaceOnUse"><path d="M2 6 q4 -3 8 0 t8 0" fill="none" stroke="#cfc8b6" stroke-width="1"/></pattern>
          <filter id="mapHand" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
        </defs>
        <g class="map-meta" data-wide="{' '.join(map(str, WIDE))}" data-km="{km:.2f}"></g>
        <path class="map-sea" d="{path(sea, True, 2)}"/>
        <g class="map-runway">{''.join(f'<path d="{path(pts(e))}"/>' for e in runway)}</g>
        <g class="map-roads map-roads-far">{''.join(f'<path d="{path(pts(e), d=4)}"/>' for e in far_roads)}</g>
        <g class="map-roads map-roads-near">{''.join(f'<path d="{path(pts(e))}"/>' for e in near_roads)}</g>
        <g class="map-hills">{''.join(hills)}</g>
        <g class="map-lines">
          {''.join(f'<path class="river" d="{path(pts(e), d=2)}"/>' for e in rivers)}
          {''.join(f'<path class="quay" d="{path(pts(e))}"/>' for e in quays)}
          <path class="coast" d="{path(coast_in, d=2)}"/>
        </g>
        <g class="map-names map-names-near" aria-hidden="true">
          <text class="sea-name" x="150" y="118">제주 바다</text>
          <text class="water" {xy(lb(33.5125, 126.5132, -6, 70))}>한천</text>
          <text class="water" {xy(lb(33.5168, 126.5307, -70, 150))}>산지천</text>
          <text class="place" {xy(lb(33.5228, 126.5355, 40, -6))}>제주항</text>
          <text class="hill" {xy(lb(33.5186, 126.5528, -20, 46))}>별도봉</text>
        </g>
        <g class="map-names map-names-far" aria-hidden="true">
          <text class="sea-name" {xy((round(WIDE[0] + WIDE[2] * .58), round(WIDE[1] + 130)))}>제주 바다</text>
          <text class="place" {xy((round(air[0]), round(air[1] + 120)))} text-anchor="middle">제주국제공항</text>
          <text class="place" x="490" y="470" text-anchor="middle">원도심</text>
          <text class="water" {xy(lb(33.4750, 126.5215, 40, 0))}>한천</text>
          <text class="hill" {xy((round(WIDE[0] + WIDE[2] / 2), round(WIDE[1] + WIDE[3] - 40)))} text-anchor="middle">↓ 한라산 쪽</text>
        </g>
        <!-- 나침반과 축척은 보기(원도심/전체)에 따라 js/fx-map.js가 자리·길이를 맞춤 -->
        <g class="map-compass" transform="translate(952 104)" aria-hidden="true"><circle r="20"/><path d="M0 -15 L5 4 L0 0 L-5 4 Z"/><text y="-26" text-anchor="middle">N</text></g>
        <g class="map-scale" transform="translate(34 578)" aria-hidden="true"><path d="M0 0 H{km/2:.1f} M0 -5 V5 M{km/2:.1f} -5 V5 M{km/4:.1f} -3 V3"/><text x="0" y="-9">0</text><text x="{km/2:.1f}" y="-9" text-anchor="end">500m</text></g>
        <!-- MAP:END -->'''

p = os.path.join(ROOT, 'index.html')
s = io.open(p, encoding='utf-8').read()
s2, n = re.subn(r'<!-- MAP:START.*?<!-- MAP:END -->', lambda m: svg.strip(), s, flags=re.S)
if not n:
    raise SystemExit('index.html에서 <!-- MAP:START --> ~ <!-- MAP:END --> 자리를 찾지 못했습니다')
io.open(p, 'w', encoding='utf-8', newline='').write(s2)

print(f'index.html 지도 갱신 ({len(svg)//1024}KB). 전체 보기 viewBox: {" ".join(map(str, WIDE))}')
print('js/fx-map.js PLACES 좌표:')
for k, v in PLACES.items():
    x, y = P(*v)
    print(f'  {k}: x {x:.0f}, y {y:.0f}')
