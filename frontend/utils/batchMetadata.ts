import type { BoundingBoxAnnotation, ImageExifMetadata, ImageItem, StoredBatch } from '@/types';

export function normalizeAnnotation(annotation: any, index: number): BoundingBoxAnnotation | null {
  const box = annotation?.bbox_yolo ?? annotation;
  const xCenter = Number(box?.x_center ?? box?.xCenter);
  const yCenter = Number(box?.y_center ?? box?.yCenter);
  const width = Number(box?.width);
  const height = Number(box?.height);
  const classId = Number(annotation?.class_id ?? annotation?.classId ?? 0);
  if (![xCenter, yCenter, width, height].every(Number.isFinite) ||
      !Number.isInteger(classId) || classId < 0 || width <= 0 || height <= 0 ||
      xCenter - width / 2 < -1e-6 || xCenter + width / 2 > 1 + 1e-6 ||
      yCenter - height / 2 < -1e-6 || yCenter + height / 2 > 1 + 1e-6) return null;
  return { id: String(annotation?.id ?? `annotation-${index}`), classId,
    className: annotation?.class_name ?? annotation?.className, xCenter, yCenter, width, height };
}

export function yoloLine(annotation: BoundingBoxAnnotation) {
  if (!normalizeAnnotation(annotation, 0)) throw new Error('An annotation extends outside the image or has invalid coordinates.');
  return `${annotation.classId} ${[annotation.xCenter, annotation.yCenter, annotation.width, annotation.height]
    .map((value) => value.toFixed(6)).join(' ')}`;
}

export function labelFileName(imageFileName: string) {
  return imageFileName.replace(/\.[^.]+$/, '') + '.txt';
}

export function batchClasses(batch: StoredBatch): string[] {
  const classes = [batch.botanicalName || 'weed_of_interest'];
  for (const image of batch.images) {
    for (const annotation of image.annotations ?? []) {
      if (!normalizeAnnotation(annotation, 0)) throw new Error('An annotation has invalid coordinates.');
      while (classes.length <= annotation.classId) classes.push(`class_${classes.length}`);
      classes[annotation.classId] = batch.botanicalName || annotation.className || 'weed_of_interest';
    }
  }
  return classes;
}

function displayName(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export const ROOT_DIRECTORY_NAME = 'IWRC Imaging';

export function batchFolderName(batch: Pick<StoredBatch, 'name' | 'id'>) {
  return (batch.name || batch.id || 'batch').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '').trim().replace(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?=\.|$)/i, '_$1') || 'batch';
}

export function imageExtension(uri: string, mimeType?: string | null) {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() : undefined;
  if (extension && ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'heic', 'heif', 'webp', 'avif', 'gif', 'bmp'].includes(extension)) return extension;
  const type = (mimeType || /^data:([^;,]+)/.exec(uri)?.[1] || '').split(';')[0];
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/tiff': 'tif', 'image/heic': 'heic',
    'image/heif': 'heif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'image/bmp': 'bmp' } as Record<string, string>)[type] || 'jpg';
}

export function imageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'tif' || extension === 'tiff') return 'image/tiff';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'avif') return 'image/avif';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'bmp') return 'image/bmp';
  return 'image/jpeg';
}

function imageFormat(fileName: string, mimeType?: string | null) {
  const extension = imageExtension(fileName, mimeType);
  if (extension === 'jpg' || extension === 'jpeg') return 'JPEG';
  if (extension === 'tif' || extension === 'tiff') return 'TIFF';
  return extension.toUpperCase();
}

function imageOrientation(width?: number, height?: number) {
  if (!width || !height) return undefined;
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

function compactObject(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value as Record<string, unknown>).length > 0;
      }
      return true;
    })
  );
}

function serializeExif(exif?: ImageExifMetadata) {
  if (!exif) return undefined;

  const gps = compactObject({
    latitude: exif.latitude,
    longitude: exif.longitude,
    altitude_meters: exif.altitudeMeters,
  });

  const serialized = compactObject({
    captured_at: exif.capturedAt,
    camera_make: exif.cameraMake,
    camera_model: exif.cameraModel,
    lens_model: exif.lensModel,
    exposure_time: exif.exposureTime,
    f_number: exif.fNumber,
    iso: exif.iso,
    focal_length_mm: exif.focalLengthMm,
    gps,
  });

  return Object.keys(serialized).length > 0 ? serialized : undefined;
}

function normalizeExif(exif: any): ImageExifMetadata | undefined {
  if (!exif) return undefined;
  const normalized = compactObject({
    capturedAt: exif.captured_at ?? exif.capturedAt,
    cameraMake: exif.camera_make ?? exif.cameraMake,
    cameraModel: exif.camera_model ?? exif.cameraModel,
    lensModel: exif.lens_model ?? exif.lensModel,
    exposureTime: exif.exposure_time ?? exif.exposureTime,
    fNumber: exif.f_number ?? exif.fNumber,
    iso: exif.iso,
    focalLengthMm: exif.focal_length_mm ?? exif.focalLengthMm,
    latitude: exif.gps?.latitude ?? exif.latitude,
    longitude: exif.gps?.longitude ?? exif.longitude,
    altitudeMeters: exif.gps?.altitude_meters ?? exif.altitudeMeters,
  }) as ImageExifMetadata;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeSavedBatch(
  batch: any,
  fallbackId?: string,
  imageUrisByName: Record<string, string> = {},
  lightingOptions: { id: number; name: string }[] = []
): StoredBatch {
  const parameters = batch?.parameters ?? batch ?? {};
  const location = batch?.location ?? batch ?? {};
  const legacyWeedSite = batch?.weed_site ?? batch?.weedSite ?? null;
  const lightingName = parameters?.lighting ?? batch?.lighting;
  const lightingId =
    typeof lightingName === 'string'
      ? lightingOptions.find((option) => option.name.toLowerCase() === lightingName.toLowerCase())?.id
      : batch?.lighting_id ?? batch?.lightingId ?? undefined;
  const rawImages = Array.isArray(batch?.images)
    ? batch.images
    : Object.entries(batch?.images ?? {}).map(([fileName, metadata]) => ({
        ...(metadata as Record<string, unknown>),
        file_name: fileName,
      }));
  const coco = batch?.coco ?? batch;
  const categories: { id: number; name: string }[] = coco?.categories ?? [];

  return {
    id: batch?.id ?? fallbackId ?? null,
    name: batch?.name ?? batch?.batch_name ?? fallbackId ?? '',
    affiliationId: batch?.affiliation_id ?? batch?.affiliationId,
    collectorName: batch?.collector?.name ?? batch?.collector_name ?? batch?.collectorName ?? null,
    collectorEmail: batch?.collector?.email ?? batch?.collector_email ?? batch?.collectorEmail ?? null,
    organization: batch?.collector?.organization ?? batch?.organization ?? null,
    locationCountry: location?.country ?? batch?.location_country ?? batch?.locationCountry ?? null,
    locationState: location?.state ?? batch?.location_state ?? batch?.locationState ?? null,
    locationCity: location?.city ?? batch?.location_city ?? batch?.locationCity ?? null,
    botanicalName: parameters?.botanical_name ?? batch?.botanical_name ?? batch?.botanicalName ?? null,
    weedBackground: parameters?.background ?? batch?.weed_background ?? batch?.weedBackground ?? null,
    growingEnvironment:
      parameters?.growing_environment ??
      batch?.growing_environment ??
      batch?.growingEnvironment ??
      (legacyWeedSite === 'Field' || legacyWeedSite === 'Greenhouse' ? legacyWeedSite : null),
    plantingSystem:
      parameters?.planting_system ??
      batch?.planting_system ??
      batch?.plantingSystem ??
      (legacyWeedSite === 'Pot' ? 'Pot' : null),
    weedSite: legacyWeedSite,
    growthStage: parameters?.growth_stage ?? batch?.growth_stage ?? batch?.growthStage ?? null,
    soilColor: parameters?.soil_color ?? batch?.soil_color ?? batch?.soilColor ?? null,
    lightingId,
    images: rawImages
      .map((image: any, index: number) => {
        const fileName = image?.file_name ?? image?.fileName ??
          Object.entries(imageUrisByName).find(([, uri]) => uri === image?.uri)?.[0] ??
          (image?.uri ? decodeURIComponent(image.uri).split('/').pop()?.split('?')[0] : null);
        const cocoImage = Array.isArray(coco?.images) ? coco.images.find((item: any) => item.file_name === fileName) : undefined;
        const width = image?.resolution?.width ?? image?.width ?? cocoImage?.width;
        const height = image?.resolution?.height ?? image?.height ?? cocoImage?.height;
        const imageId = image?.image_id ?? image?.id ?? cocoImage?.id;
        const rawAnnotations = Array.isArray(image?.annotations) ? image.annotations
          : image?.bounding_box_coordinates ? Object.entries(image.bounding_box_coordinates).map(([instance, coordinates]) => ({
            ...(coordinates as Record<string, unknown>), id: (coordinates as any)?.id ?? instance,
          })) : (coco?.annotations ?? []).filter((annotation: any) => annotation.image_id === imageId);
        return {
        id: String(image?.id ?? index),
        uri: imageUrisByName[fileName] ?? image?.uri ?? '',
        fileName,
        width,
        height,
        mimeType: image?.mime_type ?? image?.mimeType ?? (image?.image_format ? imageMimeType(`image.${image.image_format.toLowerCase()}`) : null),
        fileSizeBytes: image?.file_size_bytes ?? image?.fileSizeBytes,
        exif: normalizeExif(image?.exif),
        annotations: rawAnnotations.map((annotation: any, annotationIndex: number) => {
          const categoryIndex = categories.findIndex(category => category.id === annotation.category_id);
          const className = annotation.weed_name ?? annotation.class_name ?? annotation.className ?? categories[categoryIndex]?.name;
          const converted = Array.isArray(annotation.bbox) ? {
            xCenter: (Number(annotation.bbox[0]) + Number(annotation.bbox[2]) / 2) / width,
            yCenter: (Number(annotation.bbox[1]) + Number(annotation.bbox[3]) / 2) / height,
            width: Number(annotation.bbox[2]) / width, height: Number(annotation.bbox[3]) / height,
          } : annotation;
          return normalizeAnnotation({ ...converted, id: annotation.id, className,
            classId: annotation.class_id ?? annotation.classId ?? Math.max(0, categoryIndex,
              (batch?.classes ?? []).findIndex((name: unknown) => name === className)),
          }, annotationIndex);
        })
          .filter((annotation: BoundingBoxAnnotation | null): annotation is BoundingBoxAnnotation => Boolean(annotation)),
      }; })
      .filter((image: ImageItem) => Boolean(image.uri)),
    selectedOption: batch?.selected_option ?? batch?.selectedOption,
    synced: false,
    savedAt: batch?.saved_at ?? batch?.savedAt ?? new Date().toISOString(),
  };
}

export function toInternalMetadata(batch: StoredBatch, lightingOptions: { id: number; name: string }[] = []) {
  const classes = batchClasses(batch);
  const categories = classes.map((name, index) => ({ id: index + 1, name, supercategory: 'weed' }));
  const cocoImages: { id: number; file_name: string; width: number; height: number }[] = [];
  const annotations: { id: number; image_id: number; category_id: number; weed_name: string; bbox: number[]; area: number; iscrowd: number }[] = [];
  const pixelValue = (value: number) => Number(value.toPrecision(12));
  const images = Object.fromEntries(
    batch.images.map((image, index) => {
      const fileName = image.fileName ?? `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.uri, image.mimeType)}`;
      const width = image.width!;
      const height = image.height!;
      if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        throw new Error(`Image dimensions are missing for ${fileName}. Reopen the image before exporting its annotations.`);
      }
      const imageId = index + 1;
      cocoImages.push({ id: imageId, file_name: fileName, width, height });
      const boundingBoxes = Object.fromEntries((image.annotations ?? []).map((annotation, instance) => {
        const x = Math.max(0, (annotation.xCenter - annotation.width / 2) * width);
        const y = Math.max(0, (annotation.yCenter - annotation.height / 2) * height);
        const bbox = [x, y, Math.min(width, (annotation.xCenter + annotation.width / 2) * width) - x,
          Math.min(height, (annotation.yCenter + annotation.height / 2) * height) - y].map(pixelValue);
        const cocoAnnotation = { id: annotations.length + 1, image_id: imageId, category_id: annotation.classId + 1,
          weed_name: classes[annotation.classId], bbox, area: pixelValue(bbox[2] * bbox[3]), iscrowd: 0 };
        annotations.push(cocoAnnotation);
        return [`instance_${instance + 1}`, cocoAnnotation];
      }));
      return [
        fileName,
        {
          image_id: imageId,
          ...compactObject({
          resolution: { width, height },
          orientation: imageOrientation(image.width, image.height),
          image_format: imageFormat(fileName, image.mimeType),
          file_size_bytes: image.fileSizeBytes,
          exif: serializeExif(image.exif),
          }),
          bounding_box_coordinates: boundingBoxes,
        },
      ];
    })
  );

  return {
    batch_name: batch.name,
    saved_at: batch.savedAt,
    collector: compactObject({
      name: batch.collectorName?.trim(),
      email: batch.collectorEmail?.trim(),
      organization: batch.organization?.trim(),
    }),
    location: compactObject({
      country: batch.locationCountry,
      state: batch.locationState,
      city: batch.locationCity,
    }),
    parameters: compactObject({
      botanical_name: batch.botanicalName,
      growing_environment: batch.growingEnvironment,
      planting_system: batch.plantingSystem,
      background: batch.weedBackground,
      growth_stage: batch.growthStage,
      soil_color: batch.soilColor,
      lighting: displayName(lightingOptions.find((option) => option.id === batch.lightingId)?.name ?? ''),
    }),
    images,
    annotation_format: 'COCO',
    coordinate_system: {
      bbox_order: ['x', 'y', 'width', 'height'], units: 'pixels', origin: 'top-left',
      reference: 'Saved image at the resolution recorded for that image',
      image_orientation: 'Apply the saved image EXIF orientation before interpreting these coordinates.',
      area_units: 'square pixels of the bounding rectangle',
      iscrowd: '0 indicates an individually annotated plant',
      category_id: 'Matches an id in coco.categories',
      coco: 'Standard COCO object-detection dataset. Extract this object for COCO-compatible tools.',
    },
    coco: { info: { description: 'IWRC image batch with bounding-box annotations', version: '1', date_created: batch.savedAt },
      images: cocoImages, annotations, categories },
    schema_version: 1,
  };
}
