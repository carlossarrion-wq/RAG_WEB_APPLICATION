# Script completo para solucionar todos los problemas CORS
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"
$ResourceId = "isu8ur"
$BucketName = "naturgy-sdlc-kb"

Write-Host "🚀 Solucionando problemas CORS completos..." -ForegroundColor Green

# 1. Configurar CORS en S3
Write-Host "📦 Configurando CORS en S3 bucket: $BucketName" -ForegroundColor Cyan

$corsConfig = @"
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000", "*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
"@

$corsConfig | Out-File -FilePath "cors-config.json" -Encoding UTF8
aws s3api put-bucket-cors --bucket $BucketName --cors-configuration file://cors-config.json --region $Region

Write-Host "✅ CORS configurado en S3" -ForegroundColor Green

# 2. Eliminar y recrear método OPTIONS en API Gateway
Write-Host "🔧 Configurando método OPTIONS en API Gateway..." -ForegroundColor Cyan

# Eliminar método OPTIONS existente
aws apigateway delete-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --region $Region 2>$null

# Crear método OPTIONS
aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --authorization-type "NONE" --region $Region

# Crear integración MOCK
aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --type MOCK --region $Region --request-templates file://mock-template.json

# Crear respuesta del método OPTIONS
aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" --region $Region

# Crear respuesta de integración OPTIONS
aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method OPTIONS --status-code 200 --response-parameters "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='GET,POST,PUT,DELETE,OPTIONS',method.response.header.Access-Control-Allow-Origin='*'" --region $Region

Write-Host "✅ Método OPTIONS configurado" -ForegroundColor Green

# 3. Actualizar función Lambda con código correcto
Write-Host "🔄 Actualizando función Lambda..." -ForegroundColor Cyan

# Buscar el archivo ZIP más reciente
$zipFile = Get-ChildItem -Path "lambda-function-*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($zipFile) {
    Write-Host "📦 Usando archivo: $($zipFile.Name)" -ForegroundColor Yellow
    aws lambda update-function-code --function-name bedrock-kb-query-handler --zip-file "fileb://$($zipFile.Name)" --region $Region
    Write-Host "✅ Función Lambda actualizada" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró archivo ZIP de Lambda" -ForegroundColor Red
}

# 4. Desplegar API Gateway
Write-Host "🚀 Desplegando API Gateway..." -ForegroundColor Cyan
aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region

Write-Host "✅ API Gateway desplegado" -ForegroundColor Green

# 5. Esperar un momento para que los cambios se propaguen
Write-Host "⏳ Esperando propagación de cambios..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🎉 CONFIGURACIÓN CORS COMPLETADA!" -ForegroundColor Green
Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
Write-Host "   ✅ CORS configurado en S3 bucket: $BucketName" -ForegroundColor White
Write-Host "   ✅ Método OPTIONS configurado en API Gateway" -ForegroundColor White
Write-Host "   ✅ Función Lambda actualizada" -ForegroundColor White
Write-Host "   ✅ API Gateway desplegado" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Endpoint de documentos:" -ForegroundColor Yellow
Write-Host "   https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 Para probar, ejecuta:" -ForegroundColor Yellow
Write-Host "   node test-document-endpoint-final.cjs" -ForegroundColor Gray

# Limpiar archivos temporales
Remove-Item -Path "cors-config.json" -ErrorAction SilentlyContinue
