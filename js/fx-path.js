/* 05 길 고르기: 세로 가운데 한 줄로 진행. 첫 질문(답 셋) → 장면과 두 번째 질문(답 둘) → 결과 카드(뒤집힘) → 지도로.
   맨 위 단계 표시(01 첫 질문 · 02 장면 · 03 결과)가 답할 때마다 한 칸씩 채워져 흐름을 보여 준다. */
(() => {
  const H = window.HOJONO, gsap = window.gsap;
  const book = document.getElementById('book');
  if (!book) return;
  const ROUTES = [
    { who: 'seollang', name: '설랑', place: '사라봉', color: '#ec612e', img: 'img/seollang-p.webp',
      pick: '높은 곳에 올라 도시를 내려다본다', tag: '사라봉 / 해 질 무렵',
      scene: '설랑은 난간에 기대 도시를 내려다봅니다. 바람이 멎자 구옥 지붕에서 작은 발소리가 들립니다.',
      q: '어떤 단서를 따라갈까요?',
      acts: [['발소리가 난 골목으로 내려간다', '지붕 아래에는 누군가 지나간 흔적이 남아 있습니다.'], ['바람이 멈춘 방향을 더 살핀다', '설랑이 먼저 느낀 변화가 사라봉 너머로 이어집니다.']],
      result: '설랑과 사라봉의 바람', resultLine: '높은 곳에서 남들이 놓친 변화를 먼저 알아차리는 길. 설랑을 따라 사라봉으로 향합니다.' },
    { who: 'haeram', name: '해람', place: '산지천', color: '#1f406c', img: 'img/haeram-p.webp',
      pick: '물길을 따라 걷다 눈에 띄는 걸 줍는다', tag: '산지천 / 물길 옆',
      scene: '해람이 검은 깃털 하나를 줍습니다. 방금 들은 소문은 물이 흐르는 방향과 어딘가 맞지 않습니다.',
      q: '어디서부터 확인할까요?',
      acts: [['깃털에 남은 흔적을 살핀다', '검은 깃털의 끝에는 물에 젖지 않은 자국이 남아 있습니다.'], ['물길을 따라 소문의 출처를 찾는다', '서로 다른 두 이야기가 같은 물길에서 만납니다.']],
      result: '해람과 산지천의 물길', resultLine: '흩어진 소문 속 맞지 않는 조각을 찾는 길. 해람과 함께 물길을 따라갑니다.' },
    { who: 'seorin', name: '서린', place: '동문시장', color: '#41604b', img: 'img/seorin-p.webp',
      pick: '시장 골목에서 사람과 먹거리를 구경한다', tag: '동문시장 / 오후의 골목',
      scene: '서린이 가판대 옆에서 작은 씨앗 봉투를 봅니다. 봉투에 적힌 글씨가 자기 낙서장의 필체와 닮았습니다.',
      q: '서린과 무엇을 해볼까요?',
      acts: [['봉투의 글씨를 낙서장에 옮겨 적는다', '같은 문장이 서린의 오래된 기록에도 적혀 있습니다.'], ['가판대 주인에게 봉투를 물어본다', '봉투를 두고 간 사람은 방선문 쪽에서 왔다고 합니다.']],
      result: '서린과 동문시장의 골목', resultLine: '평범한 하루 속에서 작은 기록을 발견하는 길. 서린과 함께 골목을 걷습니다.' },
  ];

  /* 화면 그리기: 맨 위 3단계 표시 → 지금 질문과 세로 답 버튼 */
  const STEPS = ['첫 질문', '장면', '결과'];
  const steps = (now) => `<ol class="path-steps" aria-label="진행 단계">${STEPS.map((t, n) => `<li class="${n < now ? 'is-done' : n === now ? 'is-now' : ''}"${n === now ? ' aria-current="step"' : ''}><b>${String(n + 1).padStart(2, '0')}</b>${t}</li>`).join('')}</ol>`;
  const Q1 = '낯선 소문을 들은 당신, 어디로 걸어갈까요?';

  /* 바꿀 때: 지금 내용이 옅어지고 새 내용이 아래에서 떠오름 */
  const swapIn = (html) => {
    const run = () => {
      book.innerHTML = html; H.sentences(book);
      if (gsap && !H.RM) gsap.fromTo(book.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.07 });
    };
    if (gsap && !H.RM && book.children.length) gsap.to(book.children, { y: -12, opacity: 0, duration: 0.28, stagger: 0.02, onComplete: run });
    else run();
  };

  const start = () => swapIn(`
    ${steps(0)}
    <h3>${Q1}</h3>
    <div class="choices">${ROUTES.map((r, i) => `<button class="choice" type="button" data-i="${i}" data-cursor="고르기"><small>${r.tag}</small><b>${r.pick}</b></button>`).join('')}</div>`);

  const scene = (i) => { const r = ROUTES[i]; swapIn(`
    ${steps(1)}
    <p class="path-tag">${r.tag}</p>
    <p class="scene">${r.scene}</p>
    <h3>${r.q}</h3>
    <div class="choices">${r.acts.map((a, k) => `<button class="choice" type="button" data-i="${i}" data-act="${k}" data-cursor="고르기"><small>행동 ${k + 1}</small><b>${a[0]}</b></button>`).join('')}</div>
    <button class="back-link" type="button" data-restart>처음 질문으로</button>`); };

  const result = (i, k) => { const r = ROUTES[i]; swapIn(`
    ${steps(2)}
    <p class="scene">${r.acts[k][1]}</p>
    <div class="result" style="background:${r.color}">
      <img src="${r.img}" alt="${r.name}의 초상">
      <div class="result-copy">
        <p class="num" style="color:inherit;opacity:.8">결과 · 인물 ${r.name} · 장소 ${r.place}</p>
        <h3>${r.result}</h3>
        <p>${r.resultLine}</p>
        <button class="btn btn-paper" type="button" data-map="${r.who}" data-place="${r.place}">이 장소를 지도에서 보기</button>
      </div>
    </div>
    <button class="back-link" type="button" data-restart>다른 길 고르기</button>`);
    if (gsap && !H.RM) setTimeout(() => { const c = book.querySelector('.result'); if (c) gsap.fromTo(c, { rotateY: -90 }, { rotateY: 0, duration: 1, ease: 'expo.out' }); }, 320);
  };

  book.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-restart')) return start();
    if (b.dataset.map) { if (H.focusPlace) H.focusPlace(b.dataset.map, b.dataset.place); return; }
    if (b.dataset.act !== undefined) return result(+b.dataset.i, +b.dataset.act);
    if (b.dataset.i !== undefined) return scene(+b.dataset.i);
  });
  start();
})();
