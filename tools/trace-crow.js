// 투명도 마스크(텍스트)에서 까마귀 윤곽을 따서 SVG 경로로 만든다.
// 사용: node tools/trace-crow.js <mask.txt>  →  img/crow.svg, js/crow-shape.js
// mask.txt: 첫 줄 "폭 높이", 이후 줄마다 0~255 투명도 값
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const lines = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/);
const [W, Hh] = lines[0].split(' ').map(Number);
let A = lines.slice(1).map((l) => l.split(' ').map(Number));
// 원본 가장자리가 계단처럼 딱딱해서, 윤곽을 따기 전에 살짝 흐리게 해 매끈한 경계를 만든다
const blur = (M) => M.map((row, y) => row.map((_, x) => {
  let sum = 0, wsum = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const w = (i ? 1 : 2) * (j ? 1 : 2), yy = y + j, xx = x + i; sum += w * (M[yy] && M[yy][xx] !== undefined ? M[yy][xx] : 0); wsum += w; }
  return sum / wsum;
}));
A = blur(blur(A));
const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= Hh ? 0 : A[y][x]);
const ISO = 118;

// 마칭 스퀘어: 칸마다 경계선 조각을 만들고(값 사이는 선형 보간), 끝점을 이어 닫힌 윤곽으로 묶는다
const segs = [];
const lerp = (a, b) => (ISO - a) / (b - a);
for (let y = -1; y < Hh; y++) for (let x = -1; x < W; x++) {
  const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
  const idx = (a >= ISO ? 8 : 0) | (b >= ISO ? 4 : 0) | (c >= ISO ? 2 : 0) | (d >= ISO ? 1 : 0);
  if (idx === 0 || idx === 15) continue;
  const T = () => [x + lerp(a, b), y], R = () => [x + 1, y + lerp(b, c)], B = () => [x + lerp(d, c), y + 1], L = () => [x, y + lerp(a, d)];
  const add = (p, q) => segs.push([p, q]);
  switch (idx) {
    case 1: add(L(), B()); break; case 2: add(B(), R()); break; case 3: add(L(), R()); break;
    case 4: add(T(), R()); break; case 5: add(L(), T()); add(B(), R()); break; case 6: add(T(), B()); break;
    case 7: add(L(), T()); break; case 8: add(T(), L()); break; case 9: add(T(), B()); break;
    case 10: add(T(), R()); add(L(), B()); break; case 11: add(T(), R()); break; case 12: add(L(), R()); break;
    case 13: add(B(), R()); break; case 14: add(L(), B()); break;
  }
}
const key = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
const map = new Map();
segs.forEach((s, i) => { for (const e of [0, 1]) { const k = key(s[e]); if (!map.has(k)) map.set(k, []); map.get(k).push([i, e]); } });
const used = new Array(segs.length).fill(false), loops = [];
for (let i = 0; i < segs.length; i++) {
  if (used[i]) continue;
  used[i] = true;
  const loop = [segs[i][0], segs[i][1]];
  let cur = segs[i][1];
  for (;;) {
    const next = (map.get(key(cur)) || []).find(([j]) => !used[j]);
    if (!next) break;
    used[next[0]] = true;
    cur = segs[next[0]][1 - next[1]];
    loop.push(cur);
  }
  loops.push(loop);
}
const area = (l) => Math.abs(l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const big = loops.filter((l) => area(l) > 12).sort((a, b) => area(b) - area(a));

// 점 줄이기(RDP)
const rdp = (pts, eps) => {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0; const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [a, b];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
};
// 까마귀 중심을 원점으로, 폭을 100으로 맞춘다
const all = big.flat();
const minx = Math.min(...all.map((p) => p[0])), maxx = Math.max(...all.map((p) => p[0]));
const miny = Math.min(...all.map((p) => p[1])), maxy = Math.max(...all.map((p) => p[1]));
const k = 100 / (maxx - minx), cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
const d = big.map((l) => {
  const half = Math.floor(l.length / 2);
  const s = rdp(l.slice(0, half + 1), 0.3).slice(0, -1).concat(rdp(l.slice(half), 0.3)).slice(0, -1)
    .map((p) => [(p[0] - cx) * k, (p[1] - cy) * k]);
  // 점과 점의 가운데를 지나는 2차 곡선으로 이어 매끈하게
  const f = (v) => v.toFixed(1), n = s.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(s[n - 1], s[0]);
  let out = `M${f(m0[0])},${f(m0[1])}`;
  for (let i = 0; i < n; i++) { const m = mid(s[i], s[(i + 1) % n]); out += `Q${f(s[i][0])},${f(s[i][1])} ${f(m[0])},${f(m[1])}`; }
  return out + 'Z';
}).join('');
const h = (maxy - miny) * k;
const vb = `${(-52).toFixed(0)} ${(-h / 2 - 2).toFixed(1)} 104 ${(h + 4).toFixed(1)}`;
fs.writeFileSync(path.join(root, 'img', 'crow.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><path fill="#1b1d1b" fill-rule="evenodd" d="${d}"/></svg>\n`);
fs.writeFileSync(path.join(root, 'js', 'crow-shape.js'),
`/* 까마귀 모양(고정). 대표 제작 스타트 프레임의 까마귀 윤곽을 tools/trace-crow.js로 따서 만든 경로.
   폭 100, 중심이 원점. 오른쪽 아래를 향해 날개를 편 모습. HOJONO_CROW.create(부모)로 넣는다. */
window.HOJONO_CROW = {
  viewBox: '${vb}',
  d: '${d}',
  create(parent) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'crow-shape'); p.setAttribute('fill-rule', 'evenodd'); p.setAttribute('d', this.d);
    parent.appendChild(p);
    return p;
  },
};
`);
console.log('loops', big.length, 'path chars', d.length, 'viewBox', vb);
