# Script mejorado para actualizar CORS en API Gateway
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"
$RESOURCE_PATH = "/kb-query"

Write-Host "=== Actualizando CORS para headers personalizados ===" -ForegroundColor Cyan

# Obtener resource ID
$resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
$resource = $resources.items | Where-Object { $_.path -eq $RESOURCE_PATH }
$RESOURCE_ID = $resource.id

Write-Host "Resource ID: $RESOURCE_ID" -ForegroundColor Green

# Actualizar integration response del método OPTIONS
Write-Host "`nActualizando OPTIONS integration response..." -ForegroundColor Yellow

$allowedHeaders = "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-name,x-user-arn,x-user-group,x-user-person,x-user-team"

aws apigateway put-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --response-parameters "{`"method.response.header.Access-Control-Allow-Headers`":`"'$allowedHeaders'`",`"method.response.header.Access-Control-Allow-Methods`":`"'GET,POST,PUT,DELETE,OPTIONS'`",`"method.response.header.Access-Control-Allow-Origin`":`"'*'`"}" `
    --region $REGION

Write-Host "OPTIONS actualizado" -ForegroundColor Green

# Actualizar integration response del método POST
Write-Host "`nActualizando POST integration response..." -ForegroundColor Yellow

aws apigateway update-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method POST `
    --status-code 200 `
    --patch-operations "op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value='*'" "op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Headers,value='$allowedHeaders'" `
    --region $REGION

Write-Host "POST actualizado" -ForegroundColor Green

# Desplegar
Write-Host "`nDesplegando..." -ForegroundColor Yellow
aws apigateway create-deployment `
    --rest-api-id $API_ID `
    --stage-name dev `
    --description "CORS fix para headers personalizados" `
    --region $REGION

Write-Host "`n=== Completado ===" -ForegroundColor Green
Write-Host "Headers permitidos: x-user-name, x-user-arn, x-user-group, x-user-person, x-user-team" -ForegroundColor Cyan
