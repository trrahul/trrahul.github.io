#!/usr/bin/env pwsh

# Jekyll Clean & Serve Script
# Cleans the Jekyll build cache and serves the site with live reload

Write-Host "🧹 Cleaning Jekyll build cache..." -ForegroundColor Yellow

# Clean Jekyll cache and build
if (Test-Path "_site") {
    Remove-Item "_site" -Recurse -Force
    Write-Host "   Removed _site directory" -ForegroundColor Gray
}

if (Test-Path ".jekyll-cache") {
    Remove-Item ".jekyll-cache" -Recurse -Force
    Write-Host "   Removed .jekyll-cache directory" -ForegroundColor Gray
}

Write-Host "🚀 Starting Jekyll with live reload..." -ForegroundColor Green

# Serve Jekyll with live reload
bundle exec jekyll serve --livereload --force_polling