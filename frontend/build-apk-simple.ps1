$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================="
Write-Host "IWRC Imaging APK build"
Write-Host "========================================="

Write-Host "Step 1: Install dependencies"
npm install

Write-Host "Step 2: Login to Expo/EAS"
Write-Host "This opens the browser if needed."
npx eas-cli@latest login

Write-Host "Step 3: Build Android APK"
npx eas-cli@latest build --platform android --profile production

Write-Host "========================================="
Write-Host "Build started."
Write-Host "When it finishes, open the Expo/EAS link in the terminal output and download the APK from there."
Write-Host "========================================="
