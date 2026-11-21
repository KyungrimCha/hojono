/* 푸터 되감기: 마지막 화면에 다다르면 시간이 되돌아오듯 영상이 저절로 재생된다.
   옛 산지천 달밤 → 안개 → 오늘의 아침 산지천.
   (첫 화면 영상을 미리 거꾸로 뒤집어 둔 video/hero-rewind.mp4를 보통 재생 — 부드럽게 흐름)
   자연스럽게 보이도록:
   - 영상이 준비되기 전에도 옛 달밤 그림을 깔아 두어, "오늘 → 달밤 → 오늘"로 튀지 않게 함
   - 그림이 화면을 꽉 채우면 스크롤이 잠깐 걸린 채로 재생, 더 내리면 지나감
   - 처음과 끝은 천천히, 가운데는 빠르게(테이프를 되감는 것처럼) 속도가 변함
   - 화면 밖으로 완전히 벗어났을 때만 달밤으로 돌려 둠(보는 중에 갑자기 바뀌지 않게)
   움직임 줄이기 설정이면 오늘의 산지천 그림만 보여 준다. */
(() => {
  const H = window.HOJONO, ST = window.ScrollTrigger;
  const fig = document.getElementById('footFilm');
  const v = document.getElementById('footVideo');
  if (!fig || !v || H.RM || !ST) return;

  /* 속도: 처음·끝 MIN배, 가운데 MIN+BOOST배 (원래 8초 → 약 4.5초) */
  const MIN = 0.7, BOOST = 1.9;
  const small = window.matchMedia('(max-width: 760px)').matches || (navigator.connection && navigator.connection.saveData);
  const base = fig.querySelector('img');
  base.src = 'img/hero-end.webp'; // 되감기 전 모습(옛 달밤)
  let ready = false, want = false, raf = 0;

  ST.create({ trigger: fig, start: 'top 250%', once: true, onEnter: () => {
    v.addEventListener('loadeddata', () => {
      ready = true;
      v.pause(); v.currentTime = 0;
      v.classList.add('is-on');
      if (want) play();
    }, { once: true });
    v.src = (small && v.dataset.srcSmall) || v.dataset.src;
    v.preload = 'auto';
    v.load();
  } });

  /* 재생 중 진행 정도에 따라 속도를 부드럽게 바꿈 */
  const steer = () => {
    raf = 0;
    if (v.paused || v.ended || !v.duration) return;
    const p = v.currentTime / v.duration;
    v.playbackRate = MIN + BOOST * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
    raf = requestAnimationFrame(steer);
  };
  const play = () => {
    want = true;
    if (!ready || !v.paused || v.ended) return;
    v.playbackRate = MIN;
    const p = v.play();
    if (p && p.then) p.then(() => { if (!raf) raf = requestAnimationFrame(steer); }).catch(() => {});
  };
  const reset = () => {
    want = false;
    cancelAnimationFrame(raf); raf = 0;
    if (!ready) return;
    v.pause(); v.currentTime = 0;
  };

  /* 그림이 화면을 꽉 채우면 스크롤이 한 번 걸림(그 자리에 고정) → 그 상태에서 재생 → 더 내리면 지나감.
     HOLD: 걸려 있는 동안 스크롤해야 하는 거리(화면 높이 대비) */
  const HOLD = '+=90%';
  ST.create({ trigger: fig, start: 'top top', end: HOLD, pin: true, anticipatePin: 1, onEnter: play });
  /* 그림이 화면 아래로 완전히 사라지면 다음에 다시 볼 수 있게 달밤으로 되돌려 둠 */
  ST.create({ trigger: fig, start: 'top bottom', onLeaveBack: reset });
})();
