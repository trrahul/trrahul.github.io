#!/usr/bin/env pwsh

# Jekyll Clean & Serve Script
# Cleans the Jekyll build cache and serves the site with live reload.

$ErrorActionPreference = 'Stop'

# Stop any stray Jekyll serve / Ruby static server first. A process whose
# working directory is inside _site (e.g. `ruby -run -e httpd`) locks the
# folder on Windows, which makes the Remove-Item below fail.
Write-Host "🛑 Stopping any running Jekyll / Ruby servers..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "name='ruby.exe'" |
    Where-Object { $_.CommandLine -match 'jekyll|httpd|webrick' } |
    ForEach-Object {
        Write-Host "   Stopping PID $($_.ProcessId): $($_.CommandLine)" -ForegroundColor Gray
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
Start-Sleep -Milliseconds 300

Write-Host "🧹 Cleaning Jekyll build cache..." -ForegroundColor Yellow

# Remove a directory, retrying briefly in case a handle is still releasing.
function Remove-DirSafe([string]$path) {
    if (-not (Test-Path $path)) { return }
    for ($i = 0; $i -lt 5; $i++) {
        try {
            Remove-Item $path -Recurse -Force -ErrorAction Stop
            Write-Host "   Removed $path" -ForegroundColor Gray
            return
        } catch {
            Start-Sleep -Milliseconds 400
        }
    }
    Write-Warning "Could not remove '$path' — it may still be locked by another process."
}

Remove-DirSafe "_site"
Remove-DirSafe ".jekyll-cache"

Write-Host "🚀 Starting Jekyll with live reload..." -ForegroundColor Green

# Serve Jekyll with live reload
bundle exec jekyll serve --livereload --force_polling
