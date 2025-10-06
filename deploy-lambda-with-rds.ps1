# Script para desplegar Lambda con soporte para RDS
# Incluye pymysql y el módulo db_logger

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DESPLIEGUE DE LAMBDA CON SOPORTE RDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuración
$FUNCTION_NAME = "bedrock-kb-query-handler"
$REGION = "eu-west-1"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$ZIP_FILE = "lambda-function-rds-$TIMESTAMP.zip"

Write-Host "`n[1/6] Limpiando archivos temporales..." -ForegroundColor Yellow
if (Test-Path "package") {
    Remove-Item -Recurse -Force "package"
}
if (Test-Path "*.zip") {
    Remove-Item -Force "*.zip"
}

Write-Host "[2/6] Creando directorio de paquete..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "package" | Out-Null

Write-Host "[3/6] Instalando dependencias Python (pymysql)..." -ForegroundColor Yellow
python -m pip install --target ./package pymysql

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error instalando dependencias" -ForegroundColor Red
    exit 1
}

Write-Host "[4/6] Copiando archivos de la función Lambda..." -ForegroundColor Yellow
# Copiar archivos Python de la Lambda
Copy-Item "kb_query_handler.py" -Destination "package/"
Copy-Item "bedrock_client_hybrid_search.py" -Destination "package/"
Copy-Item "document_manager.py" -Destination "package/"
Copy-Item "db_logger.py" -Destination "package/"

Write-Host "[5/6] Creando archivo ZIP..." -ForegroundColor Yellow
# Cambiar al directorio package y crear el ZIP
Push-Location "package"
Compress-Archive -Path * -DestinationPath "../$ZIP_FILE" -Force
Pop-Location

Write-Host "[6/6] Desplegando a AWS Lambda..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $FUNCTION_NAME `
    --zip-file "fileb://$ZIP_FILE" `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Lambda desplegada exitosamente!" -ForegroundColor Green
    Write-Host "  Función: $FUNCTION_NAME" -ForegroundColor Green
    Write-Host "  Región: $REGION" -ForegroundColor Green
    Write-Host "  Archivo: $ZIP_FILE" -ForegroundColor Green
    
    Write-Host "`n[INFO] Actualizando permisos de Lambda..." -ForegroundColor Yellow
    Write-Host "La Lambda necesita permisos para:" -ForegroundColor Yellow
    Write-Host "  - Acceder a Secrets Manager (rag-query-logs-db-credentials)" -ForegroundColor Yellow
    Write-Host "  - Listar grupos IAM de usuarios" -ForegroundColor Yellow
    
    # Limpiar archivos temporales
    Write-Host "`n[LIMPIEZA] Eliminando archivos temporales..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "package"
    
    Write-Host "`n✓ Despliegue completado!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Error desplegando Lambda" -ForegroundColor Red
    exit 1
}
