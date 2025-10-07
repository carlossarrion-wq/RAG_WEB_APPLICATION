# Script para anadir x-conversation-id a los headers CORS permitidos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ACTUALIZAR CORS - ANADIR x-conversation-id" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"
$STAGE = "dev"

Write-Host "[1/4] Obteniendo recursos del API Gateway..." -ForegroundColor Yellow

$resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
$kbQueryResource = $resources.items | Where-Object { $_.path -eq "/kb-query" }

if (-not $kbQueryResource) {
    Write-Host "Error: No se encontro el recurso /kb-query" -ForegroundColor Red
    exit 1
}

$RESOURCE_ID = $kbQueryResource.id
Write-Host "  Resource ID encontrado: $RESOURCE_ID" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] Creando archivo de configuracion temporal..." -ForegroundColor Yellow

$patchOps = @'
[
  {
    "op": "replace",
    "path": "/responseParameters/method.response.header.Access-Control-Allow-Headers",
    "value": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-name,x-user-arn,x-user-group,x-user-person,x-user-team,x-conversation-id'"
  }
]
'@

$patchOps | Out-File -FilePath "temp-patch-ops.json" -Encoding utf8
Write-Host "  Archivo temporal creado" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Actualizando metodo OPTIONS..." -ForegroundColor Yellow

aws apigateway update-method-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --patch-operations file://temp-patch-ops.json `
    --region $REGION

Write-Host "  Metodo OPTIONS actualizado" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Actualizando integracion OPTIONS..." -ForegroundColor Yellow

aws apigateway update-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --patch-operations file://temp-patch-ops.json `
    --region $REGION

Write-Host "  Integracion OPTIONS actualizada" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Desplegando cambios..." -ForegroundColor Yellow

aws apigateway create-deployment `
    --rest-api-id $API_ID `
    --stage-name $STAGE `
    --region $REGION

Write-Host "  Cambios desplegados" -ForegroundColor Green

Remove-Item "temp-patch-ops.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "CORS ACTUALIZADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "El header x-conversation-id ahora esta permitido en CORS" -ForegroundColor Cyan
Write-Host "Puedes probar la aplicacion nuevamente" -ForegroundColor Cyan
Write-Host ""
