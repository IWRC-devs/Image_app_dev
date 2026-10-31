# Personal Arbutus upload pilot

This is a local-only test for Navjot, not a multi-user account system or public upload endpoint. It binds to `127.0.0.1:8787`, so it cannot be reached directly from another computer or a phone. Android build settings are unchanged.

## Connection status

The service and simulated-storage tests are implemented. An actual Arbutus connection has **not** been established: the endpoint, assigned bucket/prefix and credentials must come from the storage owner. No research images have been uploaded during implementation. Starting without configuration shows the setup page and refuses uploads.

The official Arbutus documentation URL returned an anti-bot access-denied page during this review. University-maintained mirrors distinguish current and legacy endpoints. The code deliberately does not guess which endpoint or bucket belongs to this allocation; confirm them with the owner.

## Obtain the existing access details

Do not repeat the owner's completed OpenStack access-establishment steps or create a new bucket/project. Ask for:

- Exact HTTPS S3 endpoint, existing bucket name, signing region if needed, and assigned object prefix.
- Existing access/secret keys via an institution-approved secret-sharing tool or restricted OneDrive share to the intended institutional account. Avoid public links. Do not paste keys into chat, GitHub, or frontend configuration.
- Confirmation that the assigned bucket is private and the agreed 1 TB quota is applied. The per-batch application limit does not enforce shared bucket capacity or account for other writers.
- Permission to upload and read/verify objects under the assigned prefix. HeadObject checks for existing objects; appropriately scoped ListBucket permission may be needed to distinguish missing objects from access denial. The optional check:storage command uses HeadBucket. This implementation requests no bucket administration or public ACL changes.
- Storage-side at-rest encryption, retention, backup and recovery arrangements. TLS and checksum verification here do not establish those properties.

Suggested reply to the owner (not sent automatically):

> Thank you. A restricted institutional OneDrive share addressed to navjot.singh@tamu.edu would work, or an institution-approved one-time secret link. Please also provide the HTTPS S3 endpoint, existing bucket name, required region and assigned prefix, and confirm the bucket is private. We will keep keys only in the local upload service and start with the agreed 1 TB. For the first test I will be the only uploader.

## Configure privately on this Windows computer

Dependencies are installed for this workspace. A clean checkout needs `npm ci` in this directory and in `frontend`.

In a PowerShell terminal inside `upload-service`:

```powershell
.\configure.ps1
npm run check:storage
npm start
```

The script prompts for keys using hidden input. It creates `config.local.json` with file access limited to the current Windows account and SYSTEM. The file is ignored by Git and outside both served web roots. It is plaintext on disk with file access restrictions; protect the Windows account and disk accordingly. The script refuses to overwrite existing configuration. If organizational policy blocks scripts, use an approved configuration process rather than disabling that policy.

Restart a running service after configuration. `check:storage` is read-only: it checks bucket access, not upload correctness or privacy policy. Errors print no keys or signed URLs. A real small upload is still needed to establish compatibility with the assigned Arbutus instance.

Without credentials, `npm start` lets you inspect the local interface; it does not connect to storage.

## Test using an existing batch

Open **http://127.0.0.1:8787/** on this computer.

1. In the browser where your public app batches are saved, open Saved Batches and download one small batch ZIP.
2. Select that ZIP in the local uploader.
3. Click Upload and verify and keep the page open.
4. Success requires a complete remote read-back checksum match. Download the verification receipt if desired. Your local ZIP and app batch remain intact.

The local app is at **http://127.0.0.1:8787/Image_app_dev/**. Its Saved Batches page has an Upload batch button only at the designated localhost address. You can collect and upload a new small batch there. Other origins, including GitHub Pages, do not display this pilot upload control. Android's upload component is a no-op in this pilot; APK/AAB options remain available.

**Browser storage is isolated by origin.** The local app will not automatically see batches stored at the public GitHub Pages address. Use the downloaded-ZIP route to test those existing batches without moving or clearing their browser storage.

Rebuild the local app after code updates:

```powershell
cd ..\frontend
$env:EXPO_PUBLIC_BASE_PATH='/Image_app_dev'
npm run build:web
```

## Transfer and security behavior

- One explicit foreground upload at a time. Default limit: 128 MiB per ZIP, configurable up to 512 MiB. This is separate from the owner's 1 TB allocation. Large or interrupted uploads are manually retryable, not resumable.
- Incoming ZIPs stream to temporary disk files. The API uses a random HttpOnly SameSite=Strict cookie and a separate CSRF token, a custom client header, exact local Host/Origin checks and no cross-origin CORS access.
- Local HTTP is loopback-only. Outgoing storage connections require HTTPS with normal certificate validation. S3 keys stay on the server and are never returned in API responses, logged, bundled into the PWA or stored in collector preferences.
- ZIPs preserve the images, batch.txt metadata, classes.txt and per-image YOLO TXT labels. They are not extracted on the server. Header/checksum checks establish transfer consistency, not scientific annotation correctness or a full ZIP-format audit.
- ZIP entry timestamps are fixed, making unchanged batches byte-identical across retries. Actual capture/save times remain in EXIF and batch.txt.
- The server verifies incoming SHA-256, sends Content-MD5 to S3, then downloads the complete stored ZIP and checks SHA-256 and size before returning success. Verification uses additional bandwidth and time.
- Object keys are `<prefix>/batches/<hashed-batch-id>/<zip-sha256>.zip`. Retrying identical bytes for the same batch verifies/reuses that object; changed annotations create a new content revision. No bucket creation, ACL mutation or cloud deletion is performed.
- Failure is never marked successful. An object may remain after interrupted verification; retry the same ZIP to verify/reuse it. Cloud cleanup is intentionally not automatic.
- Local receipts are in `.data/receipts`; temporary ZIPs are removed after success/failure. An OS crash can leave temporary files. This pilot does not claim crash-proof cleanup, automatic background sync, public registration, central catalog or a dataset license workflow.

## Validation and production boundary

`npm test` uses simulated storage and fake S3 commands, without real credentials. Frontend tests cover complete ZIPs, matching receipts, localhost-only control visibility, deterministic exports and rejection of unavailable/oversized uploads.

Before admitting international contributors, use managed HTTPS hosting, verified accounts and permissions, resumable transfers, quota accounting and dataset review/reuse policies. Do not expose this loopback service by port forwarding or changing its bind address.

References: [Owner-provided Arbutus documentation](https://docs.alliancecan.ca/wiki/Arbutus_object_storage), [University-maintained documentation mirror](https://ualberta-rcg.github.io/ragflow-wiki-data/base/cloud/arbutus_object_storage/), [AWS SDK checksum behavior](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-checksums.html).
