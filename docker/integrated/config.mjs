import { isIP } from 'node:net';

export const personalDataDir = '/app/data';
const managedPostgresURL = 'postgresql://multica@localhost/multica?host=%2Fvar%2Frun%2Fpostgresql&sslmode=disable';

function required(env, key) {
  if (!env[key]?.trim()) throw new Error(`${key} is required`);
  return env[key];
}

function httpUrl(value, key, originOnly = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${key} must be an HTTP(S) URL`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      (originOnly && url.pathname !== '/')) throw new Error(`${key} must be an HTTP(S) ${originOnly ? 'origin without a path' : 'URL without credentials, query, or fragment'}`);
  return url;
}

function encryptionKey(env, key, enabled) {
  if (!enabled && !env[key]) return;
  const value = required(env, key);
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value) || Buffer.from(value, 'base64').length !== 32) {
    throw new Error(`${key} must be a base64-encoded 32-byte key`);
  }
}

export function configure(source) {
  const env = { ...source };
  const personal = env.MULTICA_DEPLOYMENT_MODE === 'personal';
  if (personal && !env.MULTICA_PUBLIC_URL) {
    const host = env.MULTICA_PERSONAL_BIND_ADDRESS || '127.0.0.1';
    if (host !== '127.0.0.1' && host !== '::1') {
      throw new Error('Set MULTICA_PUBLIC_URL when binding the personal deployment to a non-loopback address');
    }
    const port = env.MULTICA_PERSONAL_HOST_PORT || '8080';
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
      throw new Error('INTEGRATED_HOST_PORT must be a TCP port from 1 to 65535');
    }
    env.MULTICA_PUBLIC_URL = `http://${host === '::1' ? '[::1]' : 'localhost'}:${Number(port)}`;
  }
  const publicUrl = httpUrl(required(env, 'MULTICA_PUBLIC_URL').trim(), 'MULTICA_PUBLIC_URL', true);
  const origin = publicUrl.origin;
  if (personal && env.MULTICA_MANAGED_POSTGRES === 'true') env.DATABASE_URL ||= managedPostgresURL;
  let database;
  try { database = new URL(required(env, 'DATABASE_URL')); } catch { throw new Error('DATABASE_URL must be a PostgreSQL connection URL'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || database.pathname.length < 2) {
    throw new Error('DATABASE_URL must select a PostgreSQL host and database');
  }
  const jwt = required(env, 'JWT_SECRET');
  if (jwt.length < 32 || ['multica-dev-secret-change-in-production', 'change-me-in-production'].includes(jwt.trim())) {
    throw new Error('JWT_SECRET must be a persistent random secret of at least 32 characters');
  }
  const requireObjectStorage = !personal || env.MULTICA_REQUIRE_OBJECT_STORAGE === 'true';
  if (requireObjectStorage || env.S3_BUCKET) {
    required(env, 'S3_BUCKET');
    required(env, 'S3_REGION');
  }
  if (env.AWS_ENDPOINT_URL) httpUrl(env.AWS_ENDPOINT_URL, 'AWS_ENDPOINT_URL');
  if (Boolean(env.AWS_ACCESS_KEY_ID) !== Boolean(env.AWS_SECRET_ACCESS_KEY)) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be supplied together');
  }
  if (env.REDIS_URL) {
    if (!/^rediss?:\/\/\S+$/.test(env.REDIS_URL)) throw new Error('REDIS_URL must use redis:// or rediss://');
    if (env.REDIS_CLUSTER_MODE !== 'true') {
      try { if (!new URL(env.REDIS_URL).hostname) throw new Error(); }
      catch { throw new Error('REDIS_URL must be a Redis connection URL'); }
    }
  }
  if (!personal) {
    if (env.SMTP_HOST) required(env, 'SMTP_FROM_EMAIL');
    else if (env.RESEND_API_KEY) required(env, 'RESEND_FROM_EMAIL');
    else if (!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)) {
      throw new Error('Configure SMTP_HOST and SMTP_FROM_EMAIL, Resend credentials and sender, or Google OAuth for production login');
    }
    if (Boolean(env.SMTP_USERNAME) !== Boolean(env.SMTP_PASSWORD)) throw new Error('SMTP_USERNAME and SMTP_PASSWORD must be supplied together, or both omitted for an unauthenticated relay');
  }
  if (env.MULTICA_DEV_VERIFICATION_CODE) throw new Error('MULTICA_DEV_VERIFICATION_CODE is not allowed in the integrated production image');
  encryptionKey(env, 'MULTICA_VCS_SECRET_KEY', env.MULTICA_VCS_INTEGRATION_ENABLED === 'true');
  encryptionKey(env, 'MULTICA_PLUGIN_SECRET_KEY', false);
  let surface;
  if (env.MULTICA_PLUGIN_SURFACE_ORIGIN) {
    const url = httpUrl(env.MULTICA_PLUGIN_SURFACE_ORIGIN, 'MULTICA_PLUGIN_SURFACE_ORIGIN', true);
    if (url.hostname === publicUrl.hostname || !/^[a-z0-9.:[\]-]+$/i.test(url.hostname)) {
      throw new Error('MULTICA_PLUGIN_SURFACE_ORIGIN must use a separate cookie-free hostname');
    }
    encryptionKey(env, 'MULTICA_PLUGIN_SECRET_KEY', true);
    surface = { host: url.hostname, scheme: url.protocol.slice(0, -1) };
  }
  const derived = {
    MULTICA_PUBLIC_URL: origin,
    FRONTEND_ORIGIN: origin,
    MULTICA_APP_URL: origin,
    MULTICA_DAEMON_SERVER_URL: origin,
    CORS_ALLOWED_ORIGINS: origin,
    GOOGLE_REDIRECT_URI: `${origin}/auth/callback`,
  };
  for (const [key, value] of Object.entries(derived)) {
    if (key !== 'MULTICA_PUBLIC_URL' && env[key] && httpUrl(env[key], key).toString().replace(/\/$/, '') !== value.replace(/\/$/, '')) throw new Error(`${key} conflicts with MULTICA_PUBLIC_URL`);
  }
  for (const key of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL']) {
    if (env[key]) throw new Error(`${key} must be empty; the integrated web app uses same-origin requests`);
  }
  const trusted = (env.MULTICA_GATEWAY_TRUSTED_PROXIES || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const cidr of trusted) {
    const [ip, prefix, extra] = cidr.split('/');
    const family = isIP(ip);
    if (!family || extra !== undefined || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128)))) {
      throw new Error('MULTICA_GATEWAY_TRUSTED_PROXIES must contain IP addresses or CIDR networks');
    }
  }
  return {
    env: {
      ...env, ...derived, APP_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      REMOTE_API_URL: 'http://127.0.0.1:8081',
      MULTICA_LISTEN_HOST: '127.0.0.1', MULTICA_REQUIRE_OBJECT_STORAGE: String(requireObjectStorage),
      MULTICA_TRUSTED_PROXIES: '127.0.0.1/32,::1/128',
      RATE_LIMIT_TRUSTED_PROXIES: '127.0.0.1/32,::1/128',
      ATTACHMENT_DOWNLOAD_MODE: env.ATTACHMENT_DOWNLOAD_MODE || 'proxy',
      ...(personal && {
        MULTICA_AUTH_MODE: 'local',
        MULTICA_LOCAL_AUTH_SETUP_CODE_FILE: `${personalDataDir}/setup-code`,
        LOCAL_UPLOAD_DIR: env.LOCAL_UPLOAD_DIR || `${personalDataDir}/uploads`,
      }),
    },
    trusted,
    surface,
    personal,
    scheme: publicUrl.protocol.slice(0, -1),
  };
}

export function nginxConfig({ trusted, scheme, surface, personal }, directory) {
  const headers = protocol => `proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Proto ${protocol};
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Forwarded "";
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;`;
  const route = (match, destination) => `location ${match} { proxy_pass http://127.0.0.1:${destination}; }`;
  return `daemon off;
pid ${directory}/nginx.pid;
error_log /dev/stderr warn;
worker_processes auto;
events { worker_connections 1024; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  log_format safe '$remote_addr $request_method $uri $status';
  access_log /dev/stdout safe;
  map $http_upgrade $connection_upgrade { default upgrade; '' close; }
  ${trusted.map(cidr => `set_real_ip_from ${cidr};`).join('\n  ')}
  real_ip_header X-Forwarded-For;
  real_ip_recursive on;
  client_body_temp_path ${directory}/body;
  proxy_temp_path ${directory}/proxy;
  fastcgi_temp_path ${directory}/fastcgi;
  uwsgi_temp_path ${directory}/uwsgi;
  scgi_temp_path ${directory}/scgi;
  server {
    listen 8080;
    client_max_body_size 100m;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    ${headers(scheme)}
    ${route('= /auth/callback', '3000')}
    ${route('^~ /auth/callback/', '3000')}
    ${route('= /auth/hg-sso/callback', '3000')}
    ${route('^~ /auth/hg-sso/callback/', '3000')}
    ${['api', 'v1', 'auth', 'uploads'].flatMap(path => [route(`= /${path}`, '8081'), route(`^~ /${path}/`, '8081')]).join('\n    ')}
    ${route('= /ws', '8081')}
    ${route('^~ /plugin-surfaces/', '8081')}
    ${route('= /health', '8081')}
    ${route('= /health/realtime', '8081')}
    location = /metrics { return 404; }
    ${route('= /readyz', '3000')}
    ${route('= /healthz', '3000/readyz')}
    ${personal ? 'location = / { absolute_redirect off; return 302 /login; }' : ''}
    ${route('/', '3000')}
  }
  ${surface ? `server {
    listen 8080;
    server_name "${surface.host}";
    ${headers(surface.scheme)}
    location / { proxy_pass http://127.0.0.1:8081; }
  }` : ''}
}
`;
}
