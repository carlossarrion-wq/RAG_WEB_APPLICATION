# Script simplificado para crear paquete Lambda
Write-Host "Creando paquete de despliegue Lambda..." -ForegroundColor Green

# Verificar archivos
$files = @("document_manager.py", "kb_query_handler.py", "bedrock_client_hybrid_search.py")
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "Error: Falta el archivo $file" -ForegroundColor Red
        exit 1
    }
}

# Crear directorio temporal
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tempDir = "lambda-temp-$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copiar archivos
Copy-Item "document_manager.py" -Destination $tempDir
Copy-Item "kb_query_handler.py" -Destination $tempDir
Copy-Item "bedrock_client_hybrid_search.py" -Destination $tempDir

# Crear ZIP
$zipName = "lambda-function-$timestamp.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force

# Limpiar
Remove-Item -Path $tempDir -Recurse -Force

if (Test-Path $zipName) {
    $size = (Get-Item $zipName).Length / 1KB
    Write-Host "Paquete creado: $zipName ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Ve a AWS Console -> Lambda"
    Write-Host "2. Busca 'bedrock-kb-query-handler'"
    Write-Host "3. Upload from .zip file"
    Write-Host "4. Sube: $zipName"
} else {
    Write-Host "Error creando el ZIP" -ForegroundColor Red
}
