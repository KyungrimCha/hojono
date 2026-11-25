/** @OnlyCurrentDoc */
/* HOJONO 사이트 → 구글 시트 저장 (구글 앱스 스크립트)
   사이트의 "내 흔적 저장하기"와 "소식받기"가 이 스크립트로 보내면, 이 시트의 두 탭에 한 줄씩 쌓인다.
   설정 방법은 같은 폴더의 README.md 참고.

   지키는 것
   - 정해진 값만 저장: 인물·장소는 목록에 있는 것만, 한마디는 500자까지, 이메일은 형식과 동의를 확인
   - 시트 수식으로 실행되지 않게: =, +, -, @로 시작하는 글은 앞에 ' 를 붙여 글자로만 저장
   - 로봇 막기: 사람 눈에 안 보이는 칸(website)이 채워져 오면 저장하지 않음, 1분에 30건이 넘으면 잠시 받지 않음
   - 같은 이메일은 한 번만 저장
   - 맨 위 @OnlyCurrentDoc: 이 스크립트가 붙은 시트 하나만 다룰 수 있게 권한을 좁힘(다른 시트에는 접근 못 함) */

const TABS = {
  note: { name: '흔적 남기기', head: ['남긴 시각', '인물', '장소', '한마디'] },
  news: { name: '소식받기', head: ['신청 시각', '이메일', '동의'] },
};
const PEOPLE = ['설랑', '해람', '서린'];
const PLACES = ['사라봉', '용두암', '산지천', '방선문', '동문시장'];
const LIMIT_PER_MIN = 30;

/* 처음 한 번 실행: 두 탭과 제목 줄을 만든다 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach((k) => {
    const t = TABS[k];
    const sh = ss.getSheetByName(t.name) || ss.insertSheet(t.name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(t.head);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, t.head.length).setFontWeight('bold');
    }
  });
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return reply_('ok'); // 숨은 칸이 채워졌으면 로봇: 저장하지 않고 성공처럼 답함

  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('n') || 0);
  if (n >= LIMIT_PER_MIN) return reply_('busy');
  cache.put('n', String(n + 1), 60);

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    if (p.type === 'note') {
      const who = PEOPLE.indexOf(p.who) >= 0 ? p.who : '';
      const places = String(p.places || '').split(',').map((s) => s.trim()).filter((s) => PLACES.indexOf(s) >= 0).join(', ');
      const say = text_(p.say, 500);
      if (!who || !places || !say) return reply_('invalid');
      tab_('note').appendRow([now, who, places, say]);
      return reply_('ok');
    }
    if (p.type === 'news') {
      const email = String(p.email || '').trim().toLowerCase().slice(0, 254);
      if (!/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]+$/.test(email) || p.consent !== 'yes') return reply_('invalid');
      const sh = tab_('news');
      const last = sh.getLastRow();
      const exists = last > 1 && sh.getRange(2, 2, last - 1, 1).getValues().some((r) => String(r[0]).toLowerCase() === email);
      if (!exists) sh.appendRow([now, email, '동의함(만 14세 이상)']);
      return reply_('ok');
    }
    return reply_('invalid');
  } finally {
    lock.releaseLock();
  }
}

/* 주소를 브라우저로 열어 보면 연결 확인용으로 ready가 보임 */
function doGet() {
  return reply_('ready');
}

function tab_(key) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TABS[key].name);
  if (!sh) { setup(); sh = ss.getSheetByName(TABS[key].name); }
  return sh;
}

function text_(v, max) {
  let s = String(v || '').replace(/\r\n?/g, '\n').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply_(status) {
  return ContentService.createTextOutput(JSON.stringify({ status: status })).setMimeType(ContentService.MimeType.JSON);
}
