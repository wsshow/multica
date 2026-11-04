import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';
import { randomBytes } from 'node:crypto';

const origin = 'http://127.0.0.1:18080';
const stateFile = process.argv[3];
const request = (path, init = {}) => fetch(new URL(path, origin), { ...init, signal: AbortSignal.timeout(15000) });
const ok = async response => {
  assert.ok(response.ok, `HTTP ${response.status}`);
  return response;
};
if (process.argv[2] === 'restore') {
  const { token, attachment, size } = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal((await request('/api/me', { headers: { Authorization: `Bearer ${token}` } })).status, 200);
  const response = await ok(await request(attachment, { headers: { Authorization: `Bearer ${token}` } }));
  assert.equal((await response.arrayBuffer()).byteLength, size);
  console.log('Account and attachment survived container recreation.');
} else {
  const page = await ok(await request('/login'));
  const html = await page.text();
  const script = html.match(/src="(\/_next\/static\/[^" ]+\.js[^" ]*)"/);
  assert.ok(script, 'login page must reference compiled assets');
  await ok(await request(script[1]));
  assert.notEqual((await request('/auth/callback', { redirect: 'manual' })).status, 404);
  await ok(await request('/api/config'));
  assert.equal((await request('/metrics')).status, 404);
  assert.equal((await request('/health/realtime')).status, 404);
  const email = 'smoke@example.test';
  await ok(await request('/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }));
  let code;
  for (let attempt = 0; attempt < 30 && !code; attempt++) {
    const list = await (await fetch('http://127.0.0.1:18025/api/v1/messages')).json();
    if (list.messages?.[0]?.ID) {
      const message = await (await fetch(`http://127.0.0.1:18025/api/v1/message/${list.messages[0].ID}`)).json();
      code = message.Text?.match(/\b\d{6}\b/)?.[0];
    }
    if (!code) await delay(500);
  }
  assert.ok(code, 'verification email must arrive through SMTP');
  const login = await ok(await request('/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }));
  const cookies = login.headers.getSetCookie().map(cookie => cookie.split(';')[0]);
  const csrf = cookies.find(cookie => cookie.startsWith('multica_csrf_session='))?.split('=').slice(1).join('=');
  assert.ok(csrf, 'login must issue CSRF cookies');
  const { token } = await login.json();
  const headers = { Cookie: cookies.join('; '), 'X-CSRF-Token': csrf, Origin: origin };
  assert.equal((await request('/api/workspaces', { method: 'POST', headers: { Cookie: headers.Cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  const workspace = await (await ok(await request('/api/workspaces', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Smoke', slug: 'smoke' }) }))).json();
  const form = new FormData();
  const size = 2 * 1024 * 1024;
  form.append('file', new Blob([Buffer.alloc(size, 65)], { type: 'text/plain' }), 'smoke.txt');
  const uploaded = await (await ok(await request('/api/upload-file', { method: 'POST', headers: { ...headers, 'X-Workspace-ID': workspace.id }, body: form }))).json();
  const attachment = uploaded.download_url || uploaded.url;
  assert.equal(new URL(attachment, origin).origin, origin, 'private storage downloads must use the application origin');
  const download = await ok(await request(attachment, { headers: { Authorization: `Bearer ${token}` } }));
  assert.equal((await download.arrayBuffer()).byteLength, size);
  const range = await request(attachment, { headers: { Authorization: `Bearer ${token}`, Range: 'bytes=0-15' } });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 16);
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${origin.replace('http:', 'ws:')}/ws?workspace_id=${encodeURIComponent(workspace.id)}`);
    const timer = setTimeout(() => { ws.close(); reject(new Error('WebSocket authentication timed out')); }, 10000);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
    ws.onerror = () => { clearTimeout(timer); reject(new Error('WebSocket connection failed')); };
    ws.onmessage = event => {
      if (JSON.parse(event.data).type === 'auth_ack') { clearTimeout(timer); ws.close(); resolve(); }
    };
  });
  await new Promise((resolve, reject) => {
    const req = httpRequest(`${origin}/api/daemon/ws`, { headers: {
      Authorization: `Bearer ${token}`, Origin: origin, Connection: 'Upgrade', Upgrade: 'websocket',
      'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
    } });
    req.setTimeout(10000, () => req.destroy(new Error('Daemon WebSocket upgrade timed out')));
    req.on('error', reject);
    req.on('response', response => { response.resume(); reject(new Error(`Daemon WebSocket returned ${response.statusCode}`)); });
    req.on('upgrade', (response, socket) => {
      req.setTimeout(0);
      socket.destroy();
      if (response.statusCode === 101) resolve();
      else reject(new Error('Daemon WebSocket did not upgrade'));
    });
    req.end();
  });
  await writeFile(stateFile, JSON.stringify({ token, attachment, size }), { mode: 0o600 });
  console.log('Single-origin assets, SMTP login, CSRF writes, S3 upload/download, Range, browser and daemon WebSocket passed.');
}
