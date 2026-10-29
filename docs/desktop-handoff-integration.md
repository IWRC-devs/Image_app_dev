# Desktop handoff integration

The imported bundle is based on commit `4ed2f32`. Its original commits are retained:

- `a1416aa`: Field/Greenhouse growing environment and Soil/Pot planting system.
- `dc25ffa`: readable batch metadata, image dimensions/type/size, selected EXIF and embedded GPS.
- `a322eaa`: per-image YOLO annotation editor, retained on `annotation-feature`.

The metadata commits merge into `main` alongside the existing PWA. The combined editor and metadata implementation lives on `annotation-metadata-integration` and is used for the PWA preview.

## Combined behavior

Use the large green Annotate button on a photo in capture, image selection, or review to edit its boxes. Box labels show the selected weed name. Add several boxes, drag to move, and drag a corner to resize. Done retains edits and returns to the capture or selected-images list, where more photos can be added or annotated. Deleting all boxes retains an intentionally unannotated image.

Android continues saving to the chosen device folder. Each photo has a matching YOLO `.txt` label file, plus `classes.txt` and `batch.txt`. The PWA saves image bytes, annotations and metadata to IndexedDB. Its Saved Batches download button exports a ZIP with the same photos, label files, classes and readable metadata. EXIF is read locally when present; no upload or account is involved.

Schema 5 retains readable parameter/class names and omits internal UUIDs, device URIs and categorical IDs. Under each image filename, `bounding_box_coordinates` contains numbered instances alongside resolution, file details and available EXIF. YOLO numeric class indexes occur in label files, with line positions defined by `classes.txt`. See [a saved metadata example](batch-metadata-example.json). Its first annotation produces:

```text
0 0.500000 0.400000 0.200000 0.400000
```

Older flat metadata, pre-annotation photos and schema 3/4 metadata remain readable. Export serialization is shared by Android and the PWA to prevent their formats diverging.

## Validation

- TypeScript and ESLint.
- Automated persistence, metadata round-trip, legacy schema, EXIF/GPS and ZIP/YOLO tests.
- Production web export and offline deep-link/cache test.
- Android production JavaScript/Hermes export, without creating or installing an APK.

Android Gradle signing/build configuration, `app.json` and `eas.json` remain unchanged. Existing uncommitted logs and local release artifacts are excluded from these commits. No APK is built or installed for this handoff.
