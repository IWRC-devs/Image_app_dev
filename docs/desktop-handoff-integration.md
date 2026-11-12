# Desktop handoff integration

The imported bundle is based on commit `4ed2f32`. Its original commits are retained:

- `a1416aa`: Field/Greenhouse growing environment and Soil/Pot planting system.
- `dc25ffa`: readable batch metadata, image dimensions/type/size, selected EXIF and embedded GPS.
- `a322eaa`: the original YOLO annotation editor, retained on `annotation-feature`.

These features and the subsequent annotation updates are integrated into `main`, the PWA, and the Android release.

## Annotation and saved batches

Use the green Annotate button on a photo to open the editor. Tap the photo to place a red box, adjust its corners or drag its interior, and choose Save box before adding another. Edit boxes selects existing annotations. Delete box removes the selected instance. Two fingers zoom and move the image; the help icon explains the gestures. Done saves and returns to the photo gallery. New collections still need Review & Save to persist the complete batch.

Saved Batches has an Open & annotate action. Save box persists changes without leaving the editor; Done saves before returning to that saved gallery. Failed saves retain the editor and selection for retry. The batch ID, original save time, collector details, and photo bytes are preserved. Missing legacy collector fields do not block annotation. The browser keeps its existing IndexedDB database and blobs. Android reads older device folders and private batches alongside new batches. Open saved batch folder reconnects an Android folder after its saved preference or permission is lost.

## Folder layout and metadata

New Android saves and PWA ZIP downloads use:

```text
IWRC Imaging/
  <batch name>/
    image_001.jpg
    image_002.jpg
    batch.txt
```

Photo extensions reflect their actual format. There is one metadata file per batch, with collector, organization, location, parameters, and per-image resolution, image format, size, available EXIF, and numbered bounding-box instances. The PWA stores batches locally in its current browser and device until downloaded. No upload or account is required.

`annotation_format` is `COCO`. Boxes are `[x, y, width, height]` in pixels, measured from the top-left of the saved image after applying EXIF orientation. Each instance includes a unique annotation ID, image/category IDs, rectangular area, and `iscrowd: 0`. Images without annotations have no instances and remain in the COCO image list. The final root field is `schema_version: 1`.

The readable `images` object is keyed by filename. The same file also contains a `coco` object with standard COCO `images`, `annotations`, and `categories` arrays. For COCO tools, extract that object into a JSON file:

```python
import json
from pathlib import Path

metadata = json.loads(Path('batch.txt').read_text(encoding='utf-8'))
Path('instances.json').write_text(json.dumps(metadata['coco']), encoding='utf-8')
```

See [the metadata example](batch-metadata-example.json) and [the official COCO data format](https://cocodataset.org/#format-data). The first example box is `[80, 20, 40, 40]` on a 200 by 100 pixel image. Internal editor coordinates remain normalized so zooming and panning do not alter the annotation geometry.

Older flat metadata and schemas 3/4/5 remain readable. Existing legacy YOLO label files are updated when present; new batches and ZIPs contain only photos and batch.txt. Native annotation updates back up existing text and attempt restoration after a write failure. They never rewrite the saved photos. Very old private JSON records retain their local photo references; downloads use the new COCO metadata.

## Validation

- TypeScript and ESLint.
- Browser persistence, reopen/edit/reload/export, metadata round trips, five-image COCO fixtures, legacy formats, EXIF/GPS, and ZIP layout.
- Native storage simulations for new folders, legacy Android folders, reconnection, repeated annotation saves, interrupted writes, and iOS private saves.
- Official COCO API parsing of the exported COCO object.
- Production web export and offline cache tests.
- Signed Android release build and package/signature checks.

Physical-device testing remains necessary for Android folder permissions and touch gestures. APK and AAB build options remain available. App signing credentials and unrelated local artifacts are excluded from source changes.
