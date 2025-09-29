# Script para corregir CORS en API Gateway
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"

Write-Host "Corrigiendo CORS en API Gateway..." -ForegroundColor Green

# Verificar credenciales
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "Usuario: $($identity.Arn)" -ForegroundColor Green

# Obtener recursos
$resources = aws apigateway get-resources --rest-api-id $ApiId --region $Region --output json | ConvertFrom-Json

# Encontrar el recurso /documents/{knowledgeBaseId}/{dataSourceId}
$dsResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}" }

if ($dsResource) {
    Write-Host "Recurso encontrado: $($dsResource.path) (ID: $($dsResource.id))" -ForegroundColor Green
    
    # Configurar método OPTIONS con CORS correcto
    Write-Host "Configurando método OPTIONS con CORS..." -ForegroundColor Cyan
    
    # Crear método OPTIONS
    aws apigateway put-method --rest-api-id $ApiId --resource-id $dsResource.id --http-method OPTIONS --authorization-type "NONE" --region $Region --output json | Out-Null
    
    # Crear integración MOCK para OPTIONS
    aws apigateway put-integration --rest-api-id $ApiId --resource-id $dsResource.id --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $Region --output json | Out-Null
    
    # Crear respuesta del método OPTIONS con headers CORS
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $dsResource.id --http-method OPTIONS --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false' --region $Region --output json | Out-Null
    
    # Crear respuesta de integración OPTIONS con headers CORS
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $dsResource.id --http-method OPTIONS --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Headers='"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"',method.response.header.Access-Control-Allow-Methods='"'"'GET,POST,PUT,DELETE,OPTIONS'"'"',method.response.header.Access-Control-Allow-Origin='"'"'*'"'"'' --region $Region --output json | Out-Null
    
    Write-Host "Método OPTIONS configurado correctamente" -ForegroundColor Green
    
    # También actualizar los métodos GET y POST para incluir CORS headers
    Write-Host "Actualizando headers CORS para método GET..." -ForegroundColor Cyan
    
    # Actualizar respuesta del método GET
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $dsResource.id --http-method GET --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Origin=false' --region $Region --output json | Out-Null
    
    # Actualizar respuesta de integración GET
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $dsResource.id --http-method GET --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Origin='"'"'*'"'"'' --region $Region --output json | Out-Null
    
    Write-Host "Headers CORS actualizados para GET" -ForegroundColor Green
    
    # Desplegar API
    Write-Host "Desplegando API..." -ForegroundColor Yellow
    aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region --output json | Out-Null
    Write-Host "API desplegado exitosamente" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "CORS corregido exitosamente!" -ForegroundColor Green
    Write-Host "Ahora la aplicación debería poder acceder a los endpoints de documentos" -ForegroundColor Cyan
    
} else {
    Write-Host "No se encontró el recurso /documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Red
    Write-Host "Recursos disponibles:" -ForegroundColor Yellow
    foreach ($resource in $resources.items) {
        Write-Host "   $($resource.path)" -ForegroundColor Gray
    }
}
