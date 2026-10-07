# IWRC Imaging App 👋

A mobile field-data app for capturing weed imaging batches (location, plant/site parameters, and photos) and saving them locally on the device. Built with [Expo](https://expo.dev) / React Native.

## Current status

- **Platform focus: Android.** The save flow depends on Android's Storage Access Framework; iOS and web fall back to the app's private internal storage (see below) but are not the actively tested target.
- **Fully local, no backend.** The app does not upload batches, images, or metadata to any server or cloud account. There is no login/account system.
- **Capture flow**: Location → Parameters (botanical name, site, background, growth stage, soil color, lighting) → Image capture or manual selection → Review & Save, with a slide-in page transition between steps and a success screen (with a **Done** button that returns to the home screen) after saving.
- **Saved Batches screen**: lists previously saved batches on-device and allows deleting them.
- **Latest internal build**: [`releases/IWRC-Imaging-v1.0.0.apk`](releases/IWRC-Imaging-v1.0.0.apk) — a debug-signed APK for sideloading onto test devices (not published to the Play Store). Android will warn about installing from an unknown source; that's expected.

## Where data is saved

**On Android**, the first time a batch is saved, the app asks the user to pick a folder (the picker defaults to opening in *Documents*). Inside that folder it creates (or reuses) an **`IWRC imaging`** folder, and every saved batch gets its own subfolder named after the batch ID, containing:

- `image_001.jpg`, `image_002.jpg`, … — the captured/selected photos
- `batch.txt` — the batch metadata (location, plant/site parameters, lighting, image list), written as indented JSON but saved with a `.txt` extension so it opens directly in any text viewer without a JSON-aware app

The chosen folder is remembered after the first save, so the picker only appears once per device.

**On iOS/web**, batches are saved instead to the app's private internal document storage (not visible in a file manager), since the Storage Access Framework is Android-only.

Uninstalling the app removes its private internal batches. Batches saved to a user-selected Android folder (the normal path) are untouched by uninstalling, since they live outside the app's private storage.

## Get started

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
