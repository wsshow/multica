import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Supervisor } from './supervisor.mjs';

function supervisor() { return new Supervisor({ cwd: process.cwd(), env: process.env, shutdownMs: 100 }); }
test('successful one-shot migration does not fail the service group', async () => {
  const group = supervisor();
  const migration = group.start('migration', process.execPath, ['-e', 'process.exit(0)'], {}, true);
  assert.equal((await migration.done).code, 0);
  assert.equal(group.failure, undefined);
  await group.stop();
});
test('unexpected clean exit is a failure and stopping terminates siblings', async () => {
  const group = supervisor();
  const sibling = group.start('backend', process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  group.start('web', process.execPath, ['-e', 'process.exit(0)']);
  assert.match((await group.failed).message, /web exited unexpectedly/);
  await group.stop();
  assert.ok((await sibling.done).signal);
});
test('failed migration and missing executables are detected', async () => {
  for (const [command, args] of [[process.execPath, ['-e', 'process.exit(2)']], ['/no-such-integrated-executable', []]]) {
    const group = supervisor();
    group.start('migration', command, args, {}, true);
    assert.match((await group.failed).message, /migration exited unexpectedly/);
    await group.stop();
  }
});
test('readiness stops waiting when a critical child dies', async () => {
  const group = supervisor();
  group.start('backend', process.execPath, ['-e', 'process.exit(1)']);
  await assert.rejects(group.waitReady('http://127.0.0.1:1/readyz', 5000), /backend exited unexpectedly/);
  await group.stop();
});

test('operator shutdown cancels an active migrator without marking an unexpected failure', async () => {
  const group = supervisor();
  const migration = group.start('migration', process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {}, true);
  await group.stop();
  assert.ok((await migration.done).signal);
  assert.equal(group.failure, undefined);
});
