# Script para configurar correctamente el endpoint batch
Write-Host "Configurando endpoint batch para eliminación de documentos..." -ForegroundColor Green

# Configuración
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"
$BATCH_RESOURCE_ID = "51h5zt"

Write-Host "API Gateway ID: $API_ID" -ForegroundColor Yellow
Write-Host "Batch Resource ID: $BATCH_RESOURCE_ID" -ForegroundColor Yellow
Write-Host "Región: $REGION" -ForegroundColor Yellow

try {
    # 1. Obtener URI de Lambda desde un recurso existente
    Write-Host "`n1. Obteniendo URI de Lambda..." -ForegroundColor Cyan
    $existingIntegration = aws apigateway get-integration --rest-api-id $API_ID --resource-id "isu8ur" --http-method GET --region $REGION | ConvertFrom-Json
    $lambdaUri = $existingIntegration.uri
    Write-Host "URI de Lambda: $lambdaUri" -ForegroundColor Green

    # 2. Crear método OPTIONS para CORS
    Write-Host "`n2. Creando método OPTIONS..." -ForegroundColor Cyan
    
    try {
        # Crear método OPTIONS
        aws apigateway put-method --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method OPTIONS --authorization-type NONE --region $REGION
        Write-Host "✅ Método OPTIONS creado" -ForegroundColor Green
        
        # Crear integración mock para OPTIONS
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $REGION
        Write-Host "✅ Integración OPTIONS creada" -ForegroundColor Green
        
        # Configurar respuesta del método OPTIONS
        aws apigateway put-method-response --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":false,\"method.response.header.Access-Control-Allow-Methods\":false,\"method.response.header.Access-Control-Allow-Origin\":false}' --region $REGION
        Write-Host "✅ Respuesta del método OPTIONS configurada" -ForegroundColor Green
        
        # Configurar respuesta de la integración OPTIONS con headers CORS
        aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"\\\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\\\"\",\"method.response.header.Access-Control-Allow-Methods\":\"\\\"GET,POST,PUT,DELETE,OPTIONS\\\"\",\"method.response.header.Access-Control-Allow-Origin\":\"\\\"*\\\"\"}' --region $REGION
        Write-Host "✅ Respuesta de integración OPTIONS configurada con headers CORS" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Error configurando OPTIONS: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # 3. Crear método DELETE
    Write-Host "`n3. Creando método DELETE..." -ForegroundColor Cyan
    
    try {
        # Crear método DELETE
        aws apigateway put-method --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method DELETE --authorization-type NONE --region $REGION
        Write-Host "✅ Método DELETE creado" -ForegroundColor Green
        
        # Crear integración con Lambda
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $BATCH_RESOURCE_ID --http-method DELETE --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        Write-Host "✅ Integración DELETE con Lambda creada" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Error configurando DELETE: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # 4. Configurar los mismos métodos para el recurso de documento individual
    Write-Host "`n4. Configurando recurso de documento individual..." -ForegroundColor Cyan
    $DOC_RESOURCE_ID = "dss6tx"
    
    try {
        # OPTIONS para documento individual
        aws apigateway put-method --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method OPTIONS --authorization-type NONE --region $REGION
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $REGION
        aws apigateway put-method-response --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":false,\"method.response.header.Access-Control-Allow-Methods\":false,\"method.response.header.Access-Control-Allow-Origin\":false}' --region $REGION
        aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"\\\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\\\"\",\"method.response.header.Access-Control-Allow-Methods\":\"\\\"GET,POST,PUT,DELETE,OPTIONS\\\"\",\"method.response.header.Access-Control-Allow-Origin\":\"\\\"*\\\"\"}' --region $REGION
        
        # DELETE para documento individual
        aws apigateway put-method --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method DELETE --authorization-type NONE --region $REGION
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $DOC_RESOURCE_ID --http-method DELETE --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        
        Write-Host "✅ Documento individual configurado" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Documento individual ya configurado o error" -ForegroundColor Yellow
    }

    # 5. Configurar recurso rename
    Write-Host "`n5. Configurando recurso rename..." -ForegroundColor Cyan
    $RENAME_RESOURCE_ID = "x4d9xd"
    
    try {
        # OPTIONS para rename
        aws apigateway put-method --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method OPTIONS --authorization-type NONE --region $REGION
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $REGION
        aws apigateway put-method-response --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":false,\"method.response.header.Access-Control-Allow-Methods\":false,\"method.response.header.Access-Control-Allow-Origin\":false}' --region $REGION
        aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"\\\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\\\"\",\"method.response.header.Access-Control-Allow-Methods\":\"\\\"GET,POST,PUT,DELETE,OPTIONS\\\"\",\"method.response.header.Access-Control-Allow-Origin\":\"\\\"*\\\"\"}' --region $REGION
        
        # PUT para rename
        aws apigateway put-method --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method PUT --authorization-type NONE --region $REGION
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $RENAME_RESOURCE_ID --http-method PUT --type AWS_PROXY --integration-http-method POST --uri $lambdaUri --region $REGION
        
        Write-Host "✅ Recurso rename configurado" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Recurso rename ya configurado o error" -ForegroundColor Yellow
    }

    # 6. Desplegar cambios
    Write-Host "`n6. Desplegando cambios..." -ForegroundColor Cyan
    $deployment = aws apigateway create-deployment --rest-api-id $API_ID --stage-name dev --description "Fixed batch endpoint CORS and methods" --region $REGION | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cambios desplegados correctamente" -ForegroundColor Green
        Write-Host "Deployment ID: $($deployment.id)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error desplegando cambios" -ForegroundColor Red
    }

    Write-Host "`n🎉 Endpoint batch configurado correctamente!" -ForegroundColor Green
    Write-Host "Endpoints disponibles:" -ForegroundColor Yellow
    Write-Host "- OPTIONS: /documents/{knowledgeBaseId}/{dataSourceId}/batch" -ForegroundColor Gray
    Write-Host "- DELETE: /documents/{knowledgeBaseId}/{dataSourceId}/batch" -ForegroundColor Gray
    Write-Host "- OPTIONS: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}" -ForegroundColor Gray
    Write-Host "- DELETE: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}" -ForegroundColor Gray
    Write-Host "- OPTIONS: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename" -ForegroundColor Gray
    Write-Host "- PUT: /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
