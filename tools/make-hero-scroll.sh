#!/usr/bin/env bash
# 첫 화면 스크롤 영상 만들기 (ffmpeg 필요)
#
# 첫 화면 영상은 자동으로 재생되지 않고, 스크롤한 만큼 앞뒤로 넘어간다(js/fx-hero.js).
# 그래서 아무 지점으로나 바로 건너뛸 수 있게 "기준 장면"을 촘촘히(4프레임마다) 넣어 변환한다.
#
# 쓰는 법:  bash tools/make-hero-scroll.sh <원본.mp4>
# 예:      bash tools/make-hero-scroll.sh design/hero-video/fog-1080p-calm.mp4
# 결과:    video/hero-scroll.mp4      (PC, 폭 1600)
#          video/hero-scroll-960.mp4  (모바일, 폭 960)
#          video/hero-rewind(-960).mp4 (푸터 되감기용, 거꾸로 뒤집은 영상)
#          img/hero-start.webp        (첫 장면: 영상이 뜨기 전에 보이는 그림)
#          img/hero-end.webp          (끝 장면: 움직임 줄이기 설정일 때 보이는 그림)
set -euo pipefail
SRC="${1:?원본 영상 경로가 필요합니다}"
[ -f "$SRC" ] || { echo "파일이 없습니다: $SRC"; exit 1; }
SRC="$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")"
cd "$(dirname "$0")/.."
mkdir -p video

mk() { # 폭, 결과 파일, 화질(crf: 낮을수록 선명하고 용량 큼)
  ffmpeg -v error -y -i "$SRC" -an -vf "scale=$1:-2:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf "$3" -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 \
    -movflags +faststart "$2"
}
mk 1600 video/hero-scroll.mp4 25
mk 960  video/hero-scroll-960.mp4 26
# 푸터 되감기용: 같은 영상을 거꾸로 뒤집어 보통 영상으로(정방향 재생이라 부드러움)
rv() { ffmpeg -v error -y -i "$SRC" -an -vf "reverse,scale=$1:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf "$3" -movflags +faststart "$2"; }
rv 1600 video/hero-rewind.mp4 25
rv 960  video/hero-rewind-960.mp4 26

FRAMES="$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$SRC")"
ffmpeg -v error -y -i "$SRC" -frames:v 1 -vf "scale=1600:-2:flags=lanczos" -c:v libwebp -quality 80 img/hero-start.webp
ffmpeg -v error -y -i "$SRC" -vf "select=eq(n\,$((FRAMES-1))),scale=1600:-2:flags=lanczos" -frames:v 1 -c:v libwebp -quality 80 img/hero-end.webp

ls -la video/hero-scroll.mp4 video/hero-scroll-960.mp4 img/hero-start.webp img/hero-end.webp
