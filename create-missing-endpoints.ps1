# Script para crear endpoints faltantes en API Gateway
Write-Host "Creando endpoints faltantes para eliminación de documentos..." -ForegroundColor Green

# Configuración
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"

Write-Host "API Gateway ID: $API_ID" -ForegroundColor Yellow
Write-Host "Región: $REGION" -ForegroundColor Yellow

try {
    # 1. Obtener recursos existentes
    Write-Host "`n1. Obteniendo recursos existentes..." -ForegroundColor Cyan
    $resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
    
    # Encontrar el recurso base de documentos
    $documentsResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}" }
    
    if (-not $documentsResource) {
        Write-Host "❌ No se encontró el recurso base de documentos" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Recurso base encontrado: $($documentsResource.id)" -ForegroundColor Green

    # 2. Crear recurso para documentos individuales si no existe
    Write-Host "`n2. Verificando recurso para documentos individuales..." -ForegroundColor Cyan
    $docIdResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}" }
    
    if (-not $docIdResource) {
        Write-Host "Creando recurso para documentos individuales..." -ForegroundColor Yellow
        $docIdResource = aws apigateway create-resource --rest-api-id $API_ID --parent-id $documentsResource.id --path-part "{documentId}" --region $REGION | ConvertFrom-Json
        Write-Host "✅ Recurso creado: $($docIdResource.id)" -ForegroundColor Green
    } else {
        Write-Host "✅ Recurso ya existe: $($docIdResource.id)" -ForegroundColor Green
    }

    # 3. Crear recurso batch si no existe
    Write-Host "`n3. Verificando recurso batch..." -ForegroundColor Cyan
    $batchResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}/batch" }
    
    if (-not $batchResource) {
        Write-Host "Creando recurso batch..." -ForegroundColor Yellow
        $batchResource = aws apigateway create-resource --rest-api-id $API_ID --parent-id $documentsResource.id --path-part "batch" --region $REGION | ConvertFrom-Json
        Write-Host "✅ Recurso batch creado: $($batchResource.id)" -ForegroundColor Green
    } else {
        Write-Host "✅ Recurso batch ya existe: $($batchResource.id)" -ForegroundColor Green
    }

    # 4. Crear recurso rename si no existe
    Write-Host "`n4. Verificando recurso rename..." -ForegroundColor Cyan
    $renameResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename" }
    
    if (-not $renameResource) {
        Write-Host "Creando recurso rename..." -ForegroundColor Yellow
        $renameResource = aws apigateway create-resource --rest-api-id $API_ID --parent-id $docIdResource.id --path-part "rename" --region $REGION | ConvertFrom-Json
        Write-Host "✅ Recurso rename creado: $($renameResource.id)" -ForegroundColor Green
    } else {
        Write-Host "✅ Recurso rename ya existe: $($renameResource.id)" -ForegroundColor Green
    }

    # 5. Configurar métodos para cada recurso
    Write-Host "`n5. Configurando métodos..." -ForegroundColor Cyan
    
    # Obtener integración de Lambda existente
    $existingIntegration = aws apigateway get-integration --rest-api-id $API_ID --resource-id $documentsResource.id --http-method GET --region $REGION | ConvertFrom-Json
    $lambdaUri = $existingIntegration.uri
    
    Write-Host "URI de Lambda: $lambdaUri" -ForegroundColor Yellow

    # Configurar métodos para documento individual (DELETE)
    Write-Host "`nConfigurando DELETE para documento individual..." -ForegroundColor Cyan
    
    # Verificar si el método ya existe
    try {
        aws apigateway get-method --rest-api-id $API_ID --resource-id $docIdResource.id --http-method DELETE --region $REGION 2>$null
        Write-Host "✅ Método DELETE ya existe" -ForegroundColor Green
    } catch {
        # Crear método DELETE
        aws apigateway put-method --rest-api-id $API_ID --resource-id $docIdResource.id --http-method DELETE --authorization-type NONE --region $REGION
        
        # Crear integración con Lambda
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $docIdResource.id --http-method DELETE --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        
        Write-Host "✅ Método DELETE creado" -ForegroundColor Green
    }

    # Configurar métodos para batch (DELETE)
    Write-Host "`nConfigurando DELETE para batch..." -ForegroundColor Cyan
    
    try {
        aws apigateway get-method --rest-api-id $API_ID --resource-id $batchResource.id --http-method DELETE --region $REGION 2>$null
        Write-Host "✅ Método DELETE batch ya existe" -ForegroundColor Green
    } catch {
        # Crear método DELETE para batch
        aws apigateway put-method --rest-api-id $API_ID --resource-id $batchResource.id --http-method DELETE --authorization-type NONE --region $REGION
        
        # Crear integración con Lambda
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $batchResource.id --http-method DELETE --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        
        Write-Host "✅ Método DELETE batch creado" -ForegroundColor Green
    }

    # Configurar métodos para rename (PUT)
    Write-Host "`nConfigurando PUT para rename..." -ForegroundColor Cyan
    
    try {
        aws apigateway get-method --rest-api-id $API_ID --resource-id $renameResource.id --http-method PUT --region $REGION 2>$null
        Write-Host "✅ Método PUT rename ya existe" -ForegroundColor Green
    } catch {
        # Crear método PUT para rename
        aws apigateway put-method --rest-api-id $API_ID --resource-id $renameResource.id --http-method PUT --authorization-type NONE --region $REGION
        
        # Crear integración con Lambda
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $renameResource.id --http-method PUT --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        
        Write-Host "✅ Método PUT rename creado" -ForegroundColor Green
    }

    # 6. Configurar CORS para los nuevos recursos
    Write-Host "`n6. Configurando CORS para nuevos recursos..." -ForegroundColor Cyan
    
    $newResources = @($docIdResource, $batchResource, $renameResource)
    
    foreach ($resource in $newResources) {
        Write-Host "Configurando CORS para: $($resource.pathPart)" -ForegroundColor Yellow
        
        # Crear método OPTIONS si no existe
        try {
            aws apigateway get-method --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --region $REGION 2>$null
            Write-Host "✅ OPTIONS ya existe" -ForegroundColor Green
        } catch {
            # Crear método OPTIONS
            aws apigateway put-method --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --authorization-type NONE --region $REGION
            
            # Crear integración mock
            aws apigateway put-integration --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $REGION
            
            # Configurar respuestas CORS
            aws apigateway put-method-response --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":false,\"method.response.header.Access-Control-Allow-Methods\":false,\"method.response.header.Access-Control-Allow-Origin\":false}' --region $REGION
            
            aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"\\\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\\\"\",\"method.response.header.Access-Control-Allow-Methods\":\"\\\"GET,POST,PUT,DELETE,OPTIONS\\\"\",\"method.response.header.Access-Control-Allow-Origin\":\"\\\"*\\\"\"}' --region $REGION
            
            Write-Host "✅ CORS configurado" -ForegroundColor Green
        }
    }

    # 7. Desplegar cambios
    Write-Host "`n7. Desplegando cambios..." -ForegroundColor Cyan
    $deployment = aws apigateway create-deployment --rest-api-id $API_ID --stage-name dev --description "Added missing document endpoints" --region $REGION | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cambios desplegados correctamente" -ForegroundColor Green
        Write-Host "Deployment ID: $($deployment.id)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error desplegando cambios" -ForegroundColor Red
    }

    Write-Host "`n🎉 Endpoints creados correctamente!" -ForegroundColor Green
    Write-Host "Endpoints disponibles:" -ForegroundColor Yellow
    Write-Host "- GET/POST: /documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Gray
    Write-Host "- DELETE: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}" -ForegroundColor Gray
    Write-Host "- DELETE: /documents/{knowledgeBaseId}/{dataSourceId}/batch" -ForegroundColor Gray
    Write-Host "- PUT: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error durante la creación: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
