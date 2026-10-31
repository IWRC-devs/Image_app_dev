import http from 'node:http';
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { defaultLimit, serviceRoot } from './config.mjs';

const clientHeader = 'iwrc-local-pilot';
const equal = (a, b) => {
  if (typeof a !== 'string') return false;
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };

export function createUploadServer({ store = null, maxUploadBytes = defaultLimit,
  dataRoot = path.join(serviceRoot, '.data'), webRoot = path.resolve(serviceRoot, '../frontend/dist'),
  publicRoot = path.join(serviceRoot, 'public') } = {}) {
  const session = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  let busy = false;
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const port = server.address().port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host)) { json(res, 403, { error: 'Local access only.' }); return; }
    const origin = `http://${req.headers.host}`;
    if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') {
      json(res, 403, { error: 'Cross-origin requests are not allowed.' }); return;
    }
    let url;
    try { url = new URL(req.url, origin); } catch { json(res, 400, { error: 'Invalid request.' }); return; }
    if (url.pathname.startsWith('/api/')) {
      if (req.headers['x-iwrc-client'] !== clientHeader) { json(res, 403, { error: 'Open the local uploader first.' }); return; }
      if (req.method === 'GET' && url.pathname === '/api/session') {
        res.setHeader('Set-Cookie', `iwrc_upload_session=${session}; HttpOnly; SameSite=Strict; Path=/api`);
        json(res, 200, { configured: Boolean(store), maxUploadBytes, csrfToken: csrf, localOnly: true }); return;
      }
      const cookie = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('iwrc_upload_session='))?.split('=')[1];
      if (!equal(cookie, session) || !equal(req.headers['x-csrf-token'], csrf) || req.headers.origin !== origin) {
        json(res, 403, { error: 'Your local upload session expired. Reload and retry.' }); return;
      }
      if (req.method !== 'POST' || url.pathname !== '/api/uploads') { json(res, 404, { error: 'Not found.' }); return; }
      if (!store) { json(res, 503, { error: 'Storage is not configured yet. No files were uploaded.' }); return; }
      if (busy) { json(res, 429, { error: 'Another batch is uploading. Please wait.' }); return; }
      const sha256 = req.headers['x-content-sha256'];
      const batchId = req.headers['x-batch-id'];
      if (!digest(sha256) || !digest(batchId) || req.headers['content-type'] !== 'application/zip') {
        json(res, 400, { error: 'Send a batch ZIP with its SHA-256 checksum and batch identifier.' }); return;
      }
      if (Number(req.headers['content-length']) > maxUploadBytes) { json(res, 413, { error: 'This ZIP exceeds the pilot batch size limit.' }); return; }
      busy = true;
      const temporary = path.join(dataRoot, 'tmp', `${randomBytes(16).toString('hex')}.zip`);
      try {
        await mkdir(path.dirname(temporary), { recursive: true, mode: 0o700 });
        const hash = createHash('sha256');
        const md5 = createHash('md5');
        let bytes = 0;
        let signature = Buffer.alloc(0);
        const check = new Transform({ transform(chunk, encoding, callback) {
          bytes += chunk.length;
          if (bytes > maxUploadBytes) { callback(new Error('Upload limit exceeded.')); return; }
          if (signature.length < 4) signature = Buffer.concat([signature, chunk]).subarray(0, 4);
          hash.update(chunk); md5.update(chunk); callback(null, chunk);
        } });
        await pipeline(req, check, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
        if (bytes < 4 || signature.toString('hex') !== '504b0304' || hash.digest('hex') !== sha256) {
          json(res, 400, { error: 'The ZIP or checksum is invalid. Nothing was sent to storage.' }); return;
        }
        const result = await store.putVerified({ file: temporary, batchId, sha256, bytes, md5: md5.digest('base64') });
        const receipt = { schemaVersion: 1, batchId, sha256, bytes, objectKey: result.key,
          verifiedAt: new Date().toISOString(), alreadyPresent: result.alreadyPresent };
        const receipts = path.join(dataRoot, 'receipts');
        await mkdir(receipts, { recursive: true, mode: 0o700 });
        const pending = path.join(receipts, `${batchId}.${randomBytes(8).toString('hex')}.tmp`);
        try {
          await writeFile(pending, JSON.stringify(receipt, null, 2), { mode: 0o600, flag: 'wx' });
          await rename(pending, path.join(receipts, `${batchId}.json`));
        } finally { await rm(pending, { force: true }); }
        json(res, 200, { verified: true, receipt });
      } catch {
        // SDK errors can include signed URLs or sensitive request details: never return or log them.
        if (!res.destroyed) json(res, 502, { error: 'Upload was not confirmed. Your local batch is unchanged; check the connection and retry.' });
      } finally {
        busy = false;
        await rm(temporary, { force: true }).catch(() => {});
      }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { json(res, 405, { error: 'Method not allowed.' }); return; }
    let root;
    let relative;
    if (url.pathname === '/' || url.pathname === '/upload.js' || url.pathname === '/upload.css') {
      root = publicRoot; relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    } else if (url.pathname === '/Image_app_dev' || url.pathname.startsWith('/Image_app_dev/')) {
      root = webRoot;
      try { relative = decodeURIComponent(url.pathname.slice('/Image_app_dev'.length)).replace(/^\//, '') || 'index.html'; }
      catch { json(res, 400, { error: 'Invalid path.' }); return; }
    } else { json(res, 404, { error: 'Not found.' }); return; }
    const target = path.resolve(root, relative);
    if (!target.startsWith(path.resolve(root) + path.sep) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
      json(res, 403, { error: 'Not found.' }); return;
    }
    try {
      let file = target;
      try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
      catch { file = target + '.html'; }
      if (!(await stat(file)).isFile()) throw new Error('Missing file');
      res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
      if (req.method === 'HEAD') { res.end(); return; }
      await pipeline(createReadStream(file), res);
    } catch {
      if (!res.headersSent) json(res, 404, { error: 'File unavailable. Build the frontend PWA before opening the local app.' });
      else res.destroy();
    }
  });
  server.requestTimeout = 10 * 60 * 1000;
  server.headersTimeout = 30_000;
  return server;
}
