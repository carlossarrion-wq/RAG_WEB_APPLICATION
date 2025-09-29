# Script automatizado para desplegar el sistema de gestión de documentos
# Autor: Sistema RAG Chat
# Fecha: 2025-09-29

Write-Host "🚀 DESPLEGANDO SISTEMA DE GESTIÓN DE DOCUMENTOS" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Variables
$LAMBDA_FUNCTION_NAME = "bedrock-kb-query-handler"
$ZIP_FILE = "lambda-function-20250929-090015.zip"
$REGION = "eu-west-1"

# Verificar si el archivo ZIP existe
if (-not (Test-Path $ZIP_FILE)) {
    Write-Host "❌ Error: No se encuentra el archivo $ZIP_FILE" -ForegroundColor Red
    Write-Host "   Ejecuta primero: powershell -ExecutionPolicy Bypass -File create-lambda-package.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Archivo ZIP encontrado: $ZIP_FILE" -ForegroundColor Green

# Paso 1: Verificar credenciales AWS
Write-Host "`n🔐 Verificando credenciales AWS..." -ForegroundColor Cyan
try {
    $identity = aws sts get-caller-identity --region $REGION 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Host "✅ Credenciales AWS válidas" -ForegroundColor Green
        Write-Host "   Usuario: $($identity.Arn)" -ForegroundColor Gray
    } else {
        throw "No se pudieron obtener credenciales"
    }
} catch {
    Write-Host "❌ Error: Credenciales AWS no configuradas" -ForegroundColor Red
    Write-Host "   Configura tus credenciales con: aws configure" -ForegroundColor Yellow
    exit 1
}

# Paso 2: Verificar si la función Lambda existe
Write-Host "`n🔍 Verificando función Lambda..." -ForegroundColor Cyan
try {
    $lambdaInfo = aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION 2>$null | ConvertFrom-Json
    if ($lambdaInfo) {
        Write-Host "✅ Función Lambda encontrada: $LAMBDA_FUNCTION_NAME" -ForegroundColor Green
        Write-Host "   Runtime: $($lambdaInfo.Configuration.Runtime)" -ForegroundColor Gray
        Write-Host "   Última modificación: $($lambdaInfo.Configuration.LastModified)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: Función Lambda '$LAMBDA_FUNCTION_NAME' no encontrada" -ForegroundColor Red
    Write-Host "   Crea la función primero en AWS Console" -ForegroundColor Yellow
    exit 1
}

# Paso 3: Actualizar código de la función Lambda
Write-Host "`n📤 Actualizando código de la función Lambda..." -ForegroundColor Cyan
try {
    $updateResult = aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file "fileb://$ZIP_FILE" --region $REGION | ConvertFrom-Json
    if ($updateResult) {
        Write-Host "✅ Código actualizado exitosamente" -ForegroundColor Green
        Write-Host "   Versión: $($updateResult.Version)" -ForegroundColor Gray
        Write-Host "   Tamaño: $($updateResult.CodeSize) bytes" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error actualizando función Lambda: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 4: Verificar API Gateway
Write-Host "`n🌐 Verificando API Gateway..." -ForegroundColor Cyan
try {
    $apis = aws apigateway get-rest-apis --region $REGION | ConvertFrom-Json
    $targetApi = $apis.items | Where-Object { $_.name -like "*bedrock*" -or $_.name -like "*kb*" -or $_.name -like "*query*" }
    
    if ($targetApi) {
        Write-Host "✅ API Gateway encontrado: $($targetApi.name)" -ForegroundColor Green
        Write-Host "   ID: $($targetApi.id)" -ForegroundColor Gray
        Write-Host "   Endpoint: https://$($targetApi.id).execute-api.$REGION.amazonaws.com/dev" -ForegroundColor Gray
        
        # Verificar rutas existentes
        $resources = aws apigateway get-resources --rest-api-id $targetApi.id --region $REGION | ConvertFrom-Json
        $documentRoutes = $resources.items | Where-Object { $_.path -like "*/documents*" }
        
        if ($documentRoutes) {
            Write-Host "✅ Rutas de documentos encontradas:" -ForegroundColor Green
            foreach ($route in $documentRoutes) {
                Write-Host "   - $($route.path)" -ForegroundColor Gray
            }
        } else {
            Write-Host "⚠️  ADVERTENCIA: No se encontraron rutas /documents/*" -ForegroundColor Yellow
            Write-Host "   Necesitas configurar las rutas manualmente en API Gateway" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  ADVERTENCIA: No se encontró API Gateway relacionado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Error verificando API Gateway: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Paso 5: Probar endpoint
Write-Host "`n🧪 Probando endpoint..." -ForegroundColor Cyan
$testUrl = "https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/"
try {
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -Body '{"query":"test","knowledge_base_id":"TJ8IMVJVQW"}' -ContentType "application/json" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Endpoint principal funcionando" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Endpoint principal no responde (normal si no hay rutas configuradas)" -ForegroundColor Yellow
}

# Resumen final
Write-Host "`n📋 RESUMEN DEL DESPLIEGUE" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "✅ Función Lambda actualizada" -ForegroundColor Green
Write-Host "✅ Código de gestión de documentos desplegado" -ForegroundColor Green

if ($documentRoutes) {
    Write-Host "✅ Rutas de documentos configuradas" -ForegroundColor Green
    Write-Host "`n🎉 ¡SISTEMA LISTO! Prueba la aplicación:" -ForegroundColor Green
    Write-Host "   npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Rutas de documentos pendientes de configuración" -ForegroundColor Yellow
    Write-Host "`n📝 PASOS MANUALES REQUERIDOS:" -ForegroundColor Yellow
    Write-Host "1. Ve a AWS Console → API Gateway" -ForegroundColor White
    Write-Host "2. Busca tu API y añade las rutas /documents/*" -ForegroundColor White
    Write-Host "3. Usa el archivo api-gateway-routes.json como referencia" -ForegroundColor White
    Write-Host "4. Deploy la API en el stage dev" -ForegroundColor White
}

Write-Host "`n🔗 Enlaces útiles:" -ForegroundColor Cyan
Write-Host "   - AWS Lambda Console: https://console.aws.amazon.com/lambda/home?region=$REGION#/functions/$LAMBDA_FUNCTION_NAME" -ForegroundColor Blue
Write-Host "   - API Gateway Console: https://console.aws.amazon.com/apigateway/home?region=$REGION" -ForegroundColor Blue

Write-Host "`n✨ Despliegue completado!" -ForegroundColor Green
