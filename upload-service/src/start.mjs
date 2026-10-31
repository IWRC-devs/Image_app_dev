import { createUploadServer } from './server.mjs';
import { loadConfig } from './config.mjs';
import { S3Store } from './s3-store.mjs';

try {
  const config = await loadConfig();
  const server = createUploadServer({ store: config ? new S3Store(config) : null,
    ...(config ? { maxUploadBytes: config.maxUploadBytes } : {}) });
  server.listen(8787, '127.0.0.1', () => {
    console.log('Local uploader: http://127.0.0.1:8787/');
    console.log('Local app: http://127.0.0.1:8787/Image_app_dev/');
    console.log(config ? 'Storage configuration loaded. A successful upload still requires read-back verification.'
      : 'Storage is not configured. No cloud connection or upload will be attempted.');
  });
  server.on('error', () => { console.error('Could not start the local uploader. Port 8787 may already be in use.'); process.exitCode = 1; });
} catch {
  console.error('Local storage configuration is invalid. Check config.local.json; no credential values are printed.');
  process.exitCode = 1;
}
