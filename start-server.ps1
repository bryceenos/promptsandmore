# PowerShell HTTP Server for promptsandmore.com
$port = 8080
$url = "http://localhost:$port/"

Write-Host "=" -NoNewline
Write-Host ("=" * 59)
Write-Host "promptsandmore.com development server"
Write-Host "=" -NoNewline
Write-Host ("=" * 59)
Write-Host "Server starting at: $url"
Write-Host "Press Ctrl+C to stop the server"
Write-Host "=" -NoNewline
Write-Host ("=" * 59)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "Server is running! Open your browser to: $url" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        $filePath = Join-Path $PSScriptRoot $localPath.TrimStart('/')
        $filePath = $filePath -replace '/', '\'
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            
            $contentType = switch ($extension) {
                ".html" { "text/html; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".json" { "application/json" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".gif" { "image/gif" }
                ".svg" { "image/svg+xml" }
                ".ico" { "image/x-icon" }
                default { "application/octet-stream" }
            }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "`nServer stopped." -ForegroundColor Yellow
}

