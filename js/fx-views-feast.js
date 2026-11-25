/* 07 두 시선: 끌어서 경계 옮기기 + 버튼. 08 보름달 연회: 화면을 붙잡고 작은 달이 커져 영상 화면이 됨. */
(() => {
  const H = window.HOJONO, gsap = window.gsap, ST = window.ScrollTrigger;

  const cmp = document.getElementById('compare');
  const range = document.getElementById('compareRange');
  if (cmp && range) {
    const set = (v) => { range.value = v; cmp.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', () => set(range.value));
    document.querySelectorAll('[data-compare]').forEach((b) => b.addEventListener('click', () => {
      const to = +b.dataset.compare;
      if (gsap && !H.RM) { const o = { v: +range.value }; gsap.to(o, { v: to, duration: 0.9, ease: 'expo.inOut', onUpdate: () => set(o.v.toFixed(1)) }); }
      else set(to);
    }));
    /* 들어올 때 한 번 경계가 움직여 조작할 수 있음을 알림 */
    if (gsap && ST && !H.RM) {
      ST.create({ trigger: cmp, start: 'top 70%', once: true, onEnter: () => { const o = { v: 50 }; gsap.to(o, { v: 30, duration: 0.8, ease: 'power2.inOut', yoyo: true, repeat: 1, onUpdate: () => set(o.v.toFixed(1)) }); } });
    }
  }

  const feast = document.getElementById('feast');
  if (feast) {
    const img = feast.querySelector('.feast-moon img');
    const copy = feast.querySelector('.feast-copy');
    const play = document.getElementById('feastPlay');
    const apply = (t) => {
      const e = t * t;
      const r = 7 + e * 88, cx = 78 + (50 - 78) * e, cy = 22 + (50 - 22) * e;
      img.style.clipPath = `circle(${r.toFixed(1)}% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%)`;
      copy.style.opacity = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.2);
      play.classList.toggle('is-ready', t > 0.82);
    };
    if (ST && !H.RM) {
      ST.create({ trigger: feast, start: 'top top', end: () => '+=' + window.innerHeight * 1.6, pin: true, scrub: 0.6, anticipatePin: 1, onUpdate: (s) => apply(s.progress) });
      apply(0);
    } else apply(1);
    /* 누르면 영상 화면이 열리며 소리와 함께 재생(누를 때만 재생, 저절로 소리 나지 않음) */
    play.addEventListener('click', () => H.openVideo('youtube:yZenKcavBog', '보름달 연회 프롤로그 · 약 2분', play)); // 유튜브(일부 공개) 최신본
  }
})();
