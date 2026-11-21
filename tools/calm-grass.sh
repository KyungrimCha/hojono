#!/usr/bin/env bash
# 첫 화면 영상의 억새 떨림 줄이기
#
# 영상 생성 모델이 만든 억새가 프레임마다 파르르 떨리는 것을,
# 억새가 있는 자리만 골라 앞뒤 9프레임의 중간값으로 바꿔서 가라앉힌다.
# 느린 흔들림은 남고 빠른 떨림만 사라진다. 물결·안개·등불은 건드리지 않는다.
#
# 쓰는 법:  bash tools/calm-grass.sh <원본.mp4> <결과.mp4>
# 예:      bash tools/calm-grass.sh design/hero-video/fog-1080p.mp4 design/hero-video/fog-1080p-calm.mp4
#
# 영상을 다시 뽑아 억새 위치가 달라지면 아래 REGIONS 좌표(1920x1080 기준)를 고친다.
set -euo pipefail

IN="${1:?원본 영상 경로가 필요합니다}"
OUT="${2:?결과 영상 경로가 필요합니다}"

# 억새가 있는 자리: x:y:폭:높이 (1920x1080 기준)
REGIONS=(
  "0:455:335:560"     # 왼쪽 아래 큰 억새 + 왼쪽 나무 밑 억새
  "975:550:285:95"    # 가운데 둑 위 억새
)
RADIUS=4              # 앞뒤로 몇 프레임을 볼지 (4면 9프레임, 약 0.4초)
FEATHER=22            # 보정 자리 가장자리를 흐리게 섞는 정도(px)

MASK="$(mktemp --suffix=.png)"
trap 'rm -f "$MASK"' EXIT

boxes=""
for r in "${REGIONS[@]}"; do
  IFS=: read -r x y w h <<< "$r"
  boxes+="drawbox=x=$x:y=$y:w=$w:h=$h:c=white:t=fill,"
done

ffmpeg -v error -y -f lavfi \
  -i "color=black:s=1920x1080,format=gray,${boxes}gblur=sigma=$FEATHER" \
  -frames:v 1 "$MASK"

FRAMES="$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$IN")"

ffmpeg -v error -y -i "$IN" -loop 1 -i "$MASK" -filter_complex "
  [0:v]scale=1920:1080,format=gbrp,split[orig][s];
  [s]tpad=start_mode=clone:start=$RADIUS:stop_mode=clone:stop=$RADIUS,tmedian=radius=$RADIUS[calm];
  [1:v]format=gbrp[mask];
  [orig][calm][mask]maskedmerge[out]" \
  -map "[out]" -frames:v "$FRAMES" -an \
  -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT"

echo "완료: $OUT ($FRAMES 프레임)"
