import type { StoredBatch } from '@/types';
import { batchClasses, labelFileName, toInternalMetadata, yoloLine } from './batchMetadata.ts';

export type AnnotationFileStore = {
  read: (name: string) => Promise<string | null>;
  write: (name: string, content: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
};

/** Update only text files. Never delete the batch folder or rewrite the source photos. */
export async function writeSavedAnnotationFiles(batch: StoredBatch, files: AnnotationFileStore,
  lighting: { id: number; name: string }[] = []) {
  if (!batch.id) throw new Error('The saved batch could not be identified.');
  const classes = batchClasses(batch);
  const updates: [string, string][] = batch.images.map(image => {
    if (!image.fileName) throw new Error('A saved photo is missing its filename.');
    return [labelFileName(image.fileName), (image.annotations ?? []).map(yoloLine).join('\n')];
  });
  updates.push(['classes.txt', classes.join('\n')], ['batch.txt', JSON.stringify(toInternalMetadata(batch, lighting), null, 2)]);
  // Read backups before changing anything. Write metadata last and restore on failure.
  const backups = new Map<string, string | null>();
  for (const [name] of updates) backups.set(name, await files.read(name));
  const attempted: string[] = [];
  try {
    for (const [name, content] of updates) {
      attempted.push(name);
      await files.write(name, content);
    }
  } catch (error) {
    let restored = true;
    for (const name of attempted.reverse()) {
      try {
        const previous = backups.get(name);
        if (previous === null) await files.remove(name);
        else await files.write(name, previous!);
      } catch { restored = false; }
    }
    if (!restored) throw new Error('Some annotation files could not be restored. Your photos are unchanged. Please retry saving.');
    throw error;
  }
  return batch;
}
