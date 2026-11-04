import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

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
