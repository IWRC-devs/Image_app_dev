$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================="
Write-Host "IWRC Imaging APK build helper"
Write-Host "========================================="

Write-Host "Step 1: Install app dependencies"
npm install

Write-Host "Step 2: Log in to Expo / EAS"
Write-Host "A browser window will open for login if needed."
npx eas-cli@latest login

Write-Host "Step 3: Start Android APK build"
Write-Host "This uses the existing EAS profile in eas.json"
npx eas-cli@latest build --platform android --profile production

Write-Host "Step 4: Download the built APK"
Write-Host "When the build finishes, copy the build ID from the terminal output and paste it below."
$buildId = Read-Host "EAS Build ID (leave blank to skip automatic download)"

if (-not [string]::IsNullOrWhiteSpace($buildId)) {
    New-Item -ItemType Directory -Force -Path "./apk-builds" | Out-Null
    npx eas-cli@latest build:download --platform android --id $buildId --path "./apk-builds/iwrc-imaging.apk"
    Write-Host "APK downloaded successfully."
    Write-Host "Location: $PSScriptRoot\apk-builds\iwrc-imaging.apk"
} else {
    Write-Host "No build ID entered."
    Write-Host "Open the Expo/EAS build page in your browser to download the APK manually."
}

Write-Host "Done."
