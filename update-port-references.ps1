# Update all port references from 8000 to 8001
$files = @(
    "BACKEND_MANUAL_TEST.md",
    "BACKEND_QUICKSTART.md",
    "test-backend.ps1",
    "docs\BACKEND_SETUP.md"
)

foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $content = $content -replace 'localhost:8000', 'localhost:8001'
        Set-Content $path $content -NoNewline
        Write-Host "Updated: $file" -ForegroundColor Green
    }
}

Write-Host "`nPort references updated from 8000 to 8001" -ForegroundColor Cyan
