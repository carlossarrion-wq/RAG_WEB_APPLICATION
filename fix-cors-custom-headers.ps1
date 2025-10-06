# Script para actualizar CORS en API Gateway permitiendo headers personalizados
# Permite los nuevos headers: x-user-name, x-user-arn, x-user-group, x-user-person, x-user-team

$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"
$RESOURCE_PATH = "/kb-query"

Write-Host "=== Actualizando configuración CORS para permitir headers personalizados ===" -ForegroundColor Cyan

# Obtener el ID del recurso
Write-Host "`nObteniendo ID del recurso $RESOURCE_PATH..." -ForegroundColor Yellow
$resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
$resource = $resources.items | Where-Object { $_.path -eq $RESOURCE_PATH }

if (-not $resource) {
    Write-Host "Error: No se encontró el recurso $RESOURCE_PATH" -ForegroundColor Red
    exit 1
}

$RESOURCE_ID = $resource.id
Write-Host "Resource ID encontrado: $RESOURCE_ID" -ForegroundColor Green

# Actualizar el método OPTIONS para incluir los nuevos headers
Write-Host "`nActualizando método OPTIONS..." -ForegroundColor Yellow

# Primero, obtener la configuración actual del método OPTIONS
$optionsMethod = aws apigateway get-method `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --region $REGION 2>$null | ConvertFrom-Json

if ($optionsMethod) {
    Write-Host "Método OPTIONS encontrado, actualizando..." -ForegroundColor Yellow
    
    # Actualizar la respuesta del método OPTIONS para incluir los nuevos headers
    aws apigateway put-method-response `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --status-code 200 `
        --response-parameters '{
            "method.response.header.Access-Control-Allow-Headers": false,
            "method.response.header.Access-Control-Allow-Methods": false,
            "method.response.header.Access-Control-Allow-Origin": false
        }' `
        --region $REGION | Out-Null
    
    # Actualizar la integración response para incluir los headers personalizados
    aws apigateway put-integration-response `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --status-code 200 `
        --response-parameters '{
            "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-name,x-user-arn,x-user-group,x-user-person,x-user-team'"'"'",
            "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'",
            "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"
        }' `
        --region $REGION | Out-Null
    
    Write-Host "Método OPTIONS actualizado correctamente" -ForegroundColor Green
} else {
    Write-Host "Método OPTIONS no encontrado, creándolo..." -ForegroundColor Yellow
    
    # Crear método OPTIONS
    aws apigateway put-method `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --authorization-type NONE `
        --region $REGION | Out-Null
    
    # Crear method response
    aws apigateway put-method-response `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --status-code 200 `
        --response-parameters '{
            "method.response.header.Access-Control-Allow-Headers": false,
            "method.response.header.Access-Control-Allow-Methods": false,
            "method.response.header.Access-Control-Allow-Origin": false
        }' `
        --region $REGION | Out-Null
    
    # Crear integración MOCK
    aws apigateway put-integration `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --type MOCK `
        --request-templates '{"application/json": "{\"statusCode\": 200}"}' `
        --region $REGION | Out-Null
    
    # Crear integration response
    aws apigateway put-integration-response `
        --rest-api-id $API_ID `
        --resource-id $RESOURCE_ID `
        --http-method OPTIONS `
        --status-code 200 `
        --response-parameters '{
            "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-name,x-user-arn,x-user-group,x-user-person,x-user-team'"'"'",
            "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'",
            "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"
        }' `
        --region $REGION | Out-Null
    
    Write-Host "Método OPTIONS creado correctamente" -ForegroundColor Green
}

# Actualizar el método POST para incluir los headers CORS en la respuesta
Write-Host "`nActualizando método POST..." -ForegroundColor Yellow

# Actualizar method response del POST
aws apigateway put-method-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method POST `
    --status-code 200 `
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": false,
        "method.response.header.Access-Control-Allow-Headers": false
    }' `
    --region $REGION 2>$null | Out-Null

# Actualizar integration response del POST
aws apigateway update-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method POST `
    --status-code 200 `
    --patch-operations '[
        {
            "op": "replace",
            "path": "/responseParameters/method.response.header.Access-Control-Allow-Origin",
            "value": "'"'"'*'"'"'"
        },
        {
            "op": "add",
            "path": "/responseParameters/method.response.header.Access-Control-Allow-Headers",
            "value": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-name,x-user-arn,x-user-group,x-user-person,x-user-team'"'"'"
        }
    ]' `
    --region $REGION 2>$null | Out-Null

Write-Host "Método POST actualizado correctamente" -ForegroundColor Green

# Desplegar los cambios
Write-Host "`nDesplegando cambios en stage 'dev'..." -ForegroundColor Yellow
aws apigateway create-deployment `
    --rest-api-id $API_ID `
    --stage-name dev `
    --description "Actualización CORS para permitir headers personalizados de usuario" `
    --region $REGION | Out-Null

Write-Host "`n=== Configuración CORS actualizada correctamente ===" -ForegroundColor Green
Write-Host "Los siguientes headers personalizados ahora están permitidos:" -ForegroundColor Cyan
Write-Host "  - x-user-name" -ForegroundColor White
Write-Host "  - x-user-arn" -ForegroundColor White
Write-Host "  - x-user-group" -ForegroundColor White
Write-Host "  - x-user-person" -ForegroundColor White
Write-Host "  - x-user-team" -ForegroundColor White
Write-Host "`nPor favor, recarga la página y vuelve a intentar la consulta." -ForegroundColor Yellow
