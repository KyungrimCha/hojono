/* 날갯짓하는 까마귀 v3 (SVG, 장면 넘기기 방식). HojonoCrow.create(부모 g 또는 svg, 설정)으로 만든다.
   실제 까마귀의 날갯짓 한 주기를 10장면으로 나눠 그리고, 장면을 차례로 넘겨 움직인다.
   구도: 오른쪽 위로 날아가는 까마귀를 비스듬히 옆에서 본 모습(양 날개가 다 보임).
   장면마다 몸 기울기와 두 날개의 어깨(S)·손목(W)·날개 끝(T) 위치가 다르다.
     1~3  날개를 높이 든 자세에서 내려치기 시작
     4    날개가 수평을 지남(가까운 날개는 앞으로, 먼 날개는 뒤로 얇게 보임)
     5~6  끝까지 내려침, 끝깃이 아래로 벌어짐
     7~8  손목부터 들어 올림(끝깃은 아직 아래로 늘어짐)
     9    갈매기 날개처럼 양옆으로 펴지며 올라감
     10   다시 높이 든 자세
   tr: 깃이 늘어지는 방향, fan: 끝깃이 벌어지는 각도, chord: 날개 폭 */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const K = 1.5; // 그리는 배율

  const FRAMES = [
    { pitch: 20, near: { tr: [-0.5, 1], slit: 0.55, lead: [[11, -3], [13, -14], [15, -30]], blades: [
        { b: [9, -36], t: [0, -61], w: 3.2 }, { b: [3, -35], t: [-8, -56], w: 3.2 }, { b: [-2, -32], t: [-14, -47], w: 3.2 }, { b: [-6, -28], t: [-18, -37], w: 3 },
        { b: [-12, -24], t: [-18, -28], w: 3.5 }, { b: [-13, -17], t: [-19, -19], w: 3.5 }, { b: [-13, -10], t: [-18, -10], w: 3.5 }], root: [[-10, -2], [0, 4]] },
                 far:  { tr: [0.3, 1], slit: 0.68, lead: [[-2, -2], [-10, -14], [-27, -36]], blades: [
        { b: [-33, -38], t: [-49, -54], w: 3.2 }, { b: [-34, -33], t: [-52, -43], w: 3.2 }, { b: [-34, -28], t: [-51, -32], w: 3.2 }, { b: [-33, -23], t: [-47, -22], w: 3.2 }, { b: [-31, -18], t: [-42, -13], w: 3.2 },
        { b: [-33, -8], t: [-37, -4], w: 4 }, { b: [-27, -2], t: [-30, 3], w: 4 }, { b: [-20, 3], t: [-22, 8], w: 4 }], root: [[-12, 8], [-4, 6]] } },
    { pitch: 20, near: { tr: [-0.5, 1], slit: 0.55, lead: [[9, -3], [10, -14], [11, -31]], blades: [
        { b: [4, -35], t: [-12, -55], w: 3.2 }, { b: [-1, -32], t: [-17, -47], w: 3.2 }, { b: [-5, -28], t: [-19, -38], w: 3.2 }, { b: [-8, -24], t: [-19, -29], w: 3 },
        { b: [-13, -20], t: [-18, -21], w: 3.5 }, { b: [-13, -13], t: [-18, -13], w: 3.5 }, { b: [-12, -7], t: [-16, -5], w: 3.5 }], root: [[-9, 0], [0, 4]] },
                 far:  { tr: [0.3, 1], slit: 0.68, lead: [[-2, -2], [-10, -14], [-33, -36]], blades: [
        { b: [-40, -37], t: [-61, -48], w: 3.2 }, { b: [-40, -32], t: [-62, -38], w: 3.2 }, { b: [-39, -27], t: [-59, -28], w: 3.2 }, { b: [-37, -22], t: [-54, -19], w: 3.2 }, { b: [-34, -17], t: [-47, -10], w: 3.2 },
        { b: [-34, -6], t: [-38, -2], w: 4 }, { b: [-27, -1], t: [-30, 4], w: 4 }, { b: [-20, 3], t: [-22, 8], w: 4 }], root: [[-12, 8], [-4, 6]] } },
    { pitch: 21, near: { S: [8, -8], W: [15, -21], T: [-2, -38], tr: [-1, 0.6], fan: 14, chord: 16, hw: 8, fall: 0.2, n: 3 },
                 far:  { S: [-4, -8], W: [-31, -16], T: [-74, -19], tr: [0.1, 1], fan: 20, chord: 15, hw: 10 } },
    { pitch: 19, near: { S: [3, 4], W: [25, 10], T: [53, 2], tr: [-0.2, 1], fan: 8, chord: 7, hw: 5, notch: 0.82 },
                 far:  { S: [-15, 5], W: [-40, 13], T: [-67, 21], tr: [0.2, 1], fan: 14, chord: 8, hw: 6 } },
    { pitch: 24, near: { S: [-1, 4], W: [-8, 20], T: [-10, 41], tr: [-1, 0.1], fan: 8, chord: 19, hw: 17, notch: 0.86 },
                 far:  { S: [6, 4], W: [18, 20], T: [35, 31], tr: [-1, 0.6], fan: 10, chord: 10, hw: 8, notch: 0.8 } },
    { pitch: 21, near: { S: [-2, 4], W: [-4, 20], T: [-2, 46], tr: [-1, 0.2], fan: 30, chord: 19, hw: 12, notch: 0.5 },
                 far:  { S: [7, 4], W: [17, 17], T: [28, 31], tr: [-1, 0.6], fan: 18, chord: 12, hw: 8, notch: 0.55 } },
    { pitch: 19, near: { S: [-1, 4], W: [-10, 15], T: [-2, 44], tr: [-1, 0.3], fan: 30, chord: 18, hw: 12, notch: 0.5 },
                 far:  { S: [8, 4], W: [22, 9], T: [33, 27], tr: [-1, 0.7], fan: 16, chord: 12, hw: 8, notch: 0.55 } },
    { pitch: 18, near: { S: [10, -9], W: [-9, -25], T: [-14, 34], tr: [1, 0.5], sec: [-0.5, 1], fan: 30, chord: 20, hw: 12, notch: 0.5 },
                 far:  { S: [9, -8], W: [22, -16], T: [19, 18], tr: [-1, 0.4], fan: 12, chord: 10, hw: 8 } },
    { pitch: 18, near: { S: [3, -12], W: [33, -21], T: [62, -8], tr: [-0.2, 1], fan: 16, chord: 9, hw: 7 },
                 far:  { S: [-7, -10], W: [-37, -19], T: [-62, 2], tr: [0.25, 1], fan: 24, chord: 13, hw: 9 } },
    { pitch: 17, near: { tr: [-0.5, 1], slit: 0.55, lead: [[13, -3], [15, -15], [17, -32]], blades: [
        { b: [12, -38], t: [4, -64], w: 3.2 }, { b: [6, -37], t: [-4, -59], w: 3.2 }, { b: [1, -34], t: [-10, -50], w: 3.2 }, { b: [-3, -30], t: [-15, -40], w: 3 },
        { b: [-9, -26], t: [-15, -30], w: 3.5 }, { b: [-10, -19], t: [-16, -21], w: 3.5 }, { b: [-10, -12], t: [-15, -12], w: 3.5 }], root: [[-8, -2], [2, 4]] },
                 far:  { tr: [0.3, 1], slit: 0.68, lead: [[-2, -2], [-9, -14], [-26, -37]], blades: [
        { b: [-31, -41], t: [-43, -59], w: 3.2 }, { b: [-33, -36], t: [-48, -49], w: 3.2 }, { b: [-33, -31], t: [-49, -38], w: 3.2 }, { b: [-32, -26], t: [-46, -28], w: 3.2 }, { b: [-30, -21], t: [-41, -18], w: 3.2 },
        { b: [-32, -10], t: [-36, -6], w: 4 }, { b: [-26, -3], t: [-29, 2], w: 4 }, { b: [-19, 3], t: [-21, 8], w: 4 }], root: [[-12, 8], [-4, 6]] } },
  ];

  /* 몸통(기울이기 전, x가 머리 쪽). 굵은 부리, 둥근 머리, 긴 꼬리 */
  const BODY = [
    { x: 30, y: 1.5, s: true }, { x: 24, y: -2.5 }, { x: 20, y: -7 }, { x: 15, y: -9 }, { x: 9, y: -8.5 },
    { x: 0, y: -10.5 }, { x: -14, y: -8.5 }, { x: -24, y: -5.5 }, { x: -42, y: -5.5 },
    { x: -58, y: -3.5, s: true }, { x: -60, y: 0.5 }, { x: -57, y: 4, s: true },
    { x: -40, y: 3.5 }, { x: -24, y: 5.5 }, { x: -12, y: 10.5 }, { x: 0, y: 12 }, { x: 10, y: 9.5 },
    { x: 17, y: 5.5 }, { x: 21, y: 3.5 }, { x: 25, y: 3.5 },
  ];

  const rad = (d) => d * Math.PI / 180;
  const f = (v) => v.toFixed(1);

  /* 점 목록 → 매끈한 닫힌 경로. s:true인 점은 뾰족하게 */
  function shape(pts) {
    const n = pts.length, mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
    let [mx, my] = mid(pts[n - 1], pts[0]);
    let d = `M${f(mx)},${f(my)}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], [nx, ny] = mid(p, pts[(i + 1) % n]);
      d += p.s ? `L${f(p.x)},${f(p.y)}L${f(nx)},${f(ny)}` : `Q${f(p.x)},${f(p.y)} ${f(nx)},${f(ny)}`;
    }
    return d + 'Z';
  }

  function bodyPath(pitch) {
    const c = Math.cos(rad(pitch)), s = Math.sin(rad(pitch));
    return shape(BODY.map((p) => ({ x: (p.x * c + p.y * s) * K, y: (-p.x * s + p.y * c) * K, s: p.s })));
  }

  /* 깃을 하나씩 정해 그리는 날개: lead(앞전) → blades(깃: 뿌리 b, 끝 t, 반폭 w) → root(몸 안쪽).
     깃은 폭이 일정한 긴 날 모양이고 끝만 둥글다. 깃 사이는 좁은 틈으로 갈라진다 */
  function bladeWing(w) {
    const tl = Math.hypot(w.tr[0], w.tr[1]), trx = w.tr[0] / tl, try_ = w.tr[1] / tl;
    const pts = w.lead.map((a) => ({ x: a[0] * K, y: a[1] * K }));
    w.blades.forEach((bl) => {
      const tx = bl.t[0] * K, ty = bl.t[1] * K, hw = bl.w * K;
      /* 긴 깃(끝깃)은 틈을 끝 쪽에만 내서 날개 면이 넓게 남게 한다 */
      const long = Math.hypot(bl.t[0] - bl.b[0], bl.t[1] - bl.b[1]) > 12, sl = long ? (w.slit || 1) : 1;
      const bx = tx + (bl.b[0] * K - tx) * sl, by = ty + (bl.b[1] * K - ty) * sl;
      let dx = tx - bx, dy = ty - by; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      let qx = -dy, qy = dx; if (qx * trx + qy * try_ < 0) { qx = -qx; qy = -qy; }  // 다음 깃 쪽
      pts.push({ x: bx - qx * hw, y: by - qy * hw, s: true });
      pts.push({ x: tx - dx * hw * 1.7 - qx * hw, y: ty - dy * hw * 1.7 - qy * hw });
      pts.push({ x: tx, y: ty });
      pts.push({ x: tx - dx * hw * 1.7 + qx * hw, y: ty - dy * hw * 1.7 + qy * hw });
      pts.push({ x: bx + qx * hw, y: by + qy * hw, s: true });
    });
    w.root.forEach((a) => pts.push({ x: a[0] * K, y: a[1] * K }));
    return shape(pts);
  }

  /* 날개 한 장: 어깨→손목→끝이 앞전. 손 쪽에 끝깃 다섯 개가 둥근 깃 모양으로 갈라지고, 팔 뒤로 둘째날개깃이 붙는다 */
  function wingPath(w) {
    if (w.blades) return bladeWing(w);
    const S = { x: w.S[0] * K, y: w.S[1] * K }, W = { x: w.W[0] * K, y: w.W[1] * K }, T = { x: w.T[0] * K, y: w.T[1] * K };
    const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return { x: v[0] / l, y: v[1] / l }; };
    const tr = unit(w.tr);
    const hl = Math.hypot(T.x - W.x, T.y - W.y), u = { x: (T.x - W.x) / hl, y: (T.y - W.y) / hl };
    const sgn = Math.sign(u.x * tr.y - u.y * tr.x) || 1;
    const rot = (a) => { const r = rad(a) * sgn, c = Math.cos(r), s = Math.sin(r); return { x: u.x * c - u.y * s, y: u.x * s + u.y * c }; };
    const ax = W.x - S.x, ay = W.y - S.y, al = Math.hypot(ax, ay) || 1;
    let p = { x: -ay / al, y: ax / al };                                  // 팔에서 깃이 늘어지는 쪽
    const side = w.sec ? unit(w.sec) : tr;
    if (p.x * side.x + p.y * side.y < 0) p = { x: -p.x, y: -p.y };
    const chord = w.chord * K, hw = (w.hw !== undefined ? w.hw : w.chord * 0.7) * K, n = w.n || 5, notch = w.notch || 0.58;
    const ph = rot(90);                                                   // 손에서 깃 뿌리가 벌어지는 쪽
    const step = w.fan / (n - 1);
    const pts = [
      { x: S.x - p.x * chord * 0.14, y: S.y - p.y * chord * 0.14 },       // 어깨 앞
      { x: W.x - ph.x * 3 - u.x * 2, y: W.y - ph.y * 3 - u.y * 2 },       // 손목(앞으로 살짝 불룩)
    ];
    for (let i = 0; i < n; i++) {                                         // 끝깃: 둥근 끝, 깃 사이는 깊은 홈
      const t = i / (n - 1), a = w.fan * t, d = rot(a), l = rot(a + 90);
      const len = hl * (1 - (w.fall || 0.24) * Math.pow(t, 1.3)) * (i === 1 ? 1.03 : 1);
      const bx = W.x + ph.x * hw * t, by = W.y + ph.y * hw * t;
      const tx = bx + d.x * len, ty = by + d.y * len;
      const fw = Math.max(1.8 * K, (hw / (n - 1) + len * Math.sin(rad(step))) * 0.36);
      pts.push({ x: tx - l.x * fw - d.x * fw * 2.2, y: ty - l.y * fw - d.y * fw * 2.2 });
      pts.push({ x: tx - l.x * fw * 0.1, y: ty - l.y * fw * 0.1 });
      pts.push({ x: tx + l.x * fw - d.x * fw * 2.0, y: ty + l.y * fw - d.y * fw * 2.0 });
      if (i < n - 1) {
        const d2 = rot(a + step * 0.5), t2 = (i + 0.5) / (n - 1), l2 = len * notch;
        pts.push({ x: W.x + ph.x * hw * t2 + d2.x * l2, y: W.y + ph.y * hw * t2 + d2.y * l2, s: true });
      }
    }
    const last = rot(w.fan);
    // 마지막 끝깃과 둘째날개깃 사이의 홈
    pts.push({ x: W.x + ph.x * hw * 0.9 + last.x * hl * 0.42, y: W.y + ph.y * hw * 0.9 + last.y * hl * 0.42, s: true });
    [0.8, 0.55, 0.3, 0.08].forEach((t, i) => {                            // 둘째날개깃(손목 → 몸): 완만한 물결
      const bx = S.x + ax * t, by = S.y + ay * t, m = 0.45 + 0.55 * (1 - t / 0.8);
      let dx = last.x * (1 - m) + p.x * m, dy = last.y * (1 - m) + p.y * m; const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const len = chord * (0.86 + 0.14 * (1 - t));
      pts.push({ x: bx + dx * len, y: by + dy * len });
      if (i < 3) pts.push({ x: bx - ax * 0.125 + dx * len * 0.9, y: by - ay * 0.125 + dy * len * 0.9, s: true });
    });
    // 뿌리는 몸 안쪽으로 넉넉히 넣어 몸과 한 덩어리로 붙게 한다
    const cl = Math.hypot(S.x, S.y) || 1, bxn = -S.x / cl, byn = -S.y / cl, inb = 9 * K;
    pts.push({ x: S.x + p.x * chord * 0.72 - ax / al * 4 + bxn * inb, y: S.y + p.y * chord * 0.72 - ay / al * 4 + byn * inb });
    pts.push({ x: S.x - p.x * chord * 0.14 + bxn * inb, y: S.y - p.y * chord * 0.14 + byn * inb });
    return shape(pts);
  }

  const PATHS = FRAMES.map((fr) => ({ body: bodyPath(fr.pitch), near: wingPath(fr.near), far: wingPath(fr.far) }));
  const GLIDE = 8; // 활공할 때 쓰는 장면(9번, 갈매기 날개 자세)

  function create(parent, opts = {}) {
    const o = Object.assign({ color: '#1b1d1b', far: '#3b3e3b', fps: 20, speed: 1, glide: false }, opts);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'hj-crow');
    const farW = document.createElementNS(NS, 'path'), body = document.createElementNS(NS, 'path'), nearW = document.createElementNS(NS, 'path');
    farW.setAttribute('fill', o.far); body.setAttribute('fill', o.color); nearW.setAttribute('fill', o.color);
    g.append(farW, body, nearW);
    parent.appendChild(g);
    const api = {
      el: g, opts: o, frame: -1, time: 0,
      /* i번째 장면(0~9)을 그린다 */
      setFrame(i) {
        i = ((Math.round(i) % PATHS.length) + PATHS.length) % PATHS.length;
        if (i === api.frame) return;
        api.frame = i;
        farW.setAttribute('d', PATHS[i].far); body.setAttribute('d', PATHS[i].body); nearW.setAttribute('d', PATHS[i].near);
      },
      /* 시간(초)이 흐른 만큼 장면을 넘긴다. 기본 1초에 20장면 = 날갯짓 2번 */
      tick(dt) {
        if (o.glide) { api.setFrame(GLIDE); return; }
        api.time += dt * o.fps * o.speed;
        api.setFrame(Math.floor(api.time) % PATHS.length);
      },
    };
    api.setFrame(0);
    return api;
  }

  global.HojonoCrow = { create, frames: PATHS.length, FRAMES, PATHS };
})(window);
