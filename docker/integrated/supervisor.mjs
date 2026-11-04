import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export class Supervisor {
  children = new Set();
  stopping = false;
  failure;
  constructor({ cwd, env, shutdownMs = 60000 }) {
    this.cwd = cwd;
    this.env = env;
    this.shutdownMs = shutdownMs;
    this.failed = new Promise(resolve => { this.fail = resolve; });
  }
  start(name, command, args, environment = {}, oneShot = false) {
    const child = spawn(command, args, { cwd: this.cwd, env: { ...this.env, ...environment }, stdio: 'inherit', detached: true });
    const process = { name, child, oneShot };
    this.children.add(process);
    process.done = new Promise(resolve => {
      let finished = false;
      const complete = (code, signal) => {
        if (finished) return;
        finished = true;
        process.exited = true;
        if (oneShot && code === 0) this.children.delete(process);
        if (!this.stopping && (!oneShot || code !== 0)) {
          this.failure ||= new Error(`${name} exited unexpectedly (${signal || code})`);
          this.fail(this.failure);
        }
        resolve({ code, signal });
      };
      child.once('error', () => complete(1));
      child.once('exit', complete);
    });
    return process;
  }
  async waitReady(url, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.failure) throw this.failure;
      if (this.stopping) throw new Error('Startup cancelled');
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
        await response.body?.cancel();
        if (response.ok) return;
      } catch {}
      await Promise.race([delay(200), this.failed]);
    }
    throw new Error('Application readiness timed out');
  }
  signal(process, signal) {
    if (!process.child.pid) return;
    try { globalThis.process.kill(-process.child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  async stop() {
    if (this.shutdown) return this.shutdown;
    this.stopping = true;
    this.fail();
    this.shutdown = this.drain();
    return this.shutdown;
  }
  async drain() {
    const children = [...this.children];
    const gateway = children.find(p => p.name === 'gateway');
    if (gateway) {
      this.signal(gateway, 'SIGQUIT');
      await Promise.race([gateway.done, delay(Math.min(2000, this.shutdownMs / 4))]);
    }
    for (const process of children) this.signal(process, 'SIGTERM');
    let timer;
    try {
      await Promise.race([
        Promise.all(children.map(p => p.done)),
        new Promise(resolve => { timer = setTimeout(resolve, this.shutdownMs); }),
      ]);
    } finally { clearTimeout(timer); }
    for (const process of children) this.signal(process, 'SIGKILL');
    await Promise.all(children.map(p => p.done));
  }
}
