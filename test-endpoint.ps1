# Test endpoint de documentos
$url = "https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/documents/TJ8IMVJVQW/test-datasource"

Write-Host "Probando endpoint: $url" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method GET
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content: $($response.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}
