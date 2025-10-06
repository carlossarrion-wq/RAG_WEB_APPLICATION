# Script final para actualizar CORS usando archivo JSON
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"
$RESOURCE_PATH = "/kb-query"

Write-Host "=== Actualizando CORS ===" -ForegroundColor Cyan

# Obtener resource ID
$resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
$resource = $resources.items | Where-Object { $_.path -eq $RESOURCE_PATH }
$RESOURCE_ID = $resource.id

Write-Host "Resource ID: $RESOURCE_ID" -ForegroundColor Green

# Actualizar OPTIONS
Write-Host "`nActualizando OPTIONS..." -ForegroundColor Yellow
aws apigateway put-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --response-parameters file://cors-response-params.json `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "OPTIONS actualizado correctamente" -ForegroundColor Green
} else {
    Write-Host "Error actualizando OPTIONS" -ForegroundColor Red
}

# Desplegar
Write-Host "`nDesplegando..." -ForegroundColor Yellow
aws apigateway create-deployment `
    --rest-api-id $API_ID `
    --stage-name dev `
    --description "CORS fix con headers personalizados" `
    --region $REGION

Write-Host "`n=== Completado ===" -ForegroundColor Green
Write-Host "Por favor, recarga la página y prueba de nuevo" -ForegroundColor Cyan
