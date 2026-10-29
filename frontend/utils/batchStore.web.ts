import type { ImageItem, StoredBatch } from '@/types';

type BrowserBatch = Omit<StoredBatch, 'images'> & {
  images: (Omit<ImageItem, 'uri'> & { blob: Blob })[];
};

let database: Promise<IDBDatabase> | undefined;
const imageUrls = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Browser storage is unavailable. Please use a regular browser window.'));
  }
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('iwrc-imaging', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('batches', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other IWRC Imaging tabs and try again.'));
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function writeBatch(batch: BrowserBatch | string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('batches', 'readwrite');
    const store = transaction.objectStore('batches');
    if (typeof batch === 'string') store.delete(batch);
    else store.put(batch);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage could not save the batch.'));
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveBatch(batch: StoredBatch): Promise<StoredBatch> {
  const images: BrowserBatch['images'] = [];
  for (const image of batch.images) {
    const { uri, ...metadata } = image;
    const response = await fetch(uri);
    if (!response.ok) throw new Error('An image could not be read. Please select it again.');
    images.push({ ...metadata, blob: await response.blob() });
  }
  const storedBatch = {
    ...batch,
    id: batch.id || batch.name || `batch-${Date.now()}`,
    synced: false,
    savedAt: batch.savedAt || new Date().toISOString(),
  };
  // Keep image bytes in IndexedDB, not temporary blob URLs or localStorage.
  // A failed transaction leaves any previous version of the batch intact.
  await writeBatch({ ...storedBatch, images });
  return storedBatch;
}

export async function getSavedBatches(): Promise<StoredBatch[]> {
  const db = await openDatabase();
  const batches = await new Promise<BrowserBatch[]>((resolve, reject) => {
    const transaction = db.transaction('batches', 'readonly');
    const request = transaction.objectStore('batches').getAll();
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
  for (const url of imageUrls.values()) URL.revokeObjectURL(url);
  imageUrls.clear();
  return batches
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .map((batch) => ({
      ...batch,
      images: batch.images.map((image) => {
        const { blob, ...metadata } = image;
        const uri = URL.createObjectURL(blob);
        imageUrls.set(`${batch.id}:${image.id}`, uri);
        return { ...metadata, uri };
      }),
    }));
}

export async function deleteBatch(id: string) {
  await writeBatch(id);
  for (const [key, url] of imageUrls) {
    if (key.startsWith(`${id}:`)) {
      URL.revokeObjectURL(url);
      imageUrls.delete(key);
    }
  }
}
