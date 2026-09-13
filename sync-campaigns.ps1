param(
    [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$baseDir = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SYNCING ALL CAMPAIGNS FROM FIRESTORE   " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Fetch campaigns from Firestore REST API
$url = 'https://firestore.googleapis.com/v1/projects/tra-frames/databases/(default)/documents/campaigns'
Write-Host "Fetching campaigns from Firestore..." -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri $url -Method Get

if (-not $res.documents) {
    Write-Error "No campaign documents found in Firestore."
    exit 1
}

Write-Host "Found $($res.documents.Count) campaigns in Firestore." -ForegroundColor Green

# Ensure directories exist
$cDir = Join-Path $baseDir "c"
$previewsDir = Join-Path $baseDir "previews"
$scratchDir = Join-Path $baseDir "scratch"
$toolsDir = Join-Path $baseDir "tools"

if (-not (Test-Path $cDir)) { New-Item -ItemType Directory -Path $cDir | Out-Null }
if (-not (Test-Path $previewsDir)) { New-Item -ItemType Directory -Path $previewsDir | Out-Null }
if (-not (Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir | Out-Null }

$previewTemplate = [System.IO.File]::ReadAllText((Join-Path $toolsDir "campaign-preview-template.html"), [System.Text.Encoding]::UTF8)
$redirectTemplate = [System.IO.File]::ReadAllText((Join-Path $toolsDir "campaign-redirect-template.html"), [System.Text.Encoding]::UTF8)
$platformTemplate = [System.IO.File]::ReadAllText((Join-Path $toolsDir "platform-banner-template.html"), [System.Text.Encoding]::UTF8)

foreach ($doc in $res.documents) {
    $slug = $doc.name.Split('/')[-1]
    $fields = $doc.fields
    
    $title = if ($fields.titleKm.stringValue) { $fields.titleKm.stringValue } elseif ($fields.titleEn.stringValue) { $fields.titleEn.stringValue } else { $slug }
    $desc = if ($fields.descriptionKm.stringValue) { $fields.descriptionKm.stringValue } elseif ($fields.descriptionEn.stringValue) { $fields.descriptionEn.stringValue } else { "Tra Frames Campaign" }
    $frameUrl = if ($fields.frameUrl.stringValue) { $fields.frameUrl.stringValue } else { "" }

    Write-Host "`n----------------------------------------" -ForegroundColor DarkGray
    Write-Host "Processing campaign: $slug" -ForegroundColor Cyan
    Write-Host "  Title: $title"

    # 1. Build Render HTML Template
    $safeTitle = [System.Security.SecurityElement]::Escape($title)
    $safeDesc = [System.Security.SecurityElement]::Escape($desc)

    $renderHtml = $previewTemplate.Replace('{{CAMPAIGN_TITLE}}', $safeTitle)
    $renderHtml = $renderHtml.Replace('{{CAMPAIGN_DESC}}', $safeDesc)
    $renderHtml = $renderHtml.Replace('{{FRAME_URL}}', $frameUrl)

    $tempHtmlPath = Join-Path $scratchDir "render_temp_$slug.html"
    [System.IO.File]::WriteAllText($tempHtmlPath, $renderHtml, $utf8NoBom)

    # 2. Render to previews/$slug.png using Chrome Headless via TEMP path
    $tempPng = Join-Path $env:TEMP "tf_preview_$slug.png"
    if (Test-Path $tempPng) { Remove-Item $tempPng -Force }

    $fileInfo = New-Object System.IO.FileInfo($tempHtmlPath)
    $fileUri = ([System.Uri]$fileInfo.FullName).AbsoluteUri

    Write-Host "  Rendering 1200x630 banner to previews/$slug.png..." -ForegroundColor DarkYellow
    $proc = Start-Process -FilePath $chrome -ArgumentList @('--headless=new', '--disable-gpu', '--window-size=1200,630', '--hide-scrollbars', "--screenshot=$tempPng", $fileUri) -Wait -PassThru -NoNewWindow
    
    Start-Sleep -Milliseconds 400

    $finalPreviewPng = Join-Path $previewsDir "$slug.png"
    if (Test-Path $tempPng) {
        Copy-Item $tempPng $finalPreviewPng -Force
        Remove-Item $tempPng -Force
        $pngSize = (Get-Item $finalPreviewPng).Length
        Write-Host "  Preview generated: $pngSize bytes" -ForegroundColor Green
    } else {
        Write-Warning "  Failed to generate preview for $slug"
    }

    if (Test-Path $tempHtmlPath) {
        Remove-Item $tempHtmlPath -Force
    }

    # 3. Create static c/$slug/index.html
    $slugDir = Join-Path $cDir $slug
    if (-not (Test-Path $slugDir)) {
        New-Item -ItemType Directory -Path $slugDir | Out-Null
    }

    $cIndexHtml = $redirectTemplate.Replace('{{SLUG}}', $slug)
    $cIndexHtml = $cIndexHtml.Replace('{{CAMPAIGN_TITLE}}', $safeTitle)
    $cIndexHtml = $cIndexHtml.Replace('{{CAMPAIGN_DESC}}', $safeDesc)

    $slugIndexFile = Join-Path $slugDir "index.html"
    [System.IO.File]::WriteAllText($slugIndexFile, $cIndexHtml, $utf8NoBom)
    Write-Host "  Generated page: c/$slug/index.html" -ForegroundColor Green
}

# 4. Render platform banner for root og-preview.png
Write-Host "`n----------------------------------------" -ForegroundColor DarkGray
Write-Host "Rendering root og-preview.png (Platform Banner)..." -ForegroundColor Yellow
$generalTempHtml = Join-Path $scratchDir "general_banner_temp.html"
[System.IO.File]::WriteAllText($generalTempHtml, $platformTemplate, $utf8NoBom)

$generalTempPng = Join-Path $env:TEMP "tf_general_preview.png"
if (Test-Path $generalTempPng) { Remove-Item $generalTempPng -Force }

$generalFileInfo = New-Object System.IO.FileInfo($generalTempHtml)
$generalUri = ([System.Uri]$generalFileInfo.FullName).AbsoluteUri

$proc = Start-Process -FilePath $chrome -ArgumentList @('--headless=new', '--disable-gpu', '--window-size=1200,630', '--hide-scrollbars', "--screenshot=$generalTempPng", $generalUri) -Wait -PassThru -NoNewWindow
Start-Sleep -Milliseconds 400

$rootOg = Join-Path $baseDir "og-preview.png"
if (Test-Path $generalTempPng) {
    Copy-Item $generalTempPng $rootOg -Force
    Remove-Item $generalTempPng -Force
    $rootSize = (Get-Item $rootOg).Length
    Write-Host "Updated root og-preview.png successfully ($rootSize bytes)!" -ForegroundColor Green
}
if (Test-Path $generalTempHtml) { Remove-Item $generalTempHtml -Force }

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "ALL CAMPAIGN PREVIEWS & PAGES READY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# 5. Automatically deploy to GitHub unless -NoDeploy is specified
if (-not $NoDeploy) {
    Write-Host "`nStarting deployment to GitHub..." -ForegroundColor Cyan
    & (Join-Path $baseDir "deploy.ps1")
}
