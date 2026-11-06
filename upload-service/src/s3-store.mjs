import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

export class S3Store {
  constructor(config, client) {
    this.config = config;
    this.client = client ?? new S3Client({
      endpoint: config.endpoint, region: config.region, forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Ceph/S3-compatible endpoints may not support AWS's optional checksum trailers.
      // Content-MD5 plus a full SHA-256 read-back verify this pilot independently.
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED', maxAttempts: 3,
    });
  }

  async check() { await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket })); }

  async verify(key, sha256, bytes) {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (Number(object.ContentLength) !== bytes) { object.Body?.destroy?.(); throw new Error('Storage verification failed.'); }
    const hash = createHash('sha256');
    let received = 0;
    try {
      for await (const chunk of object.Body) {
        received += chunk.length;
        if (received > bytes) throw new Error('Storage verification failed.');
        hash.update(chunk);
      }
    } finally { object.Body?.destroy?.(); }
    if (received !== bytes || hash.digest('hex') !== sha256) throw new Error('Storage verification failed.');
  }

  async putVerified({ file, batchId, sha256, md5, bytes }) {
    const key = `${this.config.prefix}/batches/${batchId}/${sha256}.zip`;
    let existing = false;
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      existing = Number(head.ContentLength) === bytes && head.Metadata?.sha256 === sha256;
      if (!existing) throw new Error('An existing storage object does not match the upload.');
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NotFound' && error.name !== 'NoSuchKey') throw error;
    }
    if (!existing) {
      const body = createReadStream(file);
      try {
        await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key,
          Body: body, ContentLength: bytes, ContentType: 'application/zip', ContentMD5: md5,
          Metadata: { sha256, 'batch-id': batchId, format: 'iwrc-batch-zip-v1' },
        }));
      } finally { body.destroy(); }
    }
    await this.verify(key, sha256, bytes);
    return { key, alreadyPresent: existing };
  }
}
