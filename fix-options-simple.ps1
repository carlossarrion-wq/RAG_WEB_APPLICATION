# Script simple para arreglar integraciones OPTIONS
Write-Host "Arreglando integraciones OPTIONS..." -ForegroundColor Green

$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"

# Recursos que necesitan arreglo
$resources = @(
    @{id="51h5zt"; name="batch"},
    @{id="dss6tx"; name="documentId"},
    @{id="x4d9xd"; name="rename"}
)

foreach ($resource in $resources) {
    Write-Host "Arreglando recurso: $($resource.name)" -ForegroundColor Yellow
    
    # Crear integración OPTIONS simple
    $result = aws apigateway put-integration --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --type MOCK --region $REGION
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Integración OPTIONS creada para $($resource.name)" -ForegroundColor Green
        
        # Crear respuesta de integración con headers CORS básicos
        $corsResult = aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Origin\":\"*\",\"method.response.header.Access-Control-Allow-Methods\":\"GET,POST,PUT,DELETE,OPTIONS\",\"method.response.header.Access-Control-Allow-Headers\":\"Content-Type,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\"}' --region $REGION
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Headers CORS configurados para $($resource.name)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Error configurando headers CORS para $($resource.name)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Error creando integración para $($resource.name)" -ForegroundColor Yellow
    }
}

# Desplegar cambios
Write-Host "`nDesplegando cambios..." -ForegroundColor Cyan
$deployment = aws apigateway create-deployment --rest-api-id $API_ID --stage-name dev --description "Fixed OPTIONS integrations" --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cambios desplegados correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error desplegando cambios" -ForegroundColor Red
}

Write-Host "`n🎉 Integraciones OPTIONS arregladas!" -ForegroundColor Green
