# AlcheMix Studio — lance la suite de tests unitaires Vitest (npm test)
# Usage : powershell -ExecutionPolicy Bypass -File .\run_tests.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
npm test
exit $LASTEXITCODE
