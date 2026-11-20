import { randomBytes } from 'node:crypto';
import { link, readFile, rm, writeFile } from 'node:fs/promises';
import { personalDataDir } from './config.mjs';

async function persistentSecret(filename, encoding) {
  const path = `${personalDataDir}/${filename}`;
  try { return await readFile(path, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${path}.${randomBytes(12).toString('hex')}.tmp`;
  await writeFile(temporary, randomBytes(32).toString(encoding), { flag: 'wx', mode: 0o600 });
  try {
    // Publish only a complete key and retain one already installed on the volume.
    await link(temporary, path);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  } finally {
    await rm(temporary, { force: true });
  }
  return readFile(path, 'utf8');
}

export async function initializePersonalEnvironment(source) {
  if (source.MULTICA_DEPLOYMENT_MODE !== 'personal') return source;
  const env = { ...source };
  env.JWT_SECRET ||= await persistentSecret('jwt-secret', 'hex');
  if (env.MULTICA_VCS_INTEGRATION_ENABLED === 'true') {
    env.MULTICA_VCS_SECRET_KEY ||= await persistentSecret('vcs-secret-key', 'base64');
  }
  return env;
}
