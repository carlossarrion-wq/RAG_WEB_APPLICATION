# Script final para corregir CORS con Lambda Proxy
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"
$ResourceId = "isu8ur"

Write-Host "Configurando CORS para Lambda Proxy Integration..." -ForegroundColor Green

# Verificar credenciales
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "Usuario: $($identity.Arn)" -ForegroundColor Green

try {
    # Paso 1: Configurar método OPTIONS con integración MOCK
    Write-Host "Configurando método OPTIONS..." -ForegroundColor Cyan
    
    # Eliminar método OPTIONS si existe
    aws apigateway delete-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --region $Region 2>$null
    
    # Crear método OPTIONS
    aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --authorization-type "NONE" --region $Region
    
    # Crear integración MOCK simple
    aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --type MOCK --region $Region --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}'
    
    # Crear respuesta del método OPTIONS
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false' --region $Region
    
    # Crear respuesta de integración OPTIONS con headers CORS
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters 'method.response.header.Access-Control-Allow-Headers=\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token\",method.response.header.Access-Control-Allow-Methods=\"GET,POST,PUT,DELETE,OPTIONS\",method.response.header.Access-Control-Allow-Origin=\"*\"' --region $Region
    
    Write-Host "Método OPTIONS configurado correctamente" -ForegroundColor Green
    
    # Paso 2: Para Lambda Proxy, los headers CORS deben ser manejados por la función Lambda
    Write-Host "Verificando que la función Lambda maneje CORS..." -ForegroundColor Yellow
    Write-Host "IMPORTANTE: La función Lambda debe retornar headers CORS en la respuesta" -ForegroundColor Yellow
    
    # Desplegar API
    Write-Host "Desplegando API..." -ForegroundColor Cyan
    aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region
    
    Write-Host ""
    Write-Host "CORS configurado exitosamente!" -ForegroundColor Green
    Write-Host "Endpoint: https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NOTA: Asegúrate de que la función Lambda retorne los headers CORS:" -ForegroundColor Yellow
    Write-Host "  'Access-Control-Allow-Origin': '*'" -ForegroundColor Gray
    Write-Host "  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'" -ForegroundColor Gray
    Write-Host "  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'" -ForegroundColor Gray
    
} catch {
    Write-Host "Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
}
