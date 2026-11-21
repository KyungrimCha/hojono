/* 02 이야기: 스크롤에 맞춰 낱말이 하나씩 진해지고, 검은 깃털이 흔들리며 내려온다.
   11 마무리: 제목 위로 깃털이 살짝 내려앉는다. */
(() => {
  const H = window.HOJONO, gsap = window.gsap, ST = window.ScrollTrigger;

  /* 02 이야기: 스크롤에 맞춰 낱말이 하나씩 진해짐 */
  document.querySelectorAll('.story [data-words]').forEach((el) => {
    H.splitWords(el, 'wd');
    const words = el.querySelectorAll('.wd');
    if (H.RM || !ST) { words.forEach((w) => (w.style.opacity = 1)); return; }
    ST.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (self) => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => (w.style.opacity = i < n ? 1 : 0.16)); },
    });
  });

  /* 02 검은 깃털이 흔들리며 내려옴 */
  const feather = document.querySelector('.feather');
  if (feather && gsap && ST && !H.RM) {
    gsap.fromTo(feather, { y: -220, x: 40, rotate: -40, opacity: 0 }, {
      y: 0, x: 0, rotate: 8, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.story', start: 'top 70%', end: 'center 55%', scrub: 1 },
    });
  }

  /* 11 마무리: 제목에 닿으면 깃털 하나가 거꾸로(깃대가 위) 좌우로 흔들리며 내려와,
     제목 가운데 위에 가로로 눕듯 담백하게 내려앉음(한 번). 멀리서 작게 → 가까이 크게 */
  const endF = document.querySelector('.end-feather');
  if (endF && gsap && ST && !H.RM) {
    gsap.set(endF, { y: -230, x: 0, rotate: 190, scale: 0.45, opacity: 0 });
    const tl = gsap.timeline({ paused: true })
      .to(endF, { opacity: 1, duration: 0.5, ease: 'none' }, 0)
      .to(endF, { y: 0, scale: 1, duration: 2.8, ease: 'sine.out' }, 0)
      .to(endF, { keyframes: [
        { x: 26, rotate: 205, duration: 0.8, ease: 'sine.inOut' },
        { x: -20, rotate: 240, duration: 0.8, ease: 'sine.inOut' },
        { x: 10, rotate: 215, duration: 0.7, ease: 'sine.inOut' },
        { x: 0, rotate: 225, duration: 0.5, ease: 'sine.out' },
      ] }, 0); // 닿을 때 튕기는 효과 없이 그대로 멈춤
    ST.create({ trigger: '.end-title', start: 'top 72%', once: true, onEnter: () => tl.play() });
  }
})();
