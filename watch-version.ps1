Write-Host "Pulling latest code..." -ForegroundColor Yellow

git -c http.sslVerify=false pull

Write-Host "Done pulling remote." -ForegroundColor Green

$packagePath = "package.json"
$versionFile = "last-version.txt"

function Get-Version {
    $json = Get-Content $packagePath | ConvertFrom-Json
    return $json.version
}

if (-not (Test-Path $versionFile)) {
    "0.0.0" | Out-File $versionFile
}

$lastVersion = Get-Content $versionFile
Write-Host "Watching for version changes... (last: $lastVersion)"

while ($true) {
    Start-Sleep -Seconds 1

    $currentVersion = Get-Version

    if ($currentVersion -ne $lastVersion) {
        Write-Host "Version changed: $lastVersion -> $currentVersion" -ForegroundColor Green

        # build
        vsce package --allow-missing-repository

        # find latest .vsix
        $vsix = Get-ChildItem *.vsix | Sort-Object LastWriteTime | Select-Object -Last 1

        # install
        code --install-extension $vsix.Name

        # update last-version
        $currentVersion | Out-File $versionFile

        Write-Host "Committing to Git..." -ForegroundColor Yellow
        git add .
        git commit -m "Version $currentVersion"
        git push
        Write-Host "Git push done." -ForegroundColor Green


        $lastVersion = $currentVersion
        Write-Host "Done!"
    }
}
