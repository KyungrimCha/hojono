/* 오른쪽 진행 표시줄: 지금 페이지의 어디쯤인지 세로선과 점으로 보여 준다.
   main 안에서 data-rail="이름"이 붙은 화면마다 눈금이 하나씩 생긴다(화면을 더하거나 빼면 눈금도 따라 바뀜).
   스크롤에 맞춰 주황 선이 차오르고, 점 옆에 지금 화면의 번호와 이름이 뜬다. 눈금을 누르면 그 화면으로 이동. */
(() => {
  const H = window.HOJONO, ST = window.ScrollTrigger;
  const secs = [...document.querySelectorAll('main [data-rail]')];
  if (secs.length < 2) return;

  /* ── 표시줄 만들기 ── */
  const nav = document.createElement('nav');
  nav.className = 'rail';
  nav.setAttribute('aria-label', '페이지 위치');
  nav.innerHTML = '<span class="rail-track"></span><span class="rail-fill"></span><span class="rail-dot"></span><span class="rail-now" aria-hidden="true"><b></b><span></span></span>';
  const pad = (n) => String(n).padStart(2, '0');
  const ticks = secs.map((sec, i) => {
    const a = document.createElement('a');
    a.className = 'rail-tick';
    a.href = '#' + sec.id;
    a.style.top = (i / (secs.length - 1)) * 100 + '%';
    a.innerHTML = `<span class="sr">${pad(i + 1)} ${sec.dataset.rail}</span>`;
    a.title = `${pad(i + 1)} ${sec.dataset.rail}`;
    nav.appendChild(a);
    return a;
  });
  document.body.appendChild(nav);
  const fill = nav.querySelector('.rail-fill'), dot = nav.querySelector('.rail-dot');
  const now = nav.querySelector('.rail-now'), nowNum = now.querySelector('b'), nowName = now.querySelector('span');

  /* 각 화면이 시작하는 높이. 붙잡혀 있는(pin) 화면은 붙잡힌 길이까지 포함한 바깥 틀 기준 */
  let tops = [];
  const measure = () => {
    tops = secs.map((s) => (s.closest('.pin-spacer') || s.parentElement.closest('.pin-spacer') || s).getBoundingClientRect().top + window.scrollY);
    tops.push(document.documentElement.scrollHeight);
    update();
  };

  let cur = -1;
  const update = () => {
    if (!tops.length) return;
    /* 기준선: 맨 위에서는 화면 맨 위, 맨 아래에서는 화면 맨 아래로 옮겨 감
       (맨 처음엔 점이 첫 눈금에 정확히, 맨 끝에선 마지막 눈금에 정확히 맞도록) */
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY + window.innerHeight * Math.min(1, Math.max(0, window.scrollY / max));
    let i = 0;
    while (i < secs.length - 1 && y >= tops[i + 1]) i++;
    const span = Math.max(1, tops[i + 1] - tops[i]);
    const frac = i === secs.length - 1 ? 0 : Math.min(1, Math.max(0, (y - tops[i]) / span));
    const p = Math.min(1, (i + frac) / (secs.length - 1));
    fill.style.transform = `scaleY(${p.toFixed(4)})`;
    dot.style.top = p * 100 + '%';
    now.style.top = p * 100 + '%';
    if (i !== cur) {
      cur = i;
      nowNum.textContent = pad(i + 1);
      nowName.textContent = secs[i].dataset.rail;
      ticks.forEach((t, k) => { t.classList.toggle('is-past', k <= i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    }
  };

  let raf = 0;
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(measure._t); measure._t = setTimeout(measure, 200); });
  if (ST) ST.addEventListener('refresh', measure);
  window.addEventListener('load', measure);
  measure();
})();
