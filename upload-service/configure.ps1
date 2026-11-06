$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'config.local.json'
if (Test-Path -LiteralPath $configPath) {
    throw 'Local configuration already exists. Update it privately instead of overwriting credentials.'
}
Write-Host 'Enter the details provided by the storage owner. Do not paste keys into chat.'
$endpoint = Read-Host 'S3 HTTPS endpoint'
$bucket = Read-Host 'Existing private bucket name'
$region = Read-Host 'Signing region (press Enter for us-east-1; confirm with owner)'
if ([string]::IsNullOrWhiteSpace($region)) { $region = 'us-east-1' }
$prefix = Read-Host 'Assigned object prefix (press Enter for iwrc-pilot/navjot)'
if ([string]::IsNullOrWhiteSpace($prefix)) { $prefix = 'iwrc-pilot/navjot' }
$privateConfirmed = Read-Host 'Has the storage owner confirmed the bucket is private? Type yes to continue'
if ($privateConfirmed -ne 'yes') { throw 'Ask the storage owner to confirm the bucket is private before configuring uploads.' }
$accessSecure = Read-Host 'S3 access key (hidden)' -AsSecureString
$secretSecure = Read-Host 'S3 secret key (hidden)' -AsSecureString
$access = (New-Object System.Net.NetworkCredential('', $accessSecure)).Password
$secret = (New-Object System.Net.NetworkCredential('', $secretSecure)).Password
$values = @{
    endpoint = $endpoint.Trim(); bucket = $bucket.Trim(); region = $region.Trim(); prefix = $prefix.Trim()
    accessKeyId = $access; secretAccessKey = $secret; privateBucketConfirmed = $true; maxUploadBytes = 134217728
}
$json = $values | ConvertTo-Json
[System.IO.File]::WriteAllText($configPath, $json, (New-Object System.Text.UTF8Encoding($false)))
try {
    $security = New-Object System.Security.AccessControl.FileSecurity
    $security.SetAccessRuleProtection($true, $false)
    $owner = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $system = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')
    $security.SetOwner($owner)
    $security.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($owner, 'FullControl', 'Allow')))
    $security.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($system, 'FullControl', 'Allow')))
    Set-Acl -LiteralPath $configPath -AclObject $security
} catch {
    Remove-Item -LiteralPath $configPath -Force
    throw 'Private file permissions could not be applied. Configuration was removed; no keys were printed.'
} finally {
    $access = $null; $secret = $null; $json = $null; $values = $null
}
Write-Host 'Private local configuration saved. Run npm run check:storage, then npm start.'
