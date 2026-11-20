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
  'https://raw.githubusercontent.com/${repository}/${firstCommit}/scripts/integrated.sh')
    printf '%s\n' 'printf "%s\\n" "$INTEGRATED_IMAGE:$INTEGRATED_PERSONAL_LANG:$1"' > "$2" ;;
  'https://raw.githubusercontent.com/${repository}/${firstCommit}/'*) echo fixture > "$2" ;;
  *) exit 1 ;;
esac
`, { mode: 0o700 });
    const script = fileURLToPath(new URL('./install-personal.sh', import.meta.url));
    const env = { ...process.env, PATH: `${directory}:${process.env.PATH}`, TASK_RELEASE_INFO: release,
      MULTICA_PERSONAL_DIR: join(directory, 'install'), MULTICA_RELEASE_REPOSITORY: repository,
      MULTICA_PERSONAL_VERSION: '', INTEGRATED_PERSONAL_ENV_FILE: '' };
    const run = (...args) => spawnSync('bash', [script, ...args], { cwd: directory, env, encoding: 'utf8' });
    const installed = run();
    assert.equal(installed.status, 0, installed.stderr);
    assert.ok(installed.stdout.includes(`${firstImage}:zh-CN:personal`));

    writeFileSync(release, `${repository} v1.2.4 ${'e'.repeat(40)} example/multica@sha256:${'b'.repeat(64)}\n`);
    const declined = run('install');
    assert.equal(declined.status, 1);
    assert.match(declined.stderr, /升级需要确认/);
    assert.equal(readFileSync(join(env.MULTICA_PERSONAL_DIR, 'current-release'), 'utf8'),
      `${repository} v1.2.3 ${firstCommit} ${firstImage}\n`);
    const resumed = run('up');
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.ok(resumed.stdout.includes(`${firstImage}:zh-CN:personal`));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
