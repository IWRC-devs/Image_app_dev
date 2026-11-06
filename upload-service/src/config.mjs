import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultLimit = 128 * 1024 * 1024;

export function validateConfig(input) {
  const fields = ['endpoint', 'bucket', 'region', 'prefix', 'accessKeyId', 'secretAccessKey'];
  if (fields.some(key => typeof input[key] !== 'string' || !input[key].trim())) {
    throw new Error('Storage configuration is incomplete. Run configure.ps1 after receiving the storage details.');
  }
  let endpoint;
  try { endpoint = new URL(input.endpoint); } catch { throw new Error('The storage endpoint must be a valid HTTPS URL.'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Use an HTTPS storage endpoint without embedded credentials or query parameters.');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,126}[A-Za-z0-9]$/.test(input.bucket)) throw new Error('The bucket name is invalid.');
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(input.prefix) || input.prefix.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Use a relative object prefix containing letters, numbers, hyphens, underscores and slashes.');
  }
  if (input.privateBucketConfirmed !== true) throw new Error('Confirm with the storage owner that the assigned bucket is private before enabling uploads.');
  const maxUploadBytes = input.maxUploadBytes ?? defaultLimit;
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes < 1 || maxUploadBytes > 512 * 1024 * 1024) {
    throw new Error('The pilot batch limit must be between 1 byte and 512 MiB.');
  }
  return { ...input, endpoint: endpoint.href.replace(/\/$/, ''), maxUploadBytes };
}

export async function loadConfig(file = path.join(serviceRoot, 'config.local.json')) {
  try { return validateConfig(JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) throw new Error('The local storage configuration is not valid JSON.');
    throw error;
  }
}
