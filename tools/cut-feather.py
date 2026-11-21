# 종이색 배경 위 깃털 그림에서 배경을 지워 투명 이미지로 만든다.
# 사용: python tools/cut-feather.py <원본.png> <결과.webp> [긴 변 px]
# 배경색과의 색 거리로 투명도를 정하고, 가장자리에 남은 배경색을 걷어 낸다(색 되돌리기).
import sys
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 480
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()

# 네 귀퉁이 근처에서 배경색을 잰다
samples = [px[x, y] for x in (8, W - 9) for y in (8, H - 9)]
bg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))

LO, HI = 14, 70  # 배경과의 거리 LO 이하면 완전 투명, HI 이상이면 완전 불투명
out_im = Image.new('RGBA', (W, H))
op = out_im.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
        a = 0.0 if d <= LO else 1.0 if d >= HI else (d - LO) / (HI - LO)
        if a <= 0:
            op[x, y] = (0, 0, 0, 0)
            continue
        # 반투명 가장자리: 배경이 섞인 만큼 빼서 원래 색으로 되돌림
        c = [min(255, max(0, round((v - (1 - a) * k) / a))) for v, k in zip((r, g, b), bg)]
        op[x, y] = (c[0], c[1], c[2], round(a * 255))

# 떨어진 작은 얼룩 정리: 알파를 살짝 다듬음
alpha = out_im.getchannel('A').filter(ImageFilter.MedianFilter(3))
out_im.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
pad = 12
bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(W, bbox[2] + pad), min(H, bbox[3] + pad))
out_im = out_im.crop(bbox)
k = size / max(out_im.size)
if k < 1:
    out_im = out_im.resize((round(out_im.width * k), round(out_im.height * k)), Image.LANCZOS)
out_im.save(out, 'WEBP', quality=92, method=6)
print('bg', bg, 'crop', bbox, 'out', out_im.size)
