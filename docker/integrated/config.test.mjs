import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure, nginxConfig } from './config.mjs';

const base = () => ({ MULTICA_PUBLIC_URL: 'https://tasks.example.test', DATABASE_URL: 'postgres://user:p%24ss@db/app', JWT_SECRET: 'a'.repeat(64), S3_BUCKET: 'private', S3_REGION: 'us-east-1', AWS_ENDPOINT_URL: 'http://objects:9000', SMTP_HOST: 'smtp', SMTP_FROM_EMAIL: 'tasks@example.test' });

test('normalizes one origin and separates internal listeners without mutating credentials', () => {
  const input = { ...base(), SMTP_USERNAME: 'smtp-user', SMTP_PASSWORD: 'a $secret with spaces', MULTICA_PUBLIC_URL: 'https://tasks.example.test/' };
  const { env } = configure(input);
  assert.equal(env.FRONTEND_ORIGIN, 'https://tasks.example.test');
  assert.equal(env.MULTICA_APP_URL, env.FRONTEND_ORIGIN);
  assert.equal(env.REMOTE_API_URL, 'http://127.0.0.1:8081');
  assert.equal(env.MULTICA_LISTEN_HOST, '127.0.0.1');
  assert.equal(env.MULTICA_REQUIRE_OBJECT_STORAGE, 'true');
  assert.equal(env.ATTACHMENT_DOWNLOAD_MODE, 'proxy');
  assert.equal(env.SMTP_PASSWORD, input.SMTP_PASSWORD);
  assert.equal(input.FRONTEND_ORIGIN, undefined);
});

test('requires explicit external dependencies and production login', () => {
  for (const key of ['MULTICA_PUBLIC_URL', 'DATABASE_URL', 'JWT_SECRET', 'S3_BUCKET', 'S3_REGION', 'SMTP_HOST', 'SMTP_FROM_EMAIL']) {
    const input = base();
    delete input[key];
    assert.throws(() => configure(input));
  }
  assert.throws(() => configure({ ...base(), AWS_ACCESS_KEY_ID: 'partial' }), /supplied together/);
  assert.throws(() => configure({ ...base(), MULTICA_VCS_INTEGRATION_ENABLED: 'true' }), /MULTICA_VCS_SECRET_KEY/);
});

test('rejects ambiguous or unsafe endpoint configuration without reflecting credentials', () => {
  for (const url of ['https://user:secret@example.test', 'https://example.test/prefix', 'file:///etc/hosts', 'https://example.test?secret=1']) {
    assert.throws(() => configure({ ...base(), MULTICA_PUBLIC_URL: url }), error => !error.message.includes('secret'));
  }
  assert.throws(() => configure({ ...base(), MULTICA_APP_URL: 'https://other.test' }), /conflicts/);
  assert.throws(() => configure({ ...base(), NEXT_PUBLIC_API_URL: 'https://other.test' }), /same-origin/);
  assert.throws(() => configure({ ...base(), MULTICA_DEV_VERIFICATION_CODE: '123456' }), /not allowed/);
  assert.throws(() => configure({ ...base(), MULTICA_GATEWAY_TRUSTED_PROXIES: '127.0.0.1;return 200;' }), /CIDR/);
});

test('supports optional Redis, explicit trusted networks and private proxy downloads', () => {
  const config = configure({ ...base(), REDIS_URL: 'rediss://:secret@redis:6379/0', MULTICA_GATEWAY_TRUSTED_PROXIES: '10.0.0.0/24,::1/128' });
  assert.equal(config.env.REDIS_URL, 'rediss://:secret@redis:6379/0');
  const gateway = nginxConfig(config, '/tmp/multica');
  assert.match(gateway, /set_real_ip_from 10\.0\.0\.0\/24;/);
  assert.match(gateway, /X-Forwarded-For \$remote_addr/);
  assert.match(gateway, /X-Forwarded-Proto https/);
  assert.ok(gateway.indexOf('= /auth/callback') < gateway.indexOf('^~ /auth/'));
  assert.match(gateway, /proxy_set_header Upgrade \$http_upgrade/);
  assert.match(gateway, /client_max_body_size 100m/);
  assert.doesNotMatch(gateway, /secret|\$request;/);
});

test('accepts canonical public origins and the existing Redis cluster URL format', () => {
  const { env } = configure({ ...base(), MULTICA_PUBLIC_URL: 'https://TASKS.example.test:443/', REDIS_CLUSTER_MODE: 'true', REDIS_URL: 'redis://node1:6379,node2:6379/0' });
  assert.equal(env.MULTICA_PUBLIC_URL, 'https://tasks.example.test');
  assert.equal(env.REDIS_URL, 'redis://node1:6379,node2:6379/0');
});

test('dedicated plugin host sends all paths through the backend host boundary', () => {
  const input = { ...base(), MULTICA_PLUGIN_SURFACE_ORIGIN: 'https://surfaces.example.test', MULTICA_PLUGIN_SECRET_KEY: Buffer.alloc(32, 1).toString('base64') };
  const gateway = nginxConfig(configure(input), '/tmp/multica');
  assert.match(gateway, /server_name "surfaces.example.test";[\s\S]*location \/ \{ proxy_pass http:\/\/127.0.0.1:8081; \}/);
  assert.throws(() => configure({ ...input, MULTICA_PLUGIN_SURFACE_ORIGIN: input.MULTICA_PUBLIC_URL }), /separate cookie-free hostname/);
});
