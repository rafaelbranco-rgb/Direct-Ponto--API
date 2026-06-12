// Servidor estático mínimo para os front-ends (app/console) — só Node puro.
// Uso: node serve-static.js <pasta> <porta>
// Serve arquivos com Content-Type correto e faz fallback SPA p/ index.html.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const port = parseInt(process.argv[3] || '8080', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, file, code) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(code || 200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      let file = path.resolve(path.join(root, urlPath));
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end('forbidden');
      }
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, file);
      // Fallback SPA: qualquer rota desconhecida -> index.html
      return send(res, path.join(root, 'index.html'));
    } catch (e) {
      res.writeHead(500);
      res.end('error');
    }
  })
  .listen(port, '0.0.0.0', () => console.log('servindo ' + root + ' na porta ' + port));
