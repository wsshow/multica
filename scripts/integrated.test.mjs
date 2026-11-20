import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('initialization preserves operator values and never executes raw configuration', () => {
  const directory = mkdtempSync(join(tmpdir(), 'multica-integrated-'));
  try {
    const config = join(directory, 'app.env');
    const original = 'SMTP_PASSWORD=$(false) $literal with spaces\nJWT_SECRET=operator-owned-secret\nMULTICA_VCS_INTEGRATION_ENABLED=true\nMULTICA_VCS_SECRET_KEY=\n';
    writeFileSync(config, original);
    const env = { ...process.env, INTEGRATED_ENV_FILE: config };
    const first = spawnSync('bash', ['scripts/integrated.sh', 'init'], { env, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const prepared = readFileSync(config, 'utf8');
    assert.ok(prepared.includes('SMTP_PASSWORD=$(false) $literal with spaces'));
    assert.ok(prepared.includes('JWT_SECRET=operator-owned-secret'));
    assert.match(prepared, /MULTICA_VCS_SECRET_KEY=[A-Za-z0-9+/]{43}=/);
    assert.equal(spawnSync('bash', ['scripts/integrated.sh', 'init'], { env }).status, 0);
    assert.equal(readFileSync(config, 'utf8'), prepared);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('integrated Make targets do not parse the development environment', () => {
  const directory = mkdtempSync(join(tmpdir(), 'multica-make-'));
  try {
    const config = join(directory, 'development.env');
    writeFileSync(config, '$(error Development configuration was evaluated)\n');
    const result = spawnSync('make', ['-n', 'integrated', `ENV_FILE=${config}`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /scripts\/integrated.sh deploy/);
    const mixed = spawnSync('make', ['-n', 'integrated', 'selfhost', `ENV_FILE=${config}`], { encoding: 'utf8' });
    assert.notEqual(mixed.status, 0);
    assert.match(mixed.stderr, /separate make invocations/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('failed image pull never falls back to building or starting locally', () => {
  const directory = mkdtempSync(join(tmpdir(), 'multica-pull-'));
  try {
    const config = join(directory, 'app.env');
    const log = join(directory, 'calls');
    writeFileSync(config, 'SMTP_PASSWORD=literal $value\n');
    writeFileSync(join(directory, 'docker'), '#!/bin/sh\nif [ "$2" = version ]; then echo 2.30.0; exit 0; fi\nprintf "%s\\n" "$*" >> "$TASK_DOCKER_LOG"\nexit 1\n', { mode: 0o700 });
    const result = spawnSync('bash', ['scripts/integrated.sh', 'deploy'], {
      encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, INTEGRATED_ENV_FILE: config, INTEGRATED_IMAGE: 'example/multica:1.0.0', TASK_DOCKER_LOG: log },
    });
    assert.notEqual(result.status, 0);
    const calls = readFileSync(log, 'utf8');
    assert.match(calls, /pull app/);
    assert.doesNotMatch(calls, /build| up | run /);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the standalone personal installer pins one release and requires consent before upgrading', () => {
  const directory = mkdtempSync(join(tmpdir(), 'multica personal '));
  try {
    const repository = 'wsshow/multica';
    const firstCommit = 'd'.repeat(40);
    const firstImage = `example/multica@sha256:${'a'.repeat(64)}`;
    const nextCommit = 'e'.repeat(40);
    const nextImage = `example/multica@sha256:${'b'.repeat(64)}`;
    const redisCompose = 'docker-compose.integrated.personal.redis.yml';
    const release = join(directory, 'release-info');
    writeFileSync(release, `${repository} v1.2.3 ${firstCommit} ${firstImage}\n`);
    writeFileSync(join(directory, 'docker'), `#!/bin/sh
case "$*" in
  'compose version --short') echo 2.30.0 ;;
  info) ;;
  *) exit 1 ;;
esac
`, { mode: 0o700 });
    writeFileSync(join(directory, 'curl'), `#!/bin/sh
while [ "$1" != --output ]; do shift; done
case "$3" in
  'https://github.com/${repository}/releases/latest/download/multica-personal-release.txt') cat "$TASK_RELEASE_INFO" > "$2" ;;
  'https://raw.githubusercontent.com/${repository}/${firstCommit}/${redisCompose}') exit 1 ;;
  'https://raw.githubusercontent.com/${repository}/'*/scripts/integrated.sh)
    printf '%s\n' 'printf "%s\\n" "$INTEGRATED_IMAGE:$INTEGRATED_PERSONAL_LANG:$1:$INTEGRATED_HOST_PORT"' > "$2"
    case "$3" in */${nextCommit}/*) printf '%s\n' '# Uses ${redisCompose}' >> "$2" ;; esac ;;
  'https://raw.githubusercontent.com/${repository}/'*) echo fixture > "$2" ;;
  *) exit 1 ;;
esac
`, { mode: 0o700 });
    const script = fileURLToPath(new URL('./install-personal.sh', import.meta.url));
    const env = { ...process.env, PATH: `${directory}:${process.env.PATH}`, TASK_RELEASE_INFO: release,
      MULTICA_PERSONAL_DIR: join(directory, 'install'), MULTICA_RELEASE_REPOSITORY: repository,
      MULTICA_PERSONAL_VERSION: '', INTEGRATED_PERSONAL_ENV_FILE: '', INTEGRATED_HOST_PORT: '' };
    const run = (...args) => spawnSync('bash', [script, ...args], { cwd: directory, env, encoding: 'utf8' });
    const installed = run();
    assert.equal(installed.status, 0, installed.stderr);
    const hostPort = join(env.MULTICA_PERSONAL_DIR, 'host-port');
    assert.ok(installed.stdout.includes(`${firstImage}:zh-CN:personal:8080`));
    assert.equal(readFileSync(hostPort, 'utf8'), '8080\n');
    writeFileSync(hostPort, '9081\n');

    writeFileSync(release, `${repository} v1.2.4 ${nextCommit} ${nextImage}\n`);
    const declined = run('install');
    assert.equal(declined.status, 1);
    assert.match(declined.stderr, /升级需要确认/);
    assert.equal(readFileSync(join(env.MULTICA_PERSONAL_DIR, 'current-release'), 'utf8'),
      `${repository} v1.2.3 ${firstCommit} ${firstImage}\n`);
    const resumed = run('up');
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.ok(resumed.stdout.includes(`${firstImage}:zh-CN:personal:9081`));

    const upgraded = run('install', '--yes');
    assert.equal(upgraded.status, 0, upgraded.stderr);
    assert.ok(upgraded.stdout.includes(`${nextImage}:zh-CN:personal:9081`));
    const overlay = join(env.MULTICA_PERSONAL_DIR, 'releases', repository, nextCommit, redisCompose);
    assert.equal(readFileSync(overlay, 'utf8'), 'fixture\n');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the personal Redis wizard switches between bundled Redis, an external URL, and disabled',
  { skip: !['linux', 'darwin'].includes(process.platform) }, () => {
    const directory = mkdtempSync(join(tmpdir(), 'multica-redis-wizard-'));
    try {
      const config = join(directory, 'personal.env');
      const installer = fileURLToPath(new URL('./install-personal.sh', import.meta.url));
      const terminal = process.platform === 'darwin'
        ? ['-q', '/dev/null', 'bash', installer, 'configure']
        : ['-qec', 'bash "$TASK_PERSONAL_INSTALLER" configure', '/dev/null'];
      const env = { ...process.env, TASK_PERSONAL_INSTALLER: installer, MULTICA_PERSONAL_DIR: directory,
        INTEGRATED_PERSONAL_ENV_FILE: config, INTEGRATED_HOST_PORT: '' };
      const run = input => {
        const result = spawnSync('script', terminal, { cwd: directory, env, input, timeout: 10000, encoding: 'utf8' });
        assert.equal(result.status, 0, result.error?.message ?? result.stderr);
        return result.stdout;
      };

      writeFileSync(config, 'S3_BUCKET=keep-this\n');
      assert.match(run('4\n2\n\n'), /Redis（自动部署）/);
      assert.equal(readFileSync(config, 'utf8'), 'S3_BUCKET=keep-this\nMULTICA_MANAGED_REDIS=true\nREDIS_URL=\n');

      const url = 'rediss://user:pa$$word%40@redis.example.test:6379/1';
      assert.match(run(`4\n3\nhttp://example.test\n${url}\n\n`), /Redis（已有服务）/);
      assert.equal(readFileSync(config, 'utf8'), `S3_BUCKET=keep-this\nMULTICA_MANAGED_REDIS=\nREDIS_URL=${url}\n`);

      assert.match(run('4\n1\n\n'), /Redis（未启用）/);
      assert.equal(readFileSync(config, 'utf8'), 'S3_BUCKET=keep-this\nMULTICA_MANAGED_REDIS=\nREDIS_URL=\n');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
