import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupTags } from './dockerhub-cleanup.mjs';

const digest = n => `sha256:${String(n).repeat(64)}`;
const sha = 'a'.repeat(40);
const internalNames = [`sha-${sha}`, `build-${sha}-123-1-amd64`, `build-${sha}-123-1-arm64`];
const base = 'https://hub.docker.com/v2/namespaces/example/repositories/app/tags';
const deleteBase = 'https://hub.docker.com/v2/repositories/example/app/tags/';

function fixture({ latestDigest = digest(1), changedCandidate = false, denied = false, next = null } = {}) {
  const release = { name: '0.1.3', digest: digest(1), images: [
    { os: 'linux', architecture: 'amd64', digest: digest(2) },
    { os: 'linux', architecture: 'arm64', digest: digest(3) },
  ] };
  const entries = [release, { ...release, name: 'latest', digest: latestDigest },
    ...internalNames.map((name, i) => ({ name, digest: digest(i + 1) })),
    { name: `build-${sha}-456-1-amd64`, digest: digest(4) },
    { name: 'custom', digest: digest(1) }];
  const tags = new Map(entries.map(t => [t.name, t]));
  const requests = [];
  const deleted = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url === 'https://hub.docker.com/v2/auth/token') return Response.json({ access_token: 'private-bearer' });
    assert.equal(options.headers.Authorization, 'Bearer private-bearer');
    if (url === `${base}?page_size=100`) return Response.json({ results: entries.slice(0, 3), next: next ?? `${base}?page=2` });
    if (url === `${base}?page=2`) return Response.json({ results: entries.slice(3), next: null });
    const name = options.method === 'DELETE' ? url.slice(deleteBase.length, -1) : url.slice(base.length + 1);
    assert.ok(tags.has(name), `Unknown tag: ${name}`);
    if (options.method === 'DELETE') {
      if (denied) return new Response(null, { status: 403 });
      deleted.push(name);
      tags.delete(name);
      return new Response(null, { status: 204 });
    }
    if (changedCandidate && name === internalNames[0]) return Response.json({ name, digest: digest(9) });
    return Response.json(tags.get(name));
  };
  const run = () => cleanupTags({ image: 'example/app', version: '0.1.3', username: 'example', token: 'private-token', fetchImpl, log: () => {} });
  return { run, tags, deleted, requests };
}

test('deletes only internal names whose manifests are retained by the stable release', async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), internalNames);
  assert.deepEqual(f.deleted, internalNames);
  for (const name of ['0.1.3', 'latest', 'custom', `build-${sha}-456-1-amd64`]) assert.ok(f.tags.has(name));
  assert.ok(f.requests.filter(r => r.options.method === 'DELETE').every(r => r.url.startsWith(deleteBase)));
});

test('refuses cleanup when latest has moved to another release', async () => {
  const f = fixture({ latestDigest: digest(9) });
  await assert.rejects(f.run, /same two-architecture image/);
  assert.deepEqual(f.deleted, []);
});

test('refuses to delete a candidate that changed after listing', async () => {
  const f = fixture({ changedCandidate: true });
  await assert.rejects(f.run, /Repository changed/);
  assert.deepEqual(f.deleted, []);
});

test('reports missing deletion permission without exposing credentials', async () => {
  const f = fixture({ denied: true });
  await assert.rejects(f.run, error => {
    assert.match(error.message, /403.*deletion permission/);
    assert.doesNotMatch(error.message, /private-bearer|private-token/);
    return true;
  });
  assert.deepEqual(f.deleted, []);
});

test('does not forward credentials to an unexpected pagination URL', async () => {
  const f = fixture({ next: 'https://other.example/tags' });
  await assert.rejects(f.run, /Unexpected Docker Hub pagination URL/);
  assert.ok(f.requests.every(r => r.url.startsWith('https://hub.docker.com/')));
  assert.deepEqual(f.deleted, []);
});

test('rejects a tag name in place of the stable version before authentication', async () => {
  await assert.rejects(() => cleanupTags({ image: 'example/app', version: 'latest', username: 'example', token: 'private-token',
    fetchImpl: () => assert.fail('Must validate before making requests') }), /current stable version/);
});
