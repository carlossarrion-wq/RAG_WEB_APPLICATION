# Script mejorado para corregir CORS en API Gateway
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"
$ResourceId = "isu8ur"

Write-Host "Corrigiendo CORS en API Gateway (versión mejorada)..." -ForegroundColor Green

# Verificar credenciales
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "Usuario: $($identity.Arn)" -ForegroundColor Green

try {
    # Eliminar método OPTIONS existente si existe
    Write-Host "Eliminando método OPTIONS existente..." -ForegroundColor Yellow
    aws apigateway delete-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --region $Region 2>$null
    
    # Crear método OPTIONS nuevo
    Write-Host "Creando método OPTIONS..." -ForegroundColor Cyan
    aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --authorization-type "NONE" --region $Region
    
    # Crear integración MOCK para OPTIONS
    Write-Host "Configurando integración MOCK..." -ForegroundColor Cyan
    aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates "{\`"application/json\`":\`"{\\\`"statusCode\\\`": 200}\`"}" --region $Region
    
    # Crear respuesta del método OPTIONS
    Write-Host "Configurando respuesta del método OPTIONS..." -ForegroundColor Cyan
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" --region $Region
    
    # Crear respuesta de integración OPTIONS
    Write-Host "Configurando respuesta de integración OPTIONS..." -ForegroundColor Cyan
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='GET,POST,PUT,DELETE,OPTIONS',method.response.header.Access-Control-Allow-Origin='*'" --region $Region
    
    # Actualizar método GET para CORS
    Write-Host "Actualizando método GET para CORS..." -ForegroundColor Cyan
    
    # Eliminar respuesta existente del método GET
    aws apigateway delete-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method GET --status-code 200 --region $Region 2>$null
    
    # Crear nueva respuesta del método GET con CORS
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method GET --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Origin=false" --region $Region
    
    # Eliminar respuesta de integración existente del método GET
    aws apigateway delete-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method GET --status-code 200 --region $Region 2>$null
    
    # Crear nueva respuesta de integración GET con CORS
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method GET --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Origin='*'" --region $Region
    
    # Desplegar API
    Write-Host "Desplegando API..." -ForegroundColor Yellow
    aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region
    
    Write-Host ""
    Write-Host "CORS configurado exitosamente!" -ForegroundColor Green
    Write-Host "Endpoint: https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
}
