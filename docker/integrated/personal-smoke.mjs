import assert from 'node:assert/strict';
import { setDefaultResultOrder } from 'node:dns';
import { readFile, writeFile } from 'node:fs/promises';

setDefaultResultOrder('ipv4first');
const origin = `http://localhost:${process.env.INTEGRATED_HOST_PORT}`;
const stateFile = process.argv[3];
const username = 'personal-smoke';
const password = 'personal fixture password';
const contents = 'This attachment is stored on the local volume.';

const request = (path, init = {}) => fetch(new URL(path, origin), { ...init, signal: AbortSignal.timeout(15000) });
const ok = async response => {
  assert.ok(response.ok, `HTTP ${response.status} at ${new URL(response.url).pathname}`);
  return response;
};
const json = (path, body, headers = {}) => request(path, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify(body),
});
const readConfig = async () => (await ok(await request('/api/config'))).json();
const login = async () => (await ok(await json('/auth/local/login', { username, password }))).json();
const bearer = token => ({ Authorization: `Bearer ${token}` });

if (process.argv[2] === 'exercise') {
  const home = await request('/', { redirect: 'manual' });
  assert.equal(home.status, 302);
  assert.equal(home.headers.get('location'), '/login');
  await ok(await request('/login'));
  const config = await readConfig();
  assert.equal(config.local_auth_enabled, true);
  assert.equal(config.local_auth_setup_required, true);
  assert.equal((await json('/auth/send-code', { email: 'personal@example.test' })).status, 404);
  const setupCode = (await readFile('/dev/stdin', 'utf8')).trim();
  assert.ok(setupCode, 'one-time setup code must exist before creating the owner');
  const owner = { username, password, setup_code: setupCode };
  await ok(await json('/auth/local/setup', owner));
  assert.equal((await json('/auth/local/setup', owner)).status, 409);

  const { token } = await login();
  const headers = bearer(token);
  const workspaces = await (await ok(await request('/api/workspaces', { headers }))).json();
  assert.deepEqual(workspaces.map(workspace => workspace.slug), ['personal']);
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), 'local.txt');
  const upload = await request('/api/upload-file', {
    method: 'POST',
    headers: { ...headers, 'X-Workspace-ID': workspaces[0].id, 'X-Client-Capabilities': 'stable_attachment_urls' },
    body: form,
  });
  const { download_url: attachment } = await (await ok(upload)).json();
  assert.ok(attachment, 'upload must provide a download route');
  assert.equal(new URL(attachment, origin).origin, origin);
  assert.equal(await (await ok(await request(attachment, { headers }))).text(), contents);
  await writeFile(stateFile, JSON.stringify({ token, attachment }), { mode: 0o600 });
} else {
  const { token, attachment } = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.ok(!(await readConfig()).local_auth_setup_required, 'owner must remain configured after recreation');
  // The pre-restart token also verifies that the signing key survived.
  await ok(await request('/api/me', { headers: bearer(token) }));
  const renewed = await login();
  assert.equal(await (await ok(await request(attachment, { headers: bearer(renewed.token) }))).text(), contents);
  console.log('Personal login, signing key, and local attachment survived container recreation.');
}
