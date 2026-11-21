// 로컬 확인용 정적 서버: node tools/serve.js → http://localhost:5180/
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  /* 폴더 주소(/objects/…/)는 그 안의 index.html. 실제 호스팅(Cloudflare Pages)과 같은 방식 */
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (_) {}
  if (!/\/$|\.[a-z0-9]+$/i.test(url) && fs.existsSync(file) && file.endsWith('index.html') && !url.endsWith('/')) { res.writeHead(301, { Location: url + '/' }); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && type === 'video/mp4') {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = +s, end = e ? +e : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(+process.env.PORT || 5180, () => console.log("http://localhost:" + (process.env.PORT || 5180) + "/"));
