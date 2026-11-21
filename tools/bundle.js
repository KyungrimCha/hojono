// 게시용(Claude 아티팩트) 한 장 묶음을 만든다. 원본 파일 구조는 그대로 둔다.
// - css·js·서체를 index.html 안에 넣고
// - 제품 상세페이지(objects/…)의 <main> 내용을 겹침 화면으로 넣는다(아티팩트는 페이지 이동이 안 되므로)
// 실행: node tools/bundle.js  →  dist/index.html, preview.html(로컬 확인용)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const doc = read('index.html');

// 아티팩트는 문서 머리를 스스로 붙이므로 <head> 안쪽(문자 집합·화면 메타 제외)과 <body> 안쪽만 쓴다
const head = doc.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*|<link rel="preload"[^>]*>\s*|<meta property="og:image"[^>]*>\s*/g, '');
let body = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];

// 제품 상세를 겹침 화면으로
const detail = read('objects/sanjicheon-rollup-bag/index.html');
const inner = detail.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1].replace(/(["(])\.\.\/\.\.\//g, '$1'); // 상세 페이지 기준 경로(../../img/…)를 메인 기준으로
const sheet = `<div class="sheet sheet-object" id="objectSheet" hidden role="dialog" aria-modal="true" aria-labelledby="objTitle">
  <div class="sheet-inner object">
    <button class="sheet-close" type="button" data-close>메인으로 ✕</button>${inner}
  </div>
</div>\n\n`;
body = body.replace('<!-- 영상 -->', sheet + '<!-- 영상 -->');

let html = `<meta name="claude:viewport-fit-sides" content="cover">\n<script>window.HOJONO_BUNDLE = true;</script>\n` + head + body;
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => `<script>\n/* ${f} */\n${read(f)}\n</script>`);
html = html.replace(/\/\* @font-face[\s\S]*?\*\//g, ''); // 주석 처리한 서체는 묶지 않음
html = html.replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (_, f) => `url('data:font/woff2;base64,${fs.readFileSync(path.join(root, 'fonts', f)).toString('base64')}')`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
// 로컬 확인용: 게시 때 붙는 문서 머리를 흉내 낸 파일
fs.writeFileSync(path.join(root, 'preview.html'), '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style><script>window.__errs=[];addEventListener("error",function(e){__errs.push(String(e.message)+" @"+(e.filename||"").split("/").pop()+":"+e.lineno)});</script></head><body>' + html + '</body></html>');
console.log('bundled', Math.round(html.length / 1024) + 'KB');
