/* 09 만드는 것: "이 시제품이 궁금해요"는 알림 문구만 띄움(js/core.js HOJONO.toast).
   10 흔적 남기기: 고른 만큼 왼쪽 3단계가 채워지고, 저장하면 구글 시트로 보낸 뒤 같은 카드 안에서 남긴 글이 쪽지로 보임.
   소식받기: 이메일을 적고 동의에 체크해야 버튼이 켜지고, 누르면 구글 시트로 보냄. 11 처음부터 다시 걷기. */
(() => {
  const H = window.HOJONO, gsap = window.gsap;

  /* 구글 시트 받는 주소(앱스 스크립트 웹 앱 URL). 설정 방법: tools/sheet/README.md
     비어 있으면 시안 모드: 아무것도 보내지 않고 "시안 화면이라 실제로 신청되지는 않아요"로 안내 */
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbycNPulMSuRrEkBhYtaM05ovfqZvcM_KgJJGdFDg5wanGVJOdqlc8caOUajLxgKEm8hjQ/exec';
  const lastSent = {}; // 같은 칸을 연달아 누르는 것만 막음(흔적·소식 따로)
  /* 보내기. 앱스 스크립트는 다른 사이트에서 답을 읽을 수 없게(no-cors) 받으므로, 인터넷 연결이 끊긴 경우만 실패로 봄 */
  const send = (data) => {
    if (!SHEET_URL) return Promise.resolve('demo');
    if (Date.now() - (lastSent[data.type] || 0) < 3000) return Promise.reject(new Error('too fast'));
    lastSent[data.type] = Date.now();
    return fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) }).then(() => 'sent');
  };
  const busy = (f, on) => { const b = f.querySelector('[type=submit]'); if (b) { b.disabled = on; b.setAttribute('aria-busy', String(on)); } };

  const form = document.getElementById('note');
  const say = document.getElementById('say');
  const count = document.getElementById('sayCount');
  const msg = document.getElementById('noteMsg');
  const seed = document.getElementById('seed');
  if (form) {
    /* 왼쪽 3단계: 인물·장소·한마디를 채운 만큼 진하게 */
    const steps = document.querySelectorAll('#noteSteps li');
    const syncSteps = () => {
      const done = {
        who: !!form.querySelector('input[name=who]:checked'),
        place: !!form.querySelector('input[name=place]:checked'),
        say: !!say.value.trim(),
      };
      steps.forEach((li) => li.classList.toggle('is-done', done[li.dataset.step]));
    };
    form.addEventListener('change', syncSteps);
    say.addEventListener('input', () => { count.textContent = say.value.length; syncSteps(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const who = form.querySelector('input[name=who]:checked');
      const places = form.querySelectorAll('input[name=place]:checked');
      if (!who) { msg.textContent = '함께 걸은 인물을 한 명 골라 주세요.'; return; }
      if (!places.length) { msg.textContent = '걸은 장소를 하나 이상 골라 주세요.'; return; }
      if (!say.value.trim()) { msg.textContent = '한마디를 적어 주세요.'; say.focus(); return; }
      msg.textContent = '';
      const placeList = [...places].map((p) => p.value);
      busy(form, true);
      send({ type: 'note', who: who.value, places: placeList.join(','), say: say.value.trim(), website: form.website.value })
        .then(() => {
          /* 남긴 글을 쪽지에 옮김 */
          document.getElementById('keptSay').textContent = say.value.trim();
          document.getElementById('keptMeta').textContent = `${who.value}과 함께 · ${placeList.join(', ')}`;
          swap(form, seed);
        })
        .catch(() => { msg.textContent = '저장하지 못했어요. 인터넷 연결을 확인하고 잠시 뒤 다시 눌러 주세요.'; })
        .finally(() => busy(form, false));
    });
    document.getElementById('seedAgain').addEventListener('click', () => {
      form.reset(); count.textContent = '0'; syncSteps();
      swap(seed, form);
    });
  }

  /* 같은 카드 안에서 내용 바꾸기: 지금 내용이 옅어지고 → 카드 높이가 새 내용에 맞춰 부드럽게 바뀌며 → 새 내용이 떠오름 */
  function swap(from, to) {
    const card = from.parentElement;
    const focusIn = () => (to.matches('form') ? to.querySelector('input') : to).focus({ preventScroll: true });
    if (!gsap || H.RM) { from.hidden = true; to.hidden = false; focusIn(); return; }
    const h0 = card.offsetHeight;
    gsap.to(from, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in', onComplete: () => {
      gsap.set(from, { clearProps: 'all' });
      from.hidden = true; to.hidden = false;
      const h1 = card.offsetHeight;
      gsap.fromTo(card, { height: h0 }, { height: h1, duration: 0.5, ease: 'power3.inOut', clearProps: 'height' });
      gsap.fromTo(to.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.08, delay: 0.15, clearProps: 'all' });
      focusIn();
      /* 카드 위쪽이 화면 밖으로 올라가 있으면 카드가 보이게 살짝 당김 */
      const r = card.getBoundingClientRect();
      if (r.top < 60) window.scrollTo({ top: window.scrollY + r.top - 100, behavior: 'smooth' });
    } });
  }

  /* 소식받기: 이메일 형식과 동의를 확인(저장은 3단계에서 연결) */
  const news = document.getElementById('news');
  if (news) {
    const mail = document.getElementById('newsMail');
    const ok = document.getElementById('newsOk');
    const nmsg = document.getElementById('newsMsg');
    const go = news.querySelector('.news-go');
    /* 이메일을 올바른 형식으로 적고 동의에 체크해야 소식받기 버튼이 켜짐 */
    const syncGo = () => { go.disabled = !(ok.checked && mail.value.trim() && mail.checkValidity()); };
    ok.addEventListener('change', syncGo);
    mail.addEventListener('input', syncGo);
    syncGo();
    news.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!mail.value.trim() || !mail.checkValidity()) { nmsg.textContent = '이메일 주소를 확인해 주세요. 예: name@example.com'; mail.focus(); return; }
      if (!ok.checked) { nmsg.textContent = '소식을 받으려면 이메일 수집·이용에 동의해 주세요.'; ok.focus(); return; }
      nmsg.textContent = '보내는 중이에요…';
      go.disabled = true;
      send({ type: 'news', email: mail.value.trim(), consent: 'yes', website: news.website.value })
        .then((r) => {
          nmsg.textContent = r === 'demo' ? '신청을 받았어요. 지금은 시안 화면이라 실제로 신청되지는 않아요.' : '신청을 받았어요. 새 이야기가 열리면 이메일로 알려 드릴게요.';
          if (r !== 'demo') { mail.value = ''; ok.checked = false; }
        })
        .catch(() => { nmsg.textContent = '신청하지 못했어요. 인터넷 연결을 확인하고 잠시 뒤 다시 눌러 주세요.'; })
        .finally(syncGo);
    });
    [mail, ok].forEach((el) => el.addEventListener('input', () => { nmsg.textContent = ''; }));
  }

  const restart = document.getElementById('restart');
  if (restart) restart.addEventListener('click', () => H.scrollToEl(0));
})();

/* 모든 효과가 만들어진 뒤: 화면 위치 순으로 정렬하고 다시 계산(고정 구간 높이 반영) */
if (window.ScrollTrigger) {
  window.ScrollTrigger.sort(); window.ScrollTrigger.refresh();
  /* 길 고르기 결과처럼 내용 높이가 바뀌면 위치를 다시 계산 */
  let lastH = document.getElementById('main').offsetHeight, t = 0;
  new ResizeObserver(() => {
    const h = document.getElementById('main').offsetHeight;
    if (Math.abs(h - lastH) < 2) return;
    lastH = h; clearTimeout(t); t = setTimeout(() => window.ScrollTrigger.refresh(), 150);
  }).observe(document.getElementById('main'));
}
