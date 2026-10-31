import { loadConfig } from './config.mjs';
import { S3Store } from './s3-store.mjs';

try {
  const config = await loadConfig();
  if (!config) throw new Error('Storage is not configured yet. Run configure.ps1 first.');
  await new S3Store(config).check();
  console.log('The configured bucket is reachable with your credentials. No files were uploaded or changed.');
} catch {
  console.error('Storage check did not succeed. Check your local configuration and bucket permissions; no keys are printed.');
  process.exitCode = 1;
}
