# Script simplificado para configurar rutas de API Gateway
$ApiId = "zwxrsuw8o9"
$Region = "eu-west-1"

Write-Host "🔧 Configurando rutas de API Gateway..." -ForegroundColor Green

# Verificar credenciales
Write-Host "🔐 Verificando credenciales..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
if (-not $identity) {
    Write-Host "❌ Error: Credenciales AWS no válidas" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Usuario: $($identity.Arn)" -ForegroundColor Green

# Obtener recursos
Write-Host "📂 Obteniendo recursos..." -ForegroundColor Yellow
$resources = aws apigateway get-resources --rest-api-id $ApiId --region $Region --output json | ConvertFrom-Json
$rootResource = $resources.items | Where-Object { $_.path -eq "/" }

Write-Host "📁 Recursos existentes:" -ForegroundColor Cyan
foreach ($resource in $resources.items) {
    Write-Host "   $($resource.path) (ID: $($resource.id))" -ForegroundColor Gray
}

# Crear recurso /documents si no existe
$documentsResource = $resources.items | Where-Object { $_.path -eq "/documents" }
if (-not $documentsResource) {
    Write-Host "🔨 Creando recurso /documents..." -ForegroundColor Cyan
    $documentsResource = aws apigateway create-resource --rest-api-id $ApiId --parent-id $rootResource.id --path-part "documents" --region $Region --output json | ConvertFrom-Json
    Write-Host "✅ Recurso /documents creado (ID: $($documentsResource.id))" -ForegroundColor Green
} else {
    Write-Host "✅ Recurso /documents ya existe (ID: $($documentsResource.id))" -ForegroundColor Green
}

# Crear recurso /documents/{knowledgeBaseId}
$kbResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}" }
if (-not $kbResource) {
    Write-Host "🔨 Creando recurso /documents/{knowledgeBaseId}..." -ForegroundColor Cyan
    $kbResource = aws apigateway create-resource --rest-api-id $ApiId --parent-id $documentsResource.id --path-part "{knowledgeBaseId}" --region $Region --output json | ConvertFrom-Json
    Write-Host "✅ Recurso /documents/{knowledgeBaseId} creado (ID: $($kbResource.id))" -ForegroundColor Green
} else {
    Write-Host "✅ Recurso /documents/{knowledgeBaseId} ya existe (ID: $($kbResource.id))" -ForegroundColor Green
}

# Crear recurso /documents/{knowledgeBaseId}/{dataSourceId}
$dsResource = $resources.items | Where-Object { $_.path -eq "/documents/{knowledgeBaseId}/{dataSourceId}" }
if (-not $dsResource) {
    Write-Host "🔨 Creando recurso /documents/{knowledgeBaseId}/{dataSourceId}..." -ForegroundColor Cyan
    $dsResource = aws apigateway create-resource --rest-api-id $ApiId --parent-id $kbResource.id --path-part "{dataSourceId}" --region $Region --output json | ConvertFrom-Json
    Write-Host "✅ Recurso /documents/{knowledgeBaseId}/{dataSourceId} creado (ID: $($dsResource.id))" -ForegroundColor Green
} else {
    Write-Host "✅ Recurso /documents/{knowledgeBaseId}/{dataSourceId} ya existe (ID: $($dsResource.id))" -ForegroundColor Green
}

# Función para crear método
function Add-Method {
    param($ResourceId, $Method, $Path)
    
    Write-Host "🔧 Configurando método $Method para $Path..." -ForegroundColor Cyan
    
    # Crear método
    aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method $Method --authorization-type "NONE" --region $Region --output json | Out-Null
    
    # Crear integración
    $lambdaArn = "arn:aws:lambda:${Region}:$($identity.Account):function:bedrock-kb-query-handler"
    $integrationUri = "arn:aws:apigateway:${Region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations"
    aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method $Method --type AWS_PROXY --integration-http-method POST --uri $integrationUri --region $Region --output json | Out-Null
    
    Write-Host "✅ Método $Method configurado para $Path" -ForegroundColor Green
}

# Configurar métodos para el recurso principal de documentos
Add-Method -ResourceId $dsResource.id -Method "GET" -Path "/documents/{knowledgeBaseId}/{dataSourceId}"
Add-Method -ResourceId $dsResource.id -Method "POST" -Path "/documents/{knowledgeBaseId}/{dataSourceId}"
Add-Method -ResourceId $dsResource.id -Method "OPTIONS" -Path "/documents/{knowledgeBaseId}/{dataSourceId}"

# Desplegar API
Write-Host "🚀 Desplegando API..." -ForegroundColor Yellow
aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region --output json | Out-Null
Write-Host "✅ API desplegado exitosamente" -ForegroundColor Green

Write-Host "`n🎉 Configuración completada!" -ForegroundColor Green
Write-Host "📍 URL: https://$ApiId.execute-api.$Region.amazonaws.com/dev" -ForegroundColor Cyan
Write-Host "📄 Endpoint configurado: GET /documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Cyan
