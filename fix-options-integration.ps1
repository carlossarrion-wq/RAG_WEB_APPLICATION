# Script para arreglar la integración OPTIONS en API Gateway
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"
$ResourceId = "isu8ur"

Write-Host "Arreglando integración OPTIONS en API Gateway..." -ForegroundColor Green

try {
    # Eliminar método OPTIONS completamente
    Write-Host "Eliminando método OPTIONS existente..." -ForegroundColor Yellow
    aws apigateway delete-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --region $Region 2>$null
    
    # Crear método OPTIONS nuevo
    Write-Host "Creando método OPTIONS..." -ForegroundColor Cyan
    aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --authorization-type "NONE" --region $Region
    
    # Crear integración MOCK correcta
    Write-Host "Configurando integración MOCK..." -ForegroundColor Cyan
    aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --type MOCK --region $Region --request-templates "{\`"application/json\`":\`"{\\\`"statusCode\\\`": 200}\`"}"
    
    # Crear respuesta del método OPTIONS
    Write-Host "Configurando respuesta del método..." -ForegroundColor Cyan
    aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" --region $Region
    
    # Crear respuesta de integración OPTIONS
    Write-Host "Configurando respuesta de integración..." -ForegroundColor Cyan
    aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='GET,POST,PUT,DELETE,OPTIONS',method.response.header.Access-Control-Allow-Origin='*'" --region $Region
    
    # Desplegar API
    Write-Host "Desplegando API..." -ForegroundColor Yellow
    aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region
    
    Write-Host ""
    Write-Host "Integración OPTIONS arreglada exitosamente!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# También vamos a forzar la actualización del código Lambda
Write-Host ""
Write-Host "Forzando actualización del código Lambda..." -ForegroundColor Yellow

try {
    # Actualizar código Lambda con el archivo más reciente
    $zipFile = Get-ChildItem -Path "lambda-function-*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($zipFile) {
        Write-Host "Usando archivo: $($zipFile.Name)" -ForegroundColor Cyan
        aws lambda update-function-code --function-name bedrock-kb-query-handler --zip-file "fileb://$($zipFile.Name)" --region $Region
        Write-Host "Código Lambda actualizado" -ForegroundColor Green
    } else {
        Write-Host "No se encontró archivo ZIP de Lambda" -ForegroundColor Red
    }
} catch {
    Write-Host "Error actualizando Lambda: $($_.Exception.Message)" -ForegroundColor Red
}
