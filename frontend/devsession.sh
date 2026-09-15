#!/bin/bash
set -x
SDK="/c/Users/navjot.singh/AppData/Local/Android/Sdk"
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export PATH="$SDK/platform-tools:$SDK/emulator:$PATH"
cd /c/Users/navjot.singh/Documents/Image_app_dev/frontend

ADB="$SDK/platform-tools/adb.exe"

# 1. boot emulator as a child of this script
"$SDK/emulator/emulator.exe" -avd Pixel_10_Pro -no-snapshot-save -no-boot-anim > emulator.log 2>&1 &
EMU_PID=$!

until $ADB devices 2>/dev/null | grep -q "emulator-5554"; do sleep 2; done
until [ "$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
echo "EMULATOR_BOOTED"

# 2. start metro as a child of this script
npx expo start --dev-client > metro.log 2>&1 &
METRO_PID=$!

for i in $(seq 1 60); do
  if grep -q "Metro waiting on" metro.log 2>/dev/null; then
    echo "METRO_READY"
    break
  fi
  if grep -q "EMFILE" metro.log 2>/dev/null; then
    echo "METRO_EMFILE"
    break
  fi
  sleep 2
done

$ADB reverse tcp:8081 tcp:8081

# 3. launch the app
$ADB shell am start -n com.iwrc.devs.iwrcImaging/.MainActivity
echo "APP_LAUNCH_TRIGGERED"

# keep the emulator + metro processes alive for the rest of the session
wait $EMU_PID $METRO_PID
