$title = Read-Host 'Enter post title'
$slug = $title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-'
$date = Get-Date -Format 'yyyy-MM-dd'
$datetime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
$filename = "_posts/$date-$slug.md"
$content = @"
---
layout: post
title: $title
date: $datetime
categories: []
tags: []
---

"@
New-Item -Path $filename -ItemType File -Value $content -Force
code $filename
