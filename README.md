# IWRC Imaging App 👋

A mobile field-data app for capturing weed imaging batches (location, plant/site parameters, and photos) and saving them locally on the device. Built with [Expo](https://expo.dev) / React Native.

## Current status

- **Platform focus: Android.** Android saves through the Storage Access Framework; the web app uses browser-local IndexedDB storage, and iOS uses private internal storage (see below).
- **Browser/PWA preview:** the same Expo app also exports to the web, with offline caching and browser-local batch storage. Android APK and AAB build options remain available.
- **Collector details:** collector/team name, valid email address, organization, country and state are required. They are remembered on the current browser/device after Continue, prefilled for later batches, and editable on the same screen. Each batch retains its own details in `batch.txt` and PWA downloads.
- **Handoff integration preview:** includes environment/planting-system fields, image EXIF, and a per-image bounding-box editor. See [integration details and the saved metadata example](docs/desktop-handoff-integration.md).
- **Fully local, no backend.** The app does not upload batches, images, or metadata to any server or cloud account. There is no login/account system.
- **Capture flow**: Location → Parameters (botanical name, site, background, growth stage, soil color, lighting) → Image capture or manual selection → Review & Save, with a slide-in page transition between steps and a success screen (with a **Done** button that returns to the home screen) after saving.
- **Saved Batches screen**: lists previously saved batches on-device and allows deleting them.
- **Latest internal build**: [`releases/android/IWRC-Imaging-v1.0.0.apk`](releases/android/IWRC-Imaging-v1.0.0.apk) — a debug-signed APK for sideloading onto test devices (not published to the Play Store). Android will warn about installing from an unknown source; that's expected.

## Where data is saved

**On Android**, the first time a batch is saved, the app asks the user to pick a folder (the picker defaults to opening in *Documents*). Inside that folder it creates (or reuses) an **`IWRC imaging`** folder, and every saved batch gets its own subfolder named after the batch ID, containing:

- `image_001.jpg`, `image_002.jpg`, … — the captured/selected photos
- `batch.txt` — the batch metadata (location, plant/site parameters, lighting, image list), written as indented JSON but saved with a `.txt` extension so it opens directly in any text viewer without a JSON-aware app
- `image_001.txt`, `image_002.txt`, … — matching YOLO labels for each image, plus `classes.txt` naming the classes. Images without boxes have an empty label file.

The chosen folder is remembered after the first save, so the picker only appears once per device.

**In the browser/PWA**, photos and metadata are saved to IndexedDB on the current browser and device. They survive closing and reopening the page, but clearing this site's browser data removes them. They are not synchronized across browsers, devices, or the Android app. Private browsing may restrict storage. On phones, the camera option uses the browser's supported camera/file picker; desktops can select image files.

The PWA remembers collector/location defaults in browser local storage; Android uses app-local preferences. These defaults are not sent to a server. Clearing site data or uninstalling the Android app removes the remembered defaults. Updating defaults affects future batches, not previously saved batches.

Use the download icon on a Saved Batch to export its photos, readable metadata and YOLO labels as a ZIP. Each photo in capture, image selection or review has a large green **Annotate** button. Box labels show the selected weed name. In the editor, **Draw box** lets you drag out a new box; **Edit boxes** lets you select, move and resize it. Pinch or use **+ / −** to zoom up to 8×, use **Move image** to pan, and **Fit** to reset the view. **Next box** selects and centers overlapping or offscreen boxes. **Delete box**, **Undo**, and **Redo** work on individual drawing, movement, resize and deletion actions. New images start without an automatic box; small boxes can be as narrow or short as one original-image pixel. Zooming changes the view only: saved YOLO coordinates still refer to the original image. **Done** keeps the edits and returns to the captured/selected-images list so you can annotate another image or add more photos. Finish with **Review & Save → Save locally** to save the complete batch. Selected EXIF and embedded GPS are included when available in the source photo; metadata is read locally.

In `batch.txt`, schema 5 groups metadata under each saved image filename. Each image has `resolution`, file type/size, available EXIF, and `bounding_box_coordinates` containing `instance_1`, `instance_2`, and so on. Each instance contains the weed name and YOLO-normalized `x_center`, `y_center`, `width`, and `height` (0–1). The matching YOLO label files are also retained. Older annotation formats remain readable; see [the metadata example](docs/batch-metadata-example.json).

To annotate later, go to **Saved Batches → Open & annotate**, then choose a photo's green **Annotate / Edit annotation** button. **Done** saves the annotations back to that same batch and returns to its photo gallery. Existing photo bytes, batch identity, collection metadata, and other images are preserved. Browser downloads include the updated annotations; Android updates the existing TXT files without replacing the photo folder. A failed save keeps the editor open so you can retry. Older saved batches can be annotated without reentering collector details.

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
