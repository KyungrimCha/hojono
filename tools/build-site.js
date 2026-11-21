// 깃허브 페이지 배포용 폴더(_site/)를 만든다. 원본 파일 구조는 그대로 둔다.
//
// 실행:  node tools/build-site.js
//        (공유 미리보기 이미지를 절대 주소로 쓰려면) SITE_URL=https://아이디.github.io/저장소/ node tools/build-site.js
// 결과:  _site/  ← 이 폴더만 그대로 올라감(.github/workflows/pages.yml이 자동으로 실행)
//
// 하는 일
// - 공개 페이지 3개(메인, 개인정보 처리방침, 제품 상세)에서 실제로 쓰는 파일만 골라 복사
//   (HTML의 src·href·data-src, CSS의 url(), JS 안의 'img/…' 같은 경로를 따라감)
// - 도구(tools), 묶음 파일(dist, preview.html)은 올리지 않음(내부 자료 plan·design·_archive는 저장소에도 없음)
// - 쓰는데 없는 파일이 있으면 멈추고 알려 줌
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '_site');
const PAGES = ['index.html', 'privacy/index.html', 'objects/sanjicheon-rollup-bag/index.html'];
const SITE_URL = (process.env.SITE_URL || '').replace(/\/?$/, '/').replace(/^\/$/, '');

const files = new Set(), missing = [];
const isLocal = (u) => u && !/^(?:[a-z]+:|\/\/|#|data:|mailto:|tel:)/i.test(u);
const clean = (u) => decodeURI(u.split(/[?#]/)[0]);
const want = (rel, from) => {
  if (!isLocal(rel)) return;
  let f = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean(rel)));
  if (f === '.' || f.endsWith('/')) f = path.posix.join(f, 'index.html');
  if (f.startsWith('..')) return;
  if (!fs.existsSync(path.join(root, f))) { missing.push(`${f}  (${from})`); return; }
  if (fs.statSync(path.join(root, f)).isDirectory()) f = path.posix.join(f, 'index.html');
  if (files.has(f)) return;
  files.add(f);
  scan(f);
};
// JS 안의 경로는 그 JS를 부르는 페이지(메인) 기준
const JS_PATH = /['"`]((?:img|video|fonts|css|js)\/[^'"`\s?#$]+)['"`]/g;
function scan(f) {
  const ext = path.extname(f);
  if (!['.html', '.css', '.js'].includes(ext)) return;
  // 주석 속 경로(쓰지 않는 서체 등)는 따라가지 않음
  const s = fs.readFileSync(path.join(root, f), 'utf8').replace(ext === '.html' ? /<!--[\s\S]*?-->/g : ext === '.css' ? /\/\*[\s\S]*?\*\//g : /(?!)/g, '');
  if (ext === '.html') {
    for (const m of s.matchAll(/\s(?:src|href|data-src|data-src-small|poster)="([^"]+)"/g)) want(m[1], f);
    for (const m of s.matchAll(/<meta property="og:image" content="([^"]+)"/g)) want(m[1], f);
    for (const m of s.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((c) => want(c.trim().split(/\s+/)[0], f));
    for (const m of s.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) want(m[1], f);
  } else if (ext === '.css') {
    for (const m of s.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) want(m[1], f);
  } else {
    for (const m of s.matchAll(JS_PATH)) want(m[1], 'index.html');
  }
}
PAGES.forEach((p) => want(p, 'index.html'));

if (missing.length) {
  console.error('쓰는데 없는 파일이 있습니다:\n  ' + [...new Set(missing)].join('\n  '));
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
let total = 0;
for (const f of [...files].sort()) {
  const dst = path.join(out, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (SITE_URL && f.endsWith('.html')) {
    // 공유 미리보기(카카오톡·SNS)는 이미지 주소가 절대 주소여야 함
    const base = SITE_URL + path.posix.dirname(f).replace(/^\.$/, '').replace(/(.)$/, '$1/');
    let s = fs.readFileSync(path.join(root, f), 'utf8');
    s = s.replace(/(<meta property="og:image" content=")([^"]+)(")/, (_, a, u, b) => a + (isLocal(u) ? new URL(u, base).href : u) + b);
    if (!/property="og:url"/.test(s)) s = s.replace(/(<meta property="og:type"[^>]*>)/, `$1\n<meta property="og:url" content="${base}">`);
    fs.writeFileSync(dst, s);
  } else fs.copyFileSync(path.join(root, f), dst);
  total += fs.statSync(dst).size;
}
fs.writeFileSync(path.join(out, '.nojekyll'), ''); // 깃허브가 파일을 따로 가공하지 않게

const unused = ['img', 'video', 'fonts', 'js', 'css'].flatMap((d) => {
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
  return walk(d).filter((f) => !files.has(f));
});
console.log(`_site/ 완성: 파일 ${files.size}개, ${(total / 1048576).toFixed(1)}MB${SITE_URL ? ` (주소 ${SITE_URL})` : ''}`);
if (unused.length) console.log('페이지에서 쓰지 않아 빼놓은 파일:\n  ' + unused.join('\n  '));
