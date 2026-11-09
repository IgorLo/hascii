import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const server = http.createServer(async (req,res)=>{
  let url;
  try {url = new URL(req.url, 'http://localhost');}catch{res.writeHead(400);res.end('Invalid URL');return;}
  if(!['127.0.0.1:4173','localhost:4173'].includes(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
  try {
    if (url.pathname.startsWith('/api/palette/')) {
      const slug = url.pathname.slice(13);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length>120) {res.writeHead(400);res.end('Invalid palette');return;}
      const upstream = await fetch(`https://lospec.com/palette-list/${slug}.json`, {signal:AbortSignal.timeout(15000)});
      if(!upstream.ok) {res.writeHead(upstream.status);res.end('Lospec palette unavailable');return;}
      const data = await upstream.json();
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));return;
    }
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, '.'+name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
  } catch(error) {res.writeHead(url.pathname.startsWith('/api/')?502:404);res.end('Resource unavailable');}
});
server.listen(4173,'127.0.0.1',()=>console.log('ASCII Lab: http://127.0.0.1:4173'));
