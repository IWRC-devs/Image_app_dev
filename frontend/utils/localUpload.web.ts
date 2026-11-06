import type { StoredBatch } from '@/types';
import { createBatchArchive } from './exportBatch.web.ts';

export type UploadPhase = 'preparing' | 'uploading';
type Request = typeof fetch;
const headers = { 'X-IWRC-Client': 'iwrc-local-pilot' };
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');

export function localUploadOrigin(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '8787'
      ? url.origin : null;
  } catch { return null; }
}

export async function uploadLocalBatch(batch: StoredBatch, origin: string, onPhase: (phase: UploadPhase) => void,
  request: Request = fetch, lighting: { id: number; name: string }[] = []) {
  if (localUploadOrigin(origin) !== origin) throw new Error('Uploads are available only in the local pilot on this computer.');
  if (!batch.id) throw new Error('Save this batch locally before uploading it.');
  onPhase('preparing');
  const sessionResponse = await request(`${origin}/api/session`, { cache: 'no-store', credentials: 'same-origin', headers });
  if (!sessionResponse.ok) throw new Error('The local upload service is unavailable.');
  const session = await sessionResponse.json();
  if (!session.configured) throw new Error('Storage is not configured yet. Complete the local storage setup first.');
  if (!Number.isSafeInteger(session.maxUploadBytes) || session.maxUploadBytes < 1 || typeof session.csrfToken !== 'string') {
    throw new Error('The upload service returned an invalid session.');
  }
  const knownBytes = batch.images.reduce((total, image) => total + (image.fileSizeBytes || 0), 0);
  if (knownBytes > session.maxUploadBytes) throw new Error('This batch exceeds the pilot upload limit. Try a smaller batch.');
  const bytes = await createBatchArchive(batch, lighting);
  if (bytes.byteLength > session.maxUploadBytes) throw new Error('This batch exceeds the pilot upload limit. Try a smaller batch.');
  const sha256 = hex(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
  const batchId = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(batch.id)));
  onPhase('uploading');
  const response = await request(`${origin}/api/uploads`, { method: 'POST', credentials: 'same-origin',
    headers: { ...headers, 'Content-Type': 'application/zip', 'X-CSRF-Token': session.csrfToken,
      'X-Content-SHA256': sha256, 'X-Batch-ID': batchId },
    body: new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Upload failed. Your local batch is unchanged.');
  if (result.verified !== true || result.receipt?.sha256 !== sha256 || result.receipt?.batchId !== batchId ||
      result.receipt?.bytes !== bytes.byteLength) throw new Error('The upload receipt could not be verified. Please retry.');
  return result.receipt as { sha256: string; batchId: string; bytes: number; verifiedAt: string; objectKey: string; alreadyPresent: boolean };
}
