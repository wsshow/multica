import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { configure, nginxConfig } from './config.mjs';
import { initializePersonalEnvironment } from './personal.mjs';
import { Supervisor } from './supervisor.mjs';

let supervisor;
let interrupted = false;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    interrupted = true;
    process.exitCode = signal === 'SIGTERM' ? 143 : 130;
    void supervisor?.stop();
  });
}
async function run() {
  const config = configure(await initializePersonalEnvironment(process.env));
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== 'local-auth' || args[1] !== 'reset-password') {
      throw new Error('Unknown integrated launcher command');
    }
    const result = spawnSync('/app/server', args, { env: config.env, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    return;
  }
  const directory = '/tmp/multica';
  for (const child of ['', '/body', '/proxy', '/fastcgi', '/uwsgi', '/scgi']) await mkdir(`${directory}${child}`, { recursive: true });
  await writeFile(`${directory}/nginx.conf`, nginxConfig(config, directory), { mode: 0o600 });
  const shutdownSeconds = Number(config.env.MULTICA_CONTAINER_SHUTDOWN_TIMEOUT || '60');
  if (!Number.isFinite(shutdownSeconds) || shutdownSeconds < 5 || shutdownSeconds > 600) throw new Error('MULTICA_CONTAINER_SHUTDOWN_TIMEOUT must be between 5 and 600 seconds');
  supervisor = new Supervisor({ cwd: '/app', env: { ...config.env, MULTICA_INTERNAL_DATABASE_STARTUP_STARTED_AT_UNIX: String(Math.floor(Date.now() / 1000)) }, shutdownMs: shutdownSeconds * 1000 });
  if (interrupted) throw new Error('Startup cancelled');
  console.log('integrated: applying database migrations');
  const migration = supervisor.start('migrate', '/app/migrate', ['up'], {}, true);
  const result = await migration.done;
  if (result.code !== 0 || interrupted) throw new Error('Database migration did not complete');
  supervisor.start('backend', '/app/server', [], { PORT: '8081' });
  await supervisor.waitReady('http://127.0.0.1:8081/readyz');
  supervisor.start('web', process.execPath, ['/app/apps/web/server.js'], { PORT: '3000', HOSTNAME: '127.0.0.1' });
  await supervisor.waitReady('http://127.0.0.1:3000/readyz');
  supervisor.start('gateway', '/usr/sbin/nginx', ['-e', 'stderr', '-c', `${directory}/nginx.conf`]);
  await supervisor.waitReady('http://127.0.0.1:8080/readyz');
  console.log('integrated: ready on port 8080');
  await supervisor.failed;
  if (!interrupted) throw supervisor.failure;
}
try {
  await run();
} catch (error) {
  if (!interrupted) {
    console.error(`integrated: ${error.message}`);
    process.exitCode = 1;
  }
} finally {
  await supervisor?.stop();
}
