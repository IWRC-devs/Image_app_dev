const connection = document.querySelector('#connection');
const upload = document.querySelector('#upload');
const input = document.querySelector('#batch');
const progress = document.querySelector('#progress');
const receiptButton = document.querySelector('#receipt');
let session;
let receipt;
const hex = buffer => Array.from(new Uint8Array(buffer), value => value.toString(16).padStart(2, '0')).join('');

async function connect() {
  const response = await fetch('/api/session', { cache: 'no-store', headers: { 'X-IWRC-Client': 'iwrc-local-pilot' } });
  if (!response.ok) throw new Error('The local upload service is unavailable.');
  session = await response.json();
  connection.textContent = session.configured
    ? `Storage configuration is ready. Pilot limit: ${Math.floor(session.maxUploadBytes / 1024 / 1024)} MiB per batch. Upload a small batch to test the connection.`
    : 'Storage is not connected yet. Ask for the endpoint, bucket, prefix and keys, then run configure.ps1 on this computer.';
  upload.disabled = !session.configured;
}
connect().catch(error => { connection.textContent = error.message; });

upload.addEventListener('click', async () => {
  const file = input.files[0];
  if (!file) { progress.textContent = 'Choose a batch ZIP first.'; return; }
  receiptButton.hidden = true;
  upload.disabled = true;
  input.disabled = true;
  try {
    await connect();
    upload.disabled = true;
    if (!session.configured) throw new Error('Storage is not configured yet.');
    if (file.size > session.maxUploadBytes) throw new Error('This ZIP is larger than the pilot batch limit. Try a smaller batch.');
    progress.textContent = 'Checking the ZIP checksum…';
    const sha256 = hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
    const batchId = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.name)));
    progress.textContent = 'Uploading and verifying the stored ZIP. Keep this page open…';
    const response = await fetch('/api/uploads', { method: 'POST', body: file,
      headers: { 'Content-Type': 'application/zip', 'X-IWRC-Client': 'iwrc-local-pilot',
        'X-CSRF-Token': session.csrfToken, 'X-Content-SHA256': sha256, 'X-Batch-ID': batchId } });
    const result = await response.json();
    if (!response.ok || result.verified !== true || result.receipt?.sha256 !== sha256) throw new Error(result.error || 'Upload was not verified.');
    receipt = result.receipt;
    progress.textContent = 'Upload verified. Your local ZIP is unchanged. You can download the verification receipt below.';
    receiptButton.hidden = false;
  } catch (error) { progress.textContent = error.message || 'Upload failed. Your local ZIP is unchanged.'; }
  finally { upload.disabled = !session?.configured; input.disabled = false; }
});
receiptButton.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'iwrc-upload-receipt.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
