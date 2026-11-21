/* 공통: 움직임 줄이기 판단, 글자 나누기, 내비게이션, 커서, 낮·밤 전환, 시트 열고 닫기 */
(() => {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOJONO = (window.HOJONO = { RM });
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (gsap && ST) {
    gsap.registerPlugin(ST);
    /* 휴대폰 주소창이 접히고 펼쳐지며 높이만 바뀔 때는 위치를 다시 계산하지 않음(스크롤 중 화면이 튀지 않게) */
    ST.config({ ignoreMobileResize: true });
  }

  /* 낱말 단위로 감싸기 (em 등 안쪽 태그 유지) */
  HOJONO.splitWords = (el, cls = 'w') => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const outer = document.createElement('span');
            outer.className = cls;
            if (cls === 'w') { const inner = document.createElement('span'); inner.className = 'wi'; inner.textContent = part; outer.appendChild(inner); }
            else outer.textContent = part;
            frag.appendChild(outer);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return el;
  };
  /* 글자 단위 */
  HOJONO.splitChars = (el) => {
    const t = el.textContent;
    el.setAttribute('aria-label', t);
    el.textContent = '';
    [...t].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = c; el.appendChild(s); });
    return el.querySelectorAll('.ch');
  };

  /* 문장 단위 줄바꿈: 문단을 문장(.sent)으로, 문장을 다시 쉼표 마디(.cl)로 감싼다.
     CSS에서 이 덩어리들을 한 묶음으로 다루므로, "…이야기입니다. 인물을 / 따라가다"처럼
     다음 문장(마디)의 첫 낱말만 윗줄에 매달리지 않고 문장·쉼표 앞에서 줄이 바뀐다.
     문구를 고칠 때 따로 할 일은 없다(마침표·물음표·느낌표·쉼표 뒤 띄어쓰기를 기준으로 자동으로 나눔). */
  const SENT_END = /([.?!…][)"'”’]?)(\s+)(?=\S)/;
  const CLAUSE_END = /(,)(\s+)(?=\S)/;
  /* el의 바로 아래 글자를 re 자리에서 끊어 cls 덩어리들로 바꿈. 끊을 자리가 없으면 그대로 둠 */
  const chunk = (el, re, cls) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && re.test(n.textContent.replace(/\s+$/, '')))) return false;
    const parts = [];
    let cur = document.createElement('span');
    const flush = () => { if (cur.textContent.trim()) { cur.className = cls; parts.push(cur); } cur = document.createElement('span'); };
    [...el.childNodes].forEach((n) => {
      if (n.nodeType !== 3) { cur.appendChild(n); return; }
      let t = n.textContent, m;
      while ((m = t.match(re))) {
        cur.appendChild(document.createTextNode(t.slice(0, m.index + m[1].length)));
        flush();
        parts.push(document.createTextNode(' '));
        t = t.slice(m.index + m[0].length);
      }
      if (t) cur.appendChild(document.createTextNode(t));
    });
    flush();
    el.replaceChildren(...parts);
    return true;
  };
  HOJONO.sentences = (root = document) => {
    const list = root.matches && root.matches('p, li, dd, figcaption') ? [root] : root.querySelectorAll('p, li, dd, figcaption');
    list.forEach((el) => {
      /* 긴 소개 글(data-prose 안)은 문장마다 끊지 않고 자연스럽게 흘림 */
      if (el.closest('[data-prose]') || el.querySelector('.sent, .cl, input, textarea, select, button')) return;
      if (chunk(el, SENT_END, 'sent')) el.querySelectorAll(':scope > .sent').forEach((s) => chunk(s, CLAUSE_END, 'cl'));
      else chunk(el, CLAUSE_END, 'cl');
    });
  };
  HOJONO.sentences();

  /* 제목 등장: 낱말이 아래에서 올라옴 */
  document.querySelectorAll('[data-split]').forEach((el) => {
    HOJONO.splitWords(el, 'w');
    if (RM || !gsap) return;
    const words = el.querySelectorAll('.wi');
    gsap.set(words, { yPercent: 105 });
    const play = () => gsap.to(words, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 });
    if (el.closest('.hero')) gsap.delayedCall(0.25, play);
    else ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: play });
  });

  /* 내비게이션: 내릴 때 숨고 올릴 때 나타남 */
  const nav = document.getElementById('nav');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('is-hidden', y > lastY && y > 200);
    lastY = y;
  }, { passive: true });

  /* 모바일 전체 화면 메뉴 */
  const menuBtn = nav.querySelector('.nav-menu');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? '닫기' : '메뉴';
    if (open) {
      menu.hidden = false;
      document.body.style.overflow = 'hidden';
      if (gsap && !RM) gsap.fromTo(menu, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: 0.8, ease: 'expo.inOut' });
      else menu.style.clipPath = 'none';
      nav.style.color = 'var(--paper)';
    } else {
      document.body.style.overflow = '';
      nav.style.color = '';
      if (gsap && !RM) gsap.to(menu, { clipPath: 'circle(0% at 100% 0%)', duration: 0.6, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
      else menu.hidden = true;
    }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  /* 커서 (PC만) */
  const cursor = document.querySelector('.cursor');
  if (cursor && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const label = cursor.querySelector('.cursor-label');
    let x = -100, y = -100, cx = -100, cy = -100;
    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      const t = e.target.closest && e.target.closest('[data-cursor]');
      cursor.classList.toggle('has-label', !!t);
      label.textContent = t ? t.dataset.cursor : '';
    }, { passive: true });
    const relabel = () => { const el = document.elementFromPoint(x, y); const t = el && el.closest('[data-cursor]'); cursor.classList.toggle('has-label', !!t); label.textContent = t ? t.dataset.cursor : ''; };
    window.addEventListener('scroll', () => requestAnimationFrame(relabel), { passive: true });
    const tick = () => { cx += (x - cx) * (RM ? 1 : 0.22); cy += (y - cy) * (RM ? 1 : 0.22); cursor.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(tick); };
    tick();
  }

  /* 낮·밤: data-tone="night" 화면에 들어가면 body가 밤 색.
     밤 화면이 연달아 있어도 깜빡이지 않게, "지금 밤인 곳"을 모아 두고 하나라도 있으면 밤으로 둔다.
     첫 화면 영상(js/fx-hero.js)도 HOJONO.setNight('hero', …)로 여기에 참여한다 */
  const nights = new Set();
  HOJONO.setNight = (key, on) => {
    if (on) nights.add(key); else nights.delete(key);
    document.body.classList.toggle('is-night', nights.size > 0);
  };
  if (ST) {
    document.querySelectorAll('[data-tone="night"]').forEach((sec, i) => {
      /* refreshPriority -1: 고정(pin) 구간 높이가 정해진 뒤에 위치를 계산 */
      ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', refreshPriority: -1, onToggle: (self) => HOJONO.setNight(sec.id || 'sec' + i, self.isActive) });
    });
  }

  /* 시트: 누른 요소의 자리에서 펼쳐지고, 닫으면 그 자리로 접힘 */
  /* 카드 자리(p=0) ↔ 전체 화면(p=1) 사이의 clip-path. 문자열 보간 대신 숫자 하나로 계산 */
  const rectOf = (el) => {
    const r = el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    return [Math.max(0, r.top), Math.max(0, vw - r.right), Math.max(0, vh - r.bottom), Math.max(0, r.left)];
  };
  const clipAt = (box, p) => `inset(${box.map((v) => (v * (1 - p)).toFixed(1) + 'px').join(' ')} round ${(6 * (1 - p)).toFixed(1)}px)`;
  const morph = (sheet, box, from, to, dur, ease, onComplete) => {
    const o = { p: from };
    sheet.style.clipPath = clipAt(box, from);
    return gsap.to(o, { p: to, duration: dur, ease, onUpdate: () => { sheet.style.clipPath = clipAt(box, o.p); }, onComplete });
  };
  let lastFocus = null;
  HOJONO.openSheet = (sheet, fromEl) => {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    sheet._from = fromEl;
    /* 누른 카드의 커서 문구("열기" 등)가 펼쳐진 화면 위에 남지 않게 */
    const cur = document.querySelector('.cursor'); if (cur) cur.classList.remove('has-label');
    document.body.style.overflow = 'hidden';
    const inner = sheet.querySelector('.sheet-inner');
    if (gsap && !RM && fromEl) {
      morph(sheet, rectOf(fromEl), 0, 1, 1.1, 'expo.inOut', () => { sheet.style.clipPath = 'none'; });
      gsap.fromTo(inner.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.55 });
    } else { sheet.style.clipPath = 'none'; }
    sheet.querySelector('[data-close]').focus({ preventScroll: true });
  };
  /* after: 다 닫힌 뒤(화면 잠금이 풀린 뒤) 할 일. 예: 닫고 지도로 이동 */
  HOJONO.closeSheet = (sheet, after) => {
    const done = () => {
      sheet.hidden = true; document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus({ preventScroll: true });
      if (after) after();
    };
    const v = sheet.querySelector('video'); if (v) v.pause();
    if (gsap && !RM && sheet._from) morph(sheet, rectOf(sheet._from), 1, 0, 0.9, 'expo.inOut', () => { sheet.style.clipPath = ''; done(); });
    else done();
  };
  document.querySelectorAll('.sheet').forEach((sheet) => {
    sheet.addEventListener('click', (e) => {
      const c = e.target.closest('[data-close]');
      if (!c) return;
      e.preventDefault();
      /* 상세 안의 "이 시제품이 궁금해요" 같은 링크: 닫은 뒤 해당 화면으로 */
      const to = c.dataset.goto && document.getElementById(c.dataset.goto);
      HOJONO.closeSheet(sheet, to ? () => HOJONO.scrollToEl(to) : null);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.sheet')].find((s) => !s.hidden);
    if (open) HOJONO.closeSheet(open);
    else if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
  });

  /* 영상 시트. poster: 영상이 뜨기 전에 보일 그림(없으면 비움) */
  HOJONO.openVideo = (src, note, fromEl, poster) => {
    const sheet = document.getElementById('videoSheet');
    const v = document.getElementById('videoEl');
    document.getElementById('videoNote').textContent = note || '';
    if (poster) v.poster = poster; else v.removeAttribute('poster');
    if (src) { v.hidden = false; if (v.getAttribute('src') !== src) v.src = src; } else { v.hidden = true; v.removeAttribute('src'); }
    HOJONO.openSheet(sheet, fromEl);
    if (src) v.play().catch(() => {});
  };

  /* 모달(가운데 작은 창): data-modal="아이디"가 붙은 링크·버튼을 누르면 열림. 바깥·닫기·Esc로 닫힘 */
  let modalOpen = null, modalFrom = null;
  HOJONO.openModal = (m, from) => {
    modalOpen = m; modalFrom = from || document.activeElement;
    const cur = document.querySelector('.cursor'); if (cur) cur.classList.remove('has-label');
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => m.classList.add('is-on'));
    const body = m.querySelector('.modal-body'); if (body) body.scrollTop = 0;
    m.querySelector('.modal-x').focus({ preventScroll: true });
  };
  HOJONO.closeModal = () => {
    const m = modalOpen; if (!m) return;
    modalOpen = null;
    m.classList.remove('is-on');
    setTimeout(() => { m.hidden = true; document.body.style.overflow = ''; if (modalFrom) modalFrom.focus({ preventScroll: true }); }, RM ? 0 : 250);
  };
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-modal]');
    if (open) { const m = document.getElementById(open.dataset.modal); if (m) { e.preventDefault(); HOJONO.openModal(m, open); } return; }
    if (modalOpen && e.target.closest('[data-modal-close]')) HOJONO.closeModal();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen) { e.stopImmediatePropagation(); HOJONO.closeModal(); } }, true);

  /* 알림 문구: 화면 아래 가운데에 잠깐 떴다가 사라짐. data-toast="문구"가 붙은 버튼을 누르면 그 문구를 띄움 */
  let toastEl = null, toastT = 0;
  HOJONO.toast = (text) => {
    if (!toastEl) {
      toastEl = document.createElement('p');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.remove('is-on'); void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3600);
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-toast]'); if (b) HOJONO.toast(b.dataset.toast); });

  /* 페이지 안에서 다른 화면으로 부드럽게 이동.
     브라우저 기본 부드러운 이동(behavior:'smooth')은 붙잡힌 화면(쪼꼬미·연회 등)의 위치를 다시 계산할 때
     중간에 끊기거나 엉뚱한 곳으로 튀므로(특히 휴대폰), 매 프레임 목적지를 다시 재면서 직접 옮긴다.
     to: 요소 또는 숫자(높이). 손가락·휠·키를 쓰면 바로 멈추고 사용자에게 넘김.
     도착한 뒤에도 잠깐(HOLD초) 자리를 지킴: 휴대폰 주소창이 접히거나 붙잡힌 화면 높이가 다시 계산되어
     목적지가 밀려나면 다시 맞춤(도착 직후 엉뚱한 화면으로 올라가는 문제) */
  let scrollTween = null, holdOff = null;
  const HOLD = 1.5;
  HOJONO.scrollToEl = (to, offset = 10, onDone) => {
    const target = () => (typeof to === 'number' ? to : to.getBoundingClientRect().top + window.scrollY - offset);
    const jump = (y) => window.scrollTo(0, Math.max(0, Math.round(y))); // 모든 브라우저(아이폰 사파리 포함)에서 바로 이동하는 형태
    if (scrollTween) scrollTween.kill();
    if (holdOff) holdOff();
    if (!gsap || RM) { jump(target()); if (onDone) onDone(); return; }
    const from = window.scrollY, o = { p: 0 };
    let holdT = null;
    const stopHold = () => { if (holdT) { gsap.ticker.remove(holdT); holdT = null; } };
    const quit = () => { if (scrollTween) scrollTween.kill(); scrollTween = null; stopHold(); off(); };
    const EV = ['wheel', 'touchstart', 'keydown'];
    const off = () => { EV.forEach((ev) => window.removeEventListener(ev, quit)); holdOff = null; };
    EV.forEach((ev) => window.addEventListener(ev, quit, { passive: true }));
    holdOff = quit;
    const dur = Math.min(1.4, Math.max(0.6, Math.abs(target() - from) / 3000));
    scrollTween = gsap.to(o, { p: 1, duration: dur, ease: 'power2.inOut',
      onUpdate: () => jump(from + (target() - from) * o.p),
      onComplete: () => {
        scrollTween = null; jump(target());
        if (onDone) onDone();
        const until = performance.now() + HOLD * 1000;
        holdT = () => { if (performance.now() > until) { stopHold(); off(); return; } const t = target(); if (Math.abs(t - window.scrollY) > 2) jump(t); };
        gsap.ticker.add(holdT);
      } });
  };

  /* 머리의 HOJONO 글자: 첫 화면(히어로)부터 모든 장면이 처음처럼 다시 재생되도록 맨 위에서 새로 불러옴 */
  const logo = nav.querySelector('.nav-logo');
  if (logo) logo.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo(0, 0);
    location.reload();
  });

  /* 같은 페이지 앵커 이동 */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    /* 이미 다른 곳에서 처리한 링크(예: 03 패널 → 인물 상세 열기)는 건드리지 않음. 여기서 또 이동하면 앞의 이동과 그 뒤 할 일이 취소됨 */
    if (!a || a === logo || e.defaultPrevented) return;
    const id = a.getAttribute('href').slice(1);
    const t = id === 'top' ? 0 : document.getElementById(id);
    if (t == null) return;
    e.preventDefault();
    HOJONO.scrollToEl(t);
  });
})();
