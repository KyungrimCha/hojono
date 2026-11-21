/* 04 세 인물: 포인터 자리에서 영물이 번지고, 누르면 카드 자리에서 상세가 펼쳐짐 */
(() => {
  const H = window.HOJONO;
  const PEOPLE = {
    seollang: { tag: 'HO / 설랑 · 호랑이', name: '설랑', color: '#ec612e', p: 'img/seollang-p.webp', a: 'img/seollang-a.webp',
      text: '설랑은 사라봉에 머무는 오래된 호랑이 영물이다. 사람의 다음 선택이 궁금해 조용히 지켜보다가, 예상 밖의 행동을 보면 어느새 사건 가까이 다가가 있다. 짧은 말로 상대를 슬쩍 건드리고 한번 관심을 가진 일의 결말은 끝까지 확인한다. 제주와 육지를 오가며 디자인하고 그림을 그리며, 틈이 나면 술을 담그거나 오메기떡을 빚는다.',
      clue: '작은 단서: 디자인·그림·술·오메기떡 / 사라봉·산지천' },
    haeram: { tag: 'JO / 해람 · 까마귀', name: '해람', color: '#1f406c', p: 'img/haeram-p.webp', a: 'img/haeram-a.webp',
      text: '해람은 용두암과 제주 곳곳을 오가는 까마귀 영물이다. 바람을 따라 움직이며 사람들의 말과 장소에 남은 작은 변화를 모은다. 수다와 농담 사이에서도 어긋나는 단서를 놓치지 않고, 멀리 떨어진 이야기들을 빠르게 이어 붙인다. 알고 있는 것을 모두 털어놓기보다, 이야기가 움직일 순간에 꼭 필요한 한마디를 건넨다.',
      clue: '작은 단서: 바닷바람·소식·농담 / 용두암·동문시장' },
    seorin: { tag: 'NO / 서린 · 노루', name: '서린', color: '#41604b', p: 'img/seorin-p.webp', a: 'img/seorin-a.webp',
      text: '서린은 오랜 시간을 살아온 노루 영물이다. 조용하고 서늘해 보이지만 가까운 이들이 함께 편안하기를 바라며 세심하게 돌본다. 식물의 다시 자라는 힘을 좋아해 씨앗과 기록을 살피고, 혼자만의 노트와 작업 공간에는 분명한 선을 긋는다. 갑작스러운 일 앞에서는 몸이 얼어붙을 만큼 겁이 많지만, 한번 마음을 준 존재는 오래도록 품는다.',
      clue: '작은 단서: 검정 연필·씨앗함·드럼 / 식물 작업실' },
  };

  const sheet = document.getElementById('personSheet');
  const img = document.getElementById('personImg');
  const swap = document.getElementById('personSwap');
  let current = null, showingSpirit = false;

  const fill = (key) => {
    const d = PEOPLE[key]; current = key; showingSpirit = false;
    document.getElementById('personTag').textContent = d.tag;
    document.getElementById('personName').textContent = d.name;
    document.getElementById('personText').textContent = d.text;
    H.sentences(document.getElementById('personText'));
    document.getElementById('personClue').textContent = d.clue;
    img.src = d.p; img.alt = `${d.name}의 초상`;
    swap.textContent = '영물 보기';
    sheet.style.setProperty('--who', d.color);
  };

  swap.addEventListener('click', () => {
    const d = PEOPLE[current]; showingSpirit = !showingSpirit;
    const next = showingSpirit ? d.a : d.p;
    if (window.gsap && !H.RM) {
      window.gsap.fromTo(img, { clipPath: 'circle(0% at 50% 45%)' }, { clipPath: 'circle(150% at 50% 45%)', duration: 0.8, ease: 'expo.out', onStart: () => { img.src = next; } });
    } else img.src = next;
    img.alt = showingSpirit ? `${d.name}과 영물` : `${d.name}의 초상`;
    swap.textContent = showingSpirit ? '사람 보기' : '영물 보기';
  });

  /* "이 인물의 길 보기": 상세가 다 닫혀 화면 잠금이 풀린 뒤에 지도로 이동 */
  document.getElementById('personRoute').addEventListener('click', () => {
    const who = current;
    H.closeSheet(sheet, () => { if (H.selectWho) H.selectWho(who); });
  });

  document.querySelectorAll('.card').forEach((card) => {
    const pic = card.querySelector('.card-pic');
    card.addEventListener('pointerenter', (e) => {
      const r = pic.getBoundingClientRect();
      pic.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      pic.style.setProperty('--y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    card.addEventListener('click', () => { fill(card.dataset.who); H.openSheet(sheet, pic); });
  });

  /* 03 패널을 누르면 해당 인물 상세로 */
  document.querySelectorAll('.panel').forEach((p) => p.addEventListener('click', (e) => {
    e.preventDefault();
    const card = document.querySelector(`.card[data-who="${p.dataset.who}"]`);
    H.scrollToEl(document.getElementById('people'), 0, () => card && card.click());
  }));
})();
