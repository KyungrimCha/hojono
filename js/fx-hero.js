/* 01 첫 화면: 스크롤한 만큼 영상이 넘어간다(오늘의 산지천 → 안개 → 옛 산지천의 달밤).
   영상이 끝 장면에 닿으면 이어지는 스크롤에 맞춰 제목이 한 글자씩 올라오고, 소개 글과 버튼이 뒤따른다.
   글이 다 나온 바로 다음부터 화면이 풀려 다음 화면으로 내려간다.
   위로 되돌리면 글자가 내려가고 영상도 거꾸로 돌아간다.
   움직임 줄이기 설정이거나 GSAP이 없으면 끝 장면 그림 위에 제목이 바로 보인다(css의 html.fx 참고). */
(() => {
  const H = window.HOJONO, gsap = window.gsap, ST = window.ScrollTrigger;
  const hero = document.getElementById('top');
  const v = document.getElementById('heroVideo');
  const title = document.getElementById('heroTitle');
  if (!hero || !v || !title) return;
  const stage = hero.querySelector('.hero-stage');

  /* ── 조절값 ── */
  const PIN = 2.8;        // 첫 화면이 붙잡혀 있는 스크롤 길이(화면 높이의 몇 배)
  const FILM = 0.7;       // 그중 영상이 넘어가는 구간(0~0.7)
  const TEXT_END = 0.97;  // 영상이 끝난 뒤 여기까지 스크롤하는 동안 글이 다 나옴. 그 뒤 바로 다음 화면으로
  const NIGHT_AT = 0.42;  // 영상이 이만큼 지나면 하늘이 어두워지므로 메뉴 글자를 밝은색으로
  const FOLLOW = 9;       // 스크롤을 따라가는 빠르기(작을수록 느긋하게 따라옴)

  /* 첫 화면이 화면에 남아 있는 동안만 밤 색을 쓴다(다음 화면이 절반쯤 올라오면 그 화면의 색을 따름) */
  const inView = () => hero.getBoundingClientRect().bottom > window.innerHeight * 0.5;

  /* ── 움직임 없이 보여 주는 경우 ── */
  if (H.RM || !gsap || !ST) {
    document.documentElement.classList.remove('fx');
    let was = null;
    const sync = () => { const on = inView(); if (on !== was) { was = on; H.setNight('hero', on); } };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
    return;
  }

  /* ── 제목을 글자 단위로 나눔 (em 같은 안쪽 태그는 그대로 둠) ── */
  title.setAttribute('aria-label', title.textContent.trim());
  const split = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 1) { split(n); return; }
    if (n.nodeType !== 3) return;
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const word = document.createElement('span');
      word.className = 'hw'; word.setAttribute('aria-hidden', 'true');
      [...part].forEach((c) => {
        const box = document.createElement('span'); box.className = 'hc';
        const ch = document.createElement('span'); ch.className = 'hci'; ch.textContent = c;
        box.appendChild(ch); word.appendChild(box);
      });
      frag.appendChild(word);
    });
    n.replaceWith(frag);
  });
  split(title);
  const chars = title.querySelectorAll('.hci');
  const rest = hero.querySelectorAll('.hero-lede, .hero-copy .btn');

  /* 제목 등장: 글자가 아래에서 하나씩 올라오고, 소개 글과 버튼이 이어서 나타남.
     시간으로 재생하지 않고 스크롤 위치에 맞춰 앞뒤로 움직인다(아래 tick에서 reveal.progress) */
  gsap.set(chars, { yPercent: 115, opacity: 0 });
  gsap.set(rest, { y: 18, opacity: 0 });
  const reveal = gsap.timeline({ paused: true })
    .to(chars, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.16 })
    .to(rest, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.25 }, '-=0.35');
  hero.classList.add('is-ready');

  /* ── 영상 준비: 통째로 받아 두어야 스크롤할 때 끊기지 않음 ── */
  const small = window.matchMedia('(max-width: 760px)').matches || (navigator.connection && navigator.connection.saveData);
  const src = (small && v.dataset.srcSmall) || v.dataset.src;
  let ready = false;
  v.addEventListener('loadeddata', () => {
    ready = true;
    /* 일부 휴대폰 브라우저는 한 번 재생을 건드려야 장면을 그림 */
    const p = v.play(); if (p && p.then) p.then(() => v.pause()).catch(() => {});
    v.classList.add('is-on');
    kick();
  });
  const direct = () => { v.src = src; v.load(); };
  if (src && window.fetch && location.protocol !== 'file:') {
    fetch(src).then((r) => { if (!r.ok) throw 0; return r.blob(); })
      .then((b) => { v.src = URL.createObjectURL(b); v.load(); }).catch(direct);
  } else if (src) direct();

  /* ── 스크롤 → 영상 위치 ── */
  let target = 0, cur = 0, raf = 0, last = 0, ended = false, night = false;
  const setEnd = (on) => {
    if (on === ended) return;
    ended = on;
    hero.classList.toggle('is-end', on);
  };
  const setNight = () => {
    const on = cur / FILM > NIGHT_AT && inView();
    if (on !== night) { night = on; H.setNight('hero', on); }
  };
  const tick = (now) => {
    raf = 0;
    /* 화면 주사율과 상관없이 같은 빠르기로 따라가게 지난 시간으로 계산 */
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
    last = now;
    cur += (target - cur) * (1 - Math.exp(-dt * FOLLOW));
    if (Math.abs(target - cur) < 0.0008) cur = target;
    let busy = cur !== target;
    const film = Math.min(1, cur / FILM);
    if (ready && v.duration) {
      const t = film * Math.max(0, v.duration - 0.06);
      if (v.seeking) busy = true;
      else if (Math.abs(v.currentTime - t) > 0.02) { v.currentTime = t; busy = true; }
    }
    reveal.progress(Math.max(0, Math.min(1, (cur - FILM) / (TEXT_END - FILM))));
    setEnd(film > 0.96);
    setNight();
    if (busy) raf = requestAnimationFrame(tick); else last = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  ST.create({
    trigger: stage, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * PIN),
    pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (self) => {
      target = self.progress;
      hero.classList.toggle('is-moving', self.progress > 0.015);
      kick();
    },
  });
  /* 첫 화면이 화면 밖으로 밀려 올라가는 동안에도 밤 색을 맞춤 */
  ST.create({ trigger: hero, start: 'bottom 50%', refreshPriority: -1, onEnter: setNight, onLeaveBack: setNight });
  ST.addEventListener('refresh', kick);
})();
