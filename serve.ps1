# Multi-Device Local & Network Web Server for Tra Frames
$port = 5000
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
if (-not $localIP) { $localIP = "127.0.0.1" }

$localUrl = "http://localhost:$port/"
$networkUrl = "http://${localIP}:$port/"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "                  TRA FRAMES WEB SERVER                          " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  [1] បើកលើកុំព្យូទ័រនេះ (Local PC):   $localUrl" -ForegroundColor Yellow
Write-Host "  [2] Link សម្រាប់អោយអ្នកដទៃ/ទូរស័ព្ទប្រើ (Wi-Fi/Phone): $networkUrl" -ForegroundColor Green
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  អ្នកដែលភ្ជាប់ Wi-Fi ជាមួយគ្នា អាចបើកមើល និងប្រើស៊ុមរូបថតបានទាំងអស់គ្នា!" -ForegroundColor White
Write-Host "  ចុច Ctrl+C ដើម្បីបិទ Server." -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Cyan

# Open default browser to the local URL
Start-Process $localUrl

$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $requestLine = $reader.ReadLine()

        if ($requestLine) {
            $tokens = $requestLine.Split(' ')
            $path = $tokens[1].Split('?')[0].TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
                $path = "index.html"
            }

            $filePath = [System.IO.Path]::Combine($currentDir, $path.Replace('/', '\'))

            if ([System.IO.File]::Exists($filePath)) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = "application/octet-stream"
                switch ($ext) {
                    ".html" { $mime = "text/html; charset=utf-8" }
                    ".htm"  { $mime = "text/html; charset=utf-8" }
                    ".css"  { $mime = "text/css; charset=utf-8" }
                    ".js"   { $mime = "application/javascript; charset=utf-8" }
                    ".json" { $mime = "application/json; charset=utf-8" }
                    ".svg"  { $mime = "image/svg+xml" }
                    ".png"  { $mime = "image/png" }
                    ".jpg"  { $mime = "image/jpeg" }
                    ".jpeg" { $mime = "image/jpeg" }
                    ".webp" { $mime = "image/webp" }
                    ".ico"  { $mime = "image/x-icon" }
                }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)

                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($notFound.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($notFound, 0, $notFound.Length)
            }
        }

        $stream.Flush()
        $stream.Close()
        $client.Close()
    }
} finally {
    $listener.Stop()
}
