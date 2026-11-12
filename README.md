# IWRC Imaging App 👋

A mobile field-data app for capturing weed imaging batches (location, plant/site parameters, and photos) and saving them locally on the device. Built with [Expo](https://expo.dev) / React Native.

## Current status

- **Platform focus: Android.** Android saves through the Storage Access Framework; the web app uses browser-local IndexedDB storage, and iOS uses private internal storage (see below).
- **Browser/PWA preview:** the same Expo app also exports to the web, with offline caching and browser-local batch storage. Android APK and AAB build options remain available.
- **Collector details:** collector/team name, valid email address, organization, country and state are required. They are remembered on the current browser/device after Continue, prefilled for later batches, and editable on the same screen. Each batch retains its own details in `batch.txt` and PWA downloads.
- **Handoff integration preview:** includes environment/planting-system fields, image EXIF, and a per-image bounding-box editor. See [integration details and the saved metadata example](docs/desktop-handoff-integration.md).
- **Local collection plus a personal upload pilot.** The public PWA and native app retain local collection. A loopback-only S3 upload service supports a personal Arbutus test on this computer, with server-side credentials, explicit uploads and verified receipts. It is not connected to real storage until the owner's details and keys are configured. There is no public login/account system. See [local pilot setup](upload-service/README.md).
- **Capture flow**: Location → Parameters (botanical name, site, background, growth stage, soil color, lighting) → Image capture or manual selection → Review & Save, with a slide-in page transition between steps and a success screen (with a **Done** button that returns to the home screen) after saving.
- **Saved Batches screen**: opens existing batches for annotation, downloads web batch ZIPs, and allows deleting local batches. The local upload pilot also displays an Upload batch action; this action is hidden on the public GitHub Pages app and native builds.
- **Latest Android release**: [IWRC Imaging v1.0.3](https://github.com/IWRC-devs/Image_app_dev/releases/tag/v1.0.3) — signed APK, Android build number 4. The APK is also saved in [`releases/android`](releases/android/IWRC-Imaging-v1.0.3.apk).

## Where data is saved

**On Android**, choose a parent folder when saving for the first time. The app creates or reuses **`IWRC Imaging`**, with one subfolder per batch name. Each batch folder contains:

- `image_001.jpg`, `image_002.jpg`, … — the captured/selected photos
- `batch.txt` — indented JSON containing collector, organization, location, parameters, image format/resolution/size, available EXIF and every bounding box.

The chosen folder is remembered. Existing batches in the older `IWRC imaging` and `IWRC` folders and private storage remain available. Use **Saved Batches → Open saved batch folder** on Android to reconnect a folder after reinstalling or losing its saved permission. Older batches are annotated in their original location. Existing legacy label files are kept accurate when present.

**In the browser/PWA**, photos and metadata are saved to IndexedDB on the current browser and device. They survive closing and reopening the page, but clearing this site's browser data removes them. They are not synchronized across browsers, devices, or the Android app. Private browsing may restrict storage. On phones, the camera option uses the browser's supported camera/file picker; desktops can select image files.

The PWA remembers collector/location defaults in browser local storage; Android uses app-local preferences. These defaults are not sent to a server. Clearing site data or uninstalling the Android app removes the remembered defaults. Updating defaults affects future batches, not previously saved batches.

Use a Saved Batch's download icon to export `IWRC Imaging/<batch name>/`, containing the photos and one `batch.txt`. Each photo has a green **Annotate** button. Tap the photo to place a red box, drag its corners or interior to adjust it, then choose **Save box** before adding another. Use two fingers to zoom and move the image. **Edit boxes** selects existing boxes. **Delete box** removes the selected instance. **Done** saves edits and returns to the image list. The top-left back arrow saves annotation edits before returning to the previous page. Help contains the detailed instructions. For a new collection, finish with **Review & Save → Save locally** to save the complete batch.

In `batch.txt`, `images` is keyed by filename. Each image has `image_format`, `resolution`, available file/EXIF information, and `bounding_box_coordinates` with numbered instances. Each instance has COCO `bbox` values `[x, y, width, height]` in pixels from the top-left of the saved image, a unique annotation ID, image/category IDs, rectangular area and `iscrowd: 0`. `coordinate_system` explains the units and EXIF orientation. The `coco` section contains standard COCO `images`, `annotations` and `categories` arrays for training tools. Extract that object as JSON for the COCO API. `annotation_format` is `COCO`, and `schema_version` is the final field with value `1`. Older flat and YOLO metadata remains readable. See [the saved metadata example](docs/batch-metadata-example.json).

To annotate later, go to **Saved Batches → Open & annotate**, then choose a photo's green **Annotate / Edit annotation** button. **Save box** saves the annotations back to that same batch while staying on the image, and **Done** saves and returns to its photo gallery. Existing photo bytes, batch identity, collection metadata, and other images are preserved. Browser downloads include the updated annotations; Android updates the existing TXT files without replacing the photo folder. A failed save keeps the editor open with the box selected so you can retry. Older saved batches can be annotated without reentering collector details.

**On iOS**, batches are saved instead to the app's private internal document storage (not visible in a file manager), since the Storage Access Framework is Android-only.

Uninstalling the app removes its private internal batches. Batches saved to a user-selected Android folder (the normal path) are untouched by uninstalling, since they live outside the app's private storage.

## Get started

### Open or build the PWA

Open [IWRC Imaging in your browser](https://iwrc-devs.github.io/Image_app_dev/). Installation is optional: use it as a normal website, or use your browser's Install/Add to Home Screen option. Offline use becomes available after the first online visit finishes caching the app. Updates activate after all existing app tabs are closed and the app is reopened online.

To export the same app for GitHub Pages from PowerShell:

```powershell
cd frontend
$env:EXPO_PUBLIC_BASE_PATH = '/Image_app_dev'
npm run build:web
```

For hosting at a domain's root, omit `EXPO_PUBLIC_BASE_PATH`. The export is in `frontend/dist`. The PWA manifest and versioned service worker are generated during the build. To publish to the repository's existing `gh_pages` branch, run `npm run publish:web` after committing the source and rebuilding it. This requires Git push access; it preserves existing branch files and does not force-push. GitHub Pages then builds the published branch.

`npm run test:web` checks browser storage persistence using an IndexedDB implementation for Node (Node 22.18+ or 24+). No phone or app installation is needed.

### Android development and APK builds

1. Install dependencies

   ```bash
   cd frontend
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a

   - [development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

   This project uses [file-based routing](https://docs.expo.dev/router/introduction); the imaging flow lives under `frontend/app/screens/imaging`.

3. Build a standalone Android APK (no Metro/dev server needed to run it)

   ```bash
   cd frontend/android
   ./gradlew assembleRelease
   ```

   The output APK is written to `frontend/android/app/build/outputs/apk/release/app-release.apk`.

## Learn more

- [Expo documentation](https://docs.expo.dev/): fundamentals and advanced guides.
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): a step-by-step tutorial for a project that runs on Android, iOS, and the web.
