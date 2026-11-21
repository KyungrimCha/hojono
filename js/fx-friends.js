/* 03/BONUS 쪼꼬미들: 화면을 붙잡아 두고 스크롤로 넷을 넘긴다.
   배경색이 따라 바뀌고 이름은 글자 단위로 흐렸다 선명해짐. 흰 배경 사진은 multiply로 색 위에 얹음. */
(() => {
  const H = window.HOJONO, gsap = window.gsap, ST = window.ScrollTrigger;
  const sec = document.getElementById('friends');
  if (!sec) return;
  const stage = sec.querySelector('.friends-stage');
  const slides = [...sec.querySelectorAll('.friend')];
  slides.forEach((s) => H.splitChars(s.querySelector('.friend-name')));
  let cur = -1;

  const show = (i) => {
    if (i === cur) return;
    const prev = slides[cur];
    cur = i;
    const s = slides[i];
    if (!gsap || H.RM) {
      slides.forEach((x, k) => x.classList.toggle('is-on', k === i));
      stage.style.background = s.dataset.color; return;
    }
    gsap.to(stage, { backgroundColor: s.dataset.color, duration: 0.9, ease: 'power2.out' });
    if (prev) gsap.to(prev.querySelector('img'), { yPercent: -12, opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => prev.classList.remove('is-on') });
    s.classList.add('is-on');
    gsap.fromTo(s.querySelector('img'), { yPercent: 14, opacity: 0, scale: 0.94 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', delay: prev ? 0.2 : 0 });
    gsap.fromTo(s.querySelectorAll('.ch'), { opacity: 0, filter: 'blur(12px)', yPercent: 30 }, { opacity: 1, filter: 'blur(0px)', yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.25 });
    gsap.fromTo(s.querySelector('.friend-count'), { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.2 });
  };
  show(0);

  if (ST && !H.RM) {
    ST.create({
      trigger: sec, start: 'top top', end: () => '+=' + window.innerHeight * 3, pin: true, anticipatePin: 1,
      onUpdate: (self) => show(Math.min(slides.length - 1, Math.floor(self.progress * slides.length * 0.999))),
    });
  } else {
    /* 움직임 줄이기: 붙잡지 않고 눌러서 넘김 */
    stage.addEventListener('click', () => show((cur + 1) % slides.length));
  }

  /* 포인터 반대쪽으로 살짝 떠 움직임 */
  if (gsap && !H.RM && window.matchMedia('(pointer:fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(stage.querySelectorAll('.friend img'), { x: -dx * 30, y: -dy * 20, duration: 1, ease: 'power3.out', overwrite: 'auto' });
    });
  }

  const btn = document.getElementById('friendsPlay');
  btn.addEventListener('click', (e) => { e.stopPropagation(); H.openVideo('img/little-friends.mp4', '설랑이 만든 쪼꼬미들 · 약 13초 · 캐릭터 비주얼 시안', btn); });
})();
