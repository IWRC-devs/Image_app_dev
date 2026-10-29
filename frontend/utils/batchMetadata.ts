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
  return { id: annotation?.id ?? `annotation-${index}`, classId,
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

export function imageExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() : undefined;
  return extension && ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'heic', 'webp'].includes(extension)
    ? extension
    : 'jpg';
}

export function imageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'tif' || extension === 'tiff') return 'image/tiff';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
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

  return {
    id: batch?.id ?? fallbackId ?? null,
    name: batch?.name ?? batch?.batch_name ?? fallbackId ?? '',
    affiliationId: batch?.affiliation_id ?? batch?.affiliationId,
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
      .map((image: any, index: number) => ({
        id: image?.id ?? `${index}`,
        uri: image?.uri ?? imageUrisByName[image?.file_name ?? image?.fileName] ?? '',
        fileName: image?.file_name ?? image?.fileName ?? null,
        width: image?.resolution?.width ?? image?.width,
        height: image?.resolution?.height ?? image?.height,
        mimeType: image?.mime_type ?? image?.mimeType ?? null,
        fileSizeBytes: image?.file_size_bytes ?? image?.fileSizeBytes,
        exif: normalizeExif(image?.exif),
        annotations: (Array.isArray(image?.annotations) ? image.annotations : [])
          .map((annotation: any, index: number) => normalizeAnnotation({
            ...annotation,
            classId: annotation.class_id ?? annotation.classId ?? Math.max(0,
              (batch?.classes ?? []).findIndex((name: unknown) => name === annotation.class_name)),
          }, index))
          .filter((annotation: BoundingBoxAnnotation | null): annotation is BoundingBoxAnnotation => Boolean(annotation)),
      }))
      .filter((image: ImageItem) => Boolean(image.uri)),
    selectedOption: batch?.selected_option ?? batch?.selectedOption,
    synced: false,
    savedAt: batch?.saved_at ?? batch?.savedAt ?? new Date().toISOString(),
  };
}

export function toInternalMetadata(batch: StoredBatch, lightingOptions: { id: number; name: string }[] = []) {
  const classes = batchClasses(batch);
  const images = Object.fromEntries(
    batch.images.map((image, index) => {
      const fileName = image.fileName ?? `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.uri)}`;
      const resolution = compactObject({ width: image.width, height: image.height });
      return [
        fileName,
        compactObject({
          resolution,
          orientation: imageOrientation(image.width, image.height),
          mime_type: image.mimeType,
          file_size_bytes: image.fileSizeBytes,
          exif: serializeExif(image.exif),
          annotations: (image.annotations ?? []).map((annotation) => ({
            class_name: classes[annotation.classId],
            bbox_yolo: { x_center: annotation.xCenter, y_center: annotation.yCenter,
              width: annotation.width, height: annotation.height },
          })),
        }),
      ];
    })
  );

  return {
    schema_version: 4,
    batch_name: batch.name,
    saved_at: batch.savedAt,
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
    annotation_format: 'YOLO normalized (class_id x_center y_center width height)',
    classes,
  };
}
