# Script para configurar API Gateway con las rutas de documentos
param(
    [string]$ApiId = "zwxrsuw8o9",
    [string]$Region = "eu-west-1",
    [string]$LambdaFunctionName = "bedrock-kb-query-handler"
)

Write-Host "🔧 Configurando API Gateway para gestión de documentos..." -ForegroundColor Green
Write-Host "📍 API ID: $ApiId" -ForegroundColor Cyan
Write-Host "🌍 Region: $Region" -ForegroundColor Cyan

# Verificar credenciales AWS
Write-Host "`n🔐 Verificando credenciales AWS..." -ForegroundColor Yellow
$identity = $null
try {
    $identityJson = aws sts get-caller-identity --output json
    $identity = $identityJson | ConvertFrom-Json
    Write-Host "✅ Credenciales válidas" -ForegroundColor Green
    Write-Host "👤 Usuario: $($identity.Arn)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error: Credenciales AWS no válidas" -ForegroundColor Red
    exit 1
}

# Obtener información del API Gateway
Write-Host "`n📋 Obteniendo información del API Gateway..." -ForegroundColor Yellow
$api = $null
try {
    $apiJson = aws apigateway get-rest-api --rest-api-id $ApiId --region $Region --output json
    $api = $apiJson | ConvertFrom-Json
    Write-Host "✅ API encontrado: $($api.name)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: No se pudo encontrar el API Gateway" -ForegroundColor Red
    exit 1
}

# Obtener recursos existentes
Write-Host "`n📂 Obteniendo recursos existentes..." -ForegroundColor Yellow
$resources = $null
try {
    $resourcesJson = aws apigateway get-resources --rest-api-id $ApiId --region $Region --output json
    $resources = $resourcesJson | ConvertFrom-Json
    Write-Host "✅ Recursos obtenidos: $($resources.items.Count) recursos encontrados" -ForegroundColor Green
    
    # Mostrar recursos existentes
    foreach ($resource in $resources.items) {
        Write-Host "   📁 $($resource.path) (ID: $($resource.id))" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ Error: No se pudieron obtener los recursos" -ForegroundColor Red
    exit 1
}

# Buscar el recurso raíz
$rootResource = $resources.items | Where-Object { $_.path -eq "/" }
if (-not $rootResource) {
    Write-Host "❌ Error: No se encontró el recurso raíz" -ForegroundColor Red
    exit 1
}

Write-Host "`n🏗️ Creando estructura de recursos para documentos..." -ForegroundColor Yellow

# Función para crear un recurso si no existe
function Create-ResourceIfNotExists {
    param(
        [string]$ParentId,
        [string]$PathPart,
        [string]$FullPath
    )
    
    # Verificar si el recurso ya existe
    $existingResource = $resources.items | Where-Object { $_.path -eq $FullPath }
    if ($existingResource) {
        Write-Host "   ✅ Recurso ya existe: $FullPath (ID: $($existingResource.id))" -ForegroundColor Green
        return $existingResource.id
    }
    
    # Crear el recurso
    try {
        Write-Host "   🔨 Creando recurso: $FullPath" -ForegroundColor Cyan
        $newResource = aws apigateway create-resource --rest-api-id $ApiId --parent-id $ParentId --path-part $PathPart --region $Region --output json | ConvertFrom-Json
        Write-Host "   ✅ Recurso creado: $FullPath (ID: $($newResource.id))" -ForegroundColor Green
        return $newResource.id
    } catch {
        Write-Host "   ❌ Error creando recurso $FullPath : $_" -ForegroundColor Red
        return $null
    }
}

# Función para crear un método si no existe
function Create-MethodIfNotExists {
    param(
        [string]$ResourceId,
        [string]$HttpMethod,
        [string]$ResourcePath
    )
    
    try {
        # Verificar si el método ya existe
        $existingMethod = aws apigateway get-method --rest-api-id $ApiId --resource-id $ResourceId --http-method $HttpMethod --region $Region --output json 2>$null | ConvertFrom-Json
        if ($existingMethod) {
            Write-Host "   ✅ Método ya existe: $HttpMethod $ResourcePath" -ForegroundColor Green
            return $true
        }
    } catch {
        # El método no existe, continuamos para crearlo
    }
    
    try {
        Write-Host "   🔨 Creando método: $HttpMethod $ResourcePath" -ForegroundColor Cyan
        
        # Crear el método
        aws apigateway put-method --rest-api-id $ApiId --resource-id $ResourceId --http-method $HttpMethod --authorization-type "NONE" --region $Region --output json | Out-Null
        
        # Obtener ARN de la función Lambda
        $lambdaArn = "arn:aws:lambda:${Region}:$($identity.Account):function:${LambdaFunctionName}"
        $integrationUri = "arn:aws:apigateway:${Region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations"
        
        # Crear la integración
        aws apigateway put-integration --rest-api-id $ApiId --resource-id $ResourceId --http-method $HttpMethod --type AWS_PROXY --integration-http-method POST --uri $integrationUri --region $Region --output json | Out-Null
        
        # Crear respuesta del método
        aws apigateway put-method-response --rest-api-id $ApiId --resource-id $ResourceId --http-method $HttpMethod --status-code 200 --region $Region --output json | Out-Null
        
        # Crear respuesta de integración
        aws apigateway put-integration-response --rest-api-id $ApiId --resource-id $ResourceId --http-method $HttpMethod --status-code 200 --region $Region --output json | Out-Null
        
        Write-Host "   ✅ Método creado: $HttpMethod $ResourcePath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   ❌ Error creando método $HttpMethod $ResourcePath : $_" -ForegroundColor Red
        return $false
    }
}

# Crear estructura de recursos
# /documents
$documentsResourceId = Create-ResourceIfNotExists -ParentId $rootResource.id -PathPart "documents" -FullPath "/documents"
if (-not $documentsResourceId) { exit 1 }

# /documents/{knowledgeBaseId}
$kbResourceId = Create-ResourceIfNotExists -ParentId $documentsResourceId -PathPart "{knowledgeBaseId}" -FullPath "/documents/{knowledgeBaseId}"
if (-not $kbResourceId) { exit 1 }

# /documents/{knowledgeBaseId}/{dataSourceId}
$dsResourceId = Create-ResourceIfNotExists -ParentId $kbResourceId -PathPart "{dataSourceId}" -FullPath "/documents/{knowledgeBaseId}/{dataSourceId}"
if (-not $dsResourceId) { exit 1 }

# /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}
$docResourceId = Create-ResourceIfNotExists -ParentId $dsResourceId -PathPart "{documentId}" -FullPath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}"
if (-not $docResourceId) { exit 1 }

# /documents/{knowledgeBaseId}/{dataSourceId}/batch
$batchResourceId = Create-ResourceIfNotExists -ParentId $dsResourceId -PathPart "batch" -FullPath "/documents/{knowledgeBaseId}/{dataSourceId}/batch"
if (-not $batchResourceId) { exit 1 }

# /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename
$renameResourceId = Create-ResourceIfNotExists -ParentId $docResourceId -PathPart "rename" -FullPath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename"
if (-not $renameResourceId) { exit 1 }

Write-Host "`n🔧 Configurando métodos HTTP..." -ForegroundColor Yellow

# Configurar métodos para /documents/{knowledgeBaseId}/{dataSourceId}
Create-MethodIfNotExists -ResourceId $dsResourceId -HttpMethod "GET" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}"
Create-MethodIfNotExists -ResourceId $dsResourceId -HttpMethod "POST" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}"
Create-MethodIfNotExists -ResourceId $dsResourceId -HttpMethod "OPTIONS" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}"

# Configurar métodos para /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}
Create-MethodIfNotExists -ResourceId $docResourceId -HttpMethod "DELETE" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}"
Create-MethodIfNotExists -ResourceId $docResourceId -HttpMethod "OPTIONS" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}"

# Configurar métodos para /documents/{knowledgeBaseId}/{dataSourceId}/batch
Create-MethodIfNotExists -ResourceId $batchResourceId -HttpMethod "DELETE" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/batch"
Create-MethodIfNotExists -ResourceId $batchResourceId -HttpMethod "OPTIONS" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/batch"

# Configurar métodos para /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename
Create-MethodIfNotExists -ResourceId $renameResourceId -HttpMethod "PUT" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename"
Create-MethodIfNotExists -ResourceId $renameResourceId -HttpMethod "OPTIONS" -ResourcePath "/documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename"

Write-Host "`n🚀 Desplegando API..." -ForegroundColor Yellow
try {
    aws apigateway create-deployment --rest-api-id $ApiId --stage-name dev --region $Region --output json | Out-Null
    Write-Host "✅ API desplegado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error desplegando API: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Configuración completada!" -ForegroundColor Green
Write-Host "📍 URL del API: https://$ApiId.execute-api.$Region.amazonaws.com/dev" -ForegroundColor Cyan
Write-Host "📄 Endpoints de documentos configurados:" -ForegroundColor Cyan
Write-Host "   GET    /documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Gray
Write-Host "   POST   /documents/{knowledgeBaseId}/{dataSourceId}" -ForegroundColor Gray
Write-Host "   DELETE /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}" -ForegroundColor Gray
Write-Host "   DELETE /documents/{knowledgeBaseId}/{dataSourceId}/batch" -ForegroundColor Gray
Write-Host "   PUT    /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename" -ForegroundColor Gray

Write-Host "`n✨ ¡Ahora puedes probar la funcionalidad de documentos en tu aplicación!" -ForegroundColor Green
