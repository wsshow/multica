import { pathToFileURL } from 'node:url';

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const internalTagPattern = /^(?:sha-[0-9a-f]{40}|build-[0-9a-f]{40}-[0-9]+-[0-9]+-(?:amd64|arm64))$/;

export async function cleanupTags({ image, version, username, token, fetchImpl = fetch, log = console.log }) {
  if (!/^[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9._-]*$/.test(image ?? '') ||
      !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version ?? '') || !username || !token) {
    throw new Error('Configure Docker Hub credentials, repository, and the current stable version.');
  }
  const base = `https://hub.docker.com/v2/namespaces/${image.split('/')[0]}/repositories/${image.split('/')[1]}/tags`;
  const deleteBase = `https://hub.docker.com/v2/repositories/${image}/tags/`;
  const authResponse = await fetchImpl('https://hub.docker.com/v2/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, secret: token }),
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!authResponse.ok) throw new Error(`Docker Hub authentication failed (HTTP ${authResponse.status}).`);
  const { access_token: bearer } = await authResponse.json();
  if (!bearer) throw new Error('Docker Hub did not return an access token.');

  async function request(url, method = 'GET') {
    const allowed = method === 'DELETE' ? url.startsWith(deleteBase) :
      url === base || url.startsWith(`${base}/`) || url.startsWith(`${base}?`);
    if (!allowed) {
      throw new Error('Unexpected Docker Hub pagination URL.');
    }
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${bearer}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const hint = method === 'DELETE' && response.status === 403 ? ' The token needs tag deletion permission.' : '';
      throw new Error(`Docker Hub ${method} failed (HTTP ${response.status}).${hint}`);
    }
    return method === 'DELETE' ? null : response.json();
  }
  async function protectedDigest() {
    const release = await request(`${base}/${version}`);
    const latest = await request(`${base}/latest`);
    const platforms = (release.images ?? []).map(i => `${i.os}/${i.architecture}`).sort();
    if (!digestPattern.test(release.digest) || release.digest !== latest.digest ||
        JSON.stringify(platforms) !== JSON.stringify(['linux/amd64', 'linux/arm64']) ||
        !release.images.every(i => digestPattern.test(i.digest))) {
      throw new Error('The stable version and latest must reference the same two-architecture image.');
    }
    return release;
  }

  const release = await protectedDigest();
  const protectedDigests = new Set([release.digest, ...release.images.map(i => i.digest)]);
  const tags = [];
  let next = `${base}?page_size=100`;
  while (next) {
    const page = await request(next);
    tags.push(...page.results);
    next = page.next;
  }
  const candidates = tags.filter(t => internalTagPattern.test(t.name) && protectedDigests.has(t.digest));
  const deleted = [];
  for (const tag of candidates) {
    const current = await request(`${base}/${tag.name}`);
    if (current.digest !== tag.digest || (await protectedDigest()).digest !== release.digest) {
      throw new Error('Repository changed during cleanup; no further tags will be deleted.');
    }
    // The Hub tag endpoint removes only this name, never the shared registry manifest.
    await request(`${deleteBase}${tag.name}/`, 'DELETE');
    deleted.push(tag.name);
    log(`Deleted tag: ${tag.name}`);
  }
  if ((await protectedDigest()).digest !== release.digest) throw new Error('Protected image digest changed.');
  log(`Preserved ${version} and latest at ${release.digest}`);
  return deleted;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanupTags({
    image: process.env.DOCKERHUB_IMAGE,
    version: process.env.RELEASE_VERSION,
    username: process.env.DOCKERHUB_USERNAME,
    token: process.env.DOCKERHUB_TOKEN,
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
