/* 06 장소와 지도: 먹선 지도 위 다섯 핀. 핀에 올리면(휴대폰은 누르면) 핀 옆 말풍선에 장소 이야기(실제 사진이 있으면 사진)가 뜨고,
   인물을 고른 뒤 왼쪽 목록에서 코스를 고르면 까마귀가 방문 순서대로 날며 길을 남긴다(코스에 없는 핀은 흐리게).
   실제 길찾기는 외부 지도(카카오맵) 링크. */
(() => {
  const H = window.HOJONO, gsap = window.gsap, ST = window.ScrollTrigger;
  const svg = document.getElementById('mapSvg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  /* x, y = 지도 위 자리. tools/make-map.py가 실제 위도·경도로 계산한 값(지도를 다시 만들면 출력값으로 바꿀 것).
     원도심 보기는 0 0 1000 600, 방선문(남쪽 약 6.8km)은 전체 보기에서 보임.
     lx, ly, la = 이름 글자 위치(핀 기준)와 정렬 */
  const PLACES = {
    '용두암': { x: 134, y: 271, lx: 16, ly: -14, la: 'start', lat: 33.5149624, lng: 126.5116869, title: '해람이 돌아오는 곳', clue: '같은 이야기에 서로 다른 결말', photo: null },
    '사라봉': { x: 846, y: 169, lx: -16, ly: -14, la: 'end', lat: 33.51921, lng: 126.5473, title: '먼저 바람이 닿는 곳', clue: '바람이 멎은 뒤에도 들리는 작은 발소리', photo: null },
    '산지천': { x: 445, y: 314, lx: 16, ly: -14, la: 'start', lat: 33.5131711873, lng: 126.5272514754, title: '이야기가 교차하는 물길', clue: '물길 옆의 검은 깃털', photo: 'img/sanji-wide.webp' },
    '동문시장': { x: 420, y: 351, lx: -14, ly: 22, la: 'end', lat: 33.5116033, lng: 126.5260192, title: '소문이 모이는 골목', clue: '작은 씨앗 봉투', photo: null },
    '방선문': { x: 256, y: 1774, lx: 16, ly: -14, la: 'start', lat: 33.4522839134, lng: 126.5178167844, title: '서린의 오래된 기억', clue: '검정 연필로 적힌 기록', photo: null },
  };
  const COURSES = {
    seollang: [
      { id: 'A', name: '바람에서 물길로', stops: ['사라봉', '산지천'], view: '높은 곳에서 알아차린 변화가 물길 곁으로 이어진다.' },
      { id: 'B', name: '원도심 하루', stops: ['사라봉', '동문시장', '산지천'], view: '먹거리와 사람을 지나 작은 소리를 다시 듣는다.' },
    ],
    haeram: [
      { id: 'A', name: '바다에서 온 소식', stops: ['용두암', '산지천'], view: '바다의 단서와 도심 물길의 소문을 비교한다.' },
      { id: 'B', name: '맞지 않는 조각들', stops: ['용두암', '동문시장', '사라봉'], view: '세 곳에 흩어진 말을 대조한다.' },
    ],
    seorin: [
      { id: 'A', name: '작은 기록의 오후', stops: ['산지천', '동문시장'], view: '일상의 길에서 씨앗과 기록의 흔적을 본다.' },
      { id: 'B', name: '기억에서 일상으로', stops: ['방선문', '산지천', '동문시장'], view: '오래된 기억에서 현재의 생활로 이동한다.', note: '방선문 → 산지천은 차량 이동' },
    ],
  };
  const COLORS = { seollang: '#ec612e', haeram: '#1f406c', seorin: '#41604b' };

  /* 핀 만들기: 주황 점 + 이름. 지금 코스에 없는 장소는 흐리게(is-dim), 고른 장소는 테두리(is-on) */
  const pinsG = document.getElementById('pins');
  Object.entries(PLACES).forEach(([name, p]) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pin'); g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${name}: ${p.title}`);
    g.dataset.place = name;
    g.innerHTML = `<circle class="pin-ring" r="15"/><circle class="pin-halo" r="10"/><circle class="pin-dot" r="7"/>
      <text x="${p.lx}" y="${p.ly}" text-anchor="${p.la}">${name}</text>`;
    pinsG.appendChild(g);
  });

  /* 보기: 원도심(처음) ↔ 전체(방선문까지). viewBox를 부드럽게 옮기고, 핀·글자·선 굵기는 화면에서 같은 크기로 유지(--k) */
  const board = document.getElementById('mapBoard');
  const meta = svg.querySelector('.map-meta');
  const CORE = { x: 0, y: 0, w: 1000, h: 600 };
  const [wx, wy, ww, wh] = meta.dataset.wide.split(' ').map(Number);
  const WIDE = { x: wx, y: wy, w: ww, h: wh };
  const KM = +meta.dataset.km;
  const VB = { ...CORE };
  const compass = svg.querySelector('.map-compass');
  const scaleG = svg.querySelector('.map-scale');
  const waves = document.getElementById('mapWaves');
  const viewBtn = document.getElementById('mapView');
  let viewName = 'core', viewTween = null;
  const draw = () => {
    const k = VB.w / 1000;
    svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
    svg.style.setProperty('--k', k);
    if (waves) waves.setAttribute('patternTransform', `scale(${k})`); // 바다 물결 무늬도 화면에서 같은 크기로
    pinsG.querySelectorAll('.pin').forEach((g) => { const p = PLACES[g.dataset.place]; g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${k})`); });
    compass.setAttribute('transform', `translate(${VB.x + 952 * k} ${VB.y + 104 * k}) scale(${k})`);
    /* 축척: 원도심 500m, 전체 1km (막대 길이는 화면 기준으로 맞춤) */
    const wideish = k > 1.8, m = wideish ? 1 : 0.5, L = KM * m / k;
    scaleG.setAttribute('transform', `translate(${VB.x + 34 * k} ${VB.y + 578 * k}) scale(${k})`);
    scaleG.querySelector('path').setAttribute('d', `M0 0 H${L.toFixed(1)} M0 -5 V5 M${L.toFixed(1)} -5 V5 M${(L / 2).toFixed(1)} -3 V3`);
    const t = scaleG.querySelectorAll('text'); t[1].setAttribute('x', L.toFixed(1)); t[1].textContent = wideish ? '1km' : '500m';
    if (curPlace) place(PLACES[curPlace]);
  };
  const setView = (name, instant) => {
    if (name === viewName && !instant) return;
    viewName = name;
    board.classList.toggle('is-wide', name === 'wide');
    viewBtn.textContent = name === 'wide' ? '원도심 크게 보기' : '전체 지도 보기';
    viewBtn.setAttribute('aria-pressed', String(name === 'wide'));
    const to = name === 'wide' ? WIDE : CORE;
    if (viewTween) viewTween.kill();
    if (!gsap || H.RM || instant) { Object.assign(VB, to); draw(); return; }
    viewTween = gsap.to(VB, { ...to, duration: 1.1, ease: 'power3.inOut', onUpdate: draw });
  };
  viewBtn.addEventListener('click', () => setView(viewName === 'wide' ? 'core' : 'wide'));
  const inCore = (name) => { const p = PLACES[name]; return p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 600; };

  /* 핀 옆 말풍선: 사진(있으면) + 이름 + 한 줄 + 단서 */
  const info = document.getElementById('pinInfo');
  const coord = document.getElementById('mapCoord');
  /* 핀 표시만(테두리 + 좌표). 까마귀가 날 때는 이것만 씀 */
  const markPin = (name) => {
    if (!inCore(name)) setView('wide'); // 원도심 밖 장소(방선문)를 고르면 전체 보기로
    pinsG.querySelectorAll('.pin').forEach((g) => g.classList.toggle('is-on', g.dataset.place === name));
    const p = PLACES[name];
    coord.textContent = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${name}`;
  };
  /* 말풍선: 핀에 올렸을 때(휴대폰은 눌렀을 때)만 */
  const showInfo = (name) => {
    markPin(name);
    const p = PLACES[name];
    info.innerHTML = `${p.photo ? `<img src="${p.photo}" alt="">` : ''}<div><span class="tg">${p.photo ? '장소의 모습 · 실제 사진' : '장소 · 실제 사진 준비 중'}</span><b>${name}</b><small>${p.title}</small><small>단서: ${p.clue}</small></div>`;
    curPlace = name;
    place(p);
    info.classList.add('is-shown');
  };
  const hideInfo = () => { info.classList.remove('is-shown'); curPlace = null; };
  /* 말풍선 자리: 핀 오른쪽 아래 → 왼쪽 아래 → 오른쪽 위 → 왼쪽 위 순으로 지도 안에 다 들어오는 곳을 고르고,
     어디도 다 안 들어가면 지도 가장자리 안쪽으로 당겨 넣음(지도 크기가 바뀌어도 잘리지 않게) */
  let curPlace = null;
  function place(p) {
    const bw = board.clientWidth, bh = board.clientHeight;
    const px = (p.x - VB.x) / VB.w * bw, py = (p.y - VB.y) / VB.h * bh;
    const cw = info.offsetWidth, ch = info.offsetHeight, G = 22, M = 8;
    const cands = [[px + G, py - 6], [px - G - cw, py - 6], [px + G, py - ch - 26], [px - G - cw, py - ch - 26]];
    const fits = ([x, y]) => x >= M && y >= M && x + cw <= bw - M && y + ch <= bh - M;
    let [x, y] = cands.find(fits) || cands[0];
    x = Math.min(Math.max(x, M), bw - cw - M);
    y = Math.min(Math.max(y, M), bh - ch - M);
    info.style.left = x + 'px';
    info.style.top = y + 'px';
  }
  window.addEventListener('resize', () => { if (curPlace) place(PLACES[curPlace]); });
  pinsG.addEventListener('pointerover', (e) => { const g = e.target.closest('.pin'); if (g && e.pointerType !== 'touch' && curPlace !== g.dataset.place) showInfo(g.dataset.place); });
  pinsG.addEventListener('pointerout', (e) => { const g = e.target.closest('.pin'); if (g && e.pointerType !== 'touch' && !g.contains(e.relatedTarget)) hideInfo(); });
  pinsG.addEventListener('click', (e) => { const g = e.target.closest('.pin'); if (g) showInfo(g.dataset.place); });
  pinsG.addEventListener('focusin', (e) => { const g = e.target.closest('.pin'); if (g) showInfo(g.dataset.place); });
  pinsG.addEventListener('focusout', hideInfo);

  /* 코스 경로 */
  const route = document.getElementById('route');
  const ghost = document.getElementById('routeGhost');
  const crow = document.getElementById('mapCrow');
  const pathFor = (stops) => {
    let d = '';
    stops.forEach((s, i) => {
      const p = PLACES[s];
      if (!i) { d = `M${p.x},${p.y}`; return; }
      const a = PLACES[stops[i - 1]];
      const mx = (a.x + p.x) / 2, my = (a.y + p.y) / 2;
      const nx = -(p.y - a.y), ny = p.x - a.x, l = Math.hypot(nx, ny) || 1;
      const bend = Math.min(60, l * 0.18) * Math.max(1, l / 600); // 먼 구간(방선문)도 비슷한 정도로 휘게
      d += ` Q${(mx + nx / l * bend).toFixed(1)},${(my + ny / l * bend).toFixed(1)} ${p.x},${p.y}`;
    });
    return d;
  };
  let tween = null;
  const playCourse = (who, c) => {
    const d = pathFor(c.stops);
    route.setAttribute('d', d); ghost.setAttribute('d', d);
    route.style.stroke = COLORS[who];
    const L = route.getTotalLength();
    route.style.strokeDasharray = `${L} ${L}`;
    hideInfo(); markPin(c.stops[0]); // 나는 동안에는 말풍선을 숨기고 핀 표시만
    if (tween) tween.kill();
    if (!gsap || H.RM) { route.style.strokeDashoffset = 0; crow.setAttribute('opacity', 0); markPin(c.stops[c.stops.length - 1]); return; }
    const o = { t: 0 };
    crow.setAttribute('opacity', 1);
    let lastStop = 0;
    tween = gsap.to(o, { t: 1, duration: 1.4 * (c.stops.length - 1), ease: 'power2.inOut', onUpdate: () => {
      const l = L * o.t, p = route.getPointAtLength(l), q = route.getPointAtLength(Math.min(L, l + 4));
      route.style.strokeDashoffset = L - l;
      const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      const face = q.x < p.x ? -1 : 1, tilt = Math.max(-20, Math.min(30, Math.atan2(q.y - p.y, Math.abs(q.x - p.x) || 0.001) * 180 / Math.PI * 0.35));
      const k = VB.w / 1000;
      crow.setAttribute('transform', `translate(${p.x} ${p.y - 16 * k}) scale(${1.3 * k * face} ${1.3 * k}) rotate(${tilt.toFixed(1)})`);
      const stopIdx = Math.round(o.t * (c.stops.length - 1));
      if (stopIdx !== lastStop && Math.abs(o.t * (c.stops.length - 1) - stopIdx) < 0.04) { lastStop = stopIdx; markPin(c.stops[stopIdx]); }
    }, onComplete: () => { markPin(c.stops[c.stops.length - 1]); gsap.to(crow, { attr: { opacity: 0 }, duration: 0.6, delay: 0.6 }); } });
  };

  /* 인물 버튼과 지도 위 코스 목록 */
  const coursesEl = document.getElementById('courses');
  const tabs = [...document.querySelectorAll('.who-tabs button')];
  const NAMES = { seollang: '설랑', haeram: '해람', seorin: '서린' };
  const linkTo = (s) => `https://map.kakao.com/link/to/${encodeURIComponent(s)},${PLACES[s].lat},${PLACES[s].lng}`;
  const renderCourses = (who) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.who === who)));
    document.getElementById('map').style.setProperty('--c', COLORS[who]); // 지도와 아래 코스 목록이 함께 쓰는 인물 색
    document.getElementById('courseWho').textContent = `${NAMES[who]}의 길`;
    document.getElementById('courseCount').textContent = `코스 ${COURSES[who].length}개`;
    coursesEl.innerHTML = COURSES[who].map((c, i) => `
      <div class="course">
        <button class="course-pick" type="button" data-i="${i}" aria-pressed="false" data-cursor="날기">
          <span class="n">${c.id}</span><b>${c.name}</b>
          <span class="r">${c.stops.join(' → ')}${c.note ? ` · ${c.note}` : ''}</span>
        </button>
        <span class="legs">${c.stops.slice(1).map((s) => `<a href="${linkTo(s)}" target="_blank" rel="noopener">${s} 길찾기 ↗</a>`).join('')}</span>
      </div>`).join('');
    if (gsap && !H.RM) gsap.fromTo(coursesEl.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.06 });
  };
  let curWho = 'seollang';
  /* auto: 처음 화면에 들어왔을 때 저절로 도는 첫 코스. 그 전에 직접 전체 보기를 눌렀다면 보기를 되돌리지 않음 */
  const choose = (i, auto) => {
    coursesEl.querySelectorAll('.course-pick').forEach((b, k) => { b.setAttribute('aria-pressed', String(k === i)); b.parentElement.classList.toggle('is-on', k === i); });
    const c = COURSES[curWho][i];
    pinsG.querySelectorAll('.pin').forEach((g) => g.classList.toggle('is-dim', !c.stops.includes(g.dataset.place)));
    /* 코스가 원도심 안이면 원도심 보기, 방선문이 들어 있으면 전체 보기로 옮긴 뒤 날기 시작 */
    const want = !c.stops.every(inCore) || (auto && viewName === 'wide') ? 'wide' : 'core';
    const wait = want !== viewName && gsap && !H.RM;
    setView(want);
    if (wait) gsap.delayedCall(0.9, () => playCourse(curWho, c)); else playCourse(curWho, c);
  };
  coursesEl.addEventListener('click', (e) => { const b = e.target.closest('.course-pick'); if (b) choose(+b.dataset.i); });
  tabs.forEach((t) => t.addEventListener('click', () => { curWho = t.dataset.who; renderCourses(curWho); choose(0); }));
  renderCourses(curWho);
  setView('core', true);
  markPin('산지천');

  /* 지도 선이 그려지며 등장, 첫 코스 자동 재생 */
  const lines = svg.querySelectorAll('.map-lines path');
  if (gsap && ST && !H.RM) {
    lines.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; });
    ST.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => {
      gsap.to(lines, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: 0.08, onComplete: () => lines.forEach((p) => { p.style.strokeDasharray = 'none'; }) });
      gsap.from(pinsG.children, { scale: 0, transformOrigin: 'center', duration: 0.7, ease: 'back.out(2)', stagger: 0.1, delay: 0.9 });
      gsap.delayedCall(1.8, () => choose(0, true));
    } });
  } else choose(0);

  /* 다른 화면에서 부르기 */
  const scrollToMap = () => {
    if (ST) ST.refresh();
    const y = document.getElementById('map').getBoundingClientRect().top + window.scrollY - 10;
    window.scrollTo({ top: y, behavior: H.RM ? 'auto' : 'smooth' });
  };
  H.selectWho = (who) => { scrollToMap(); setTimeout(() => { curWho = who; renderCourses(who); choose(0); }, H.RM ? 0 : 900); };
  H.focusPlace = (who, place) => {
    scrollToMap();
    setTimeout(() => {
      curWho = who; renderCourses(who);
      const i = Math.max(0, COURSES[who].findIndex((c) => c.stops[0] === place));
      choose(i); markPin(place);
    }, H.RM ? 0 : 900);
  };
})();
