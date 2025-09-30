# Script simplificado para desplegar el sistema de documentos
Write-Host "Desplegando sistema de gestion de documentos..." -ForegroundColor Green

$LAMBDA_FUNCTION_NAME = "bedrock-kb-query-handler"
$ZIP_FILE = "lambda-function-20250930-165902.zip"
$REGION = "eu-west-1"

# Verificar archivo ZIP
if (-not (Test-Path $ZIP_FILE)) {
    Write-Host "Error: No se encuentra $ZIP_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo ZIP encontrado: $ZIP_FILE" -ForegroundColor Green

# Verificar credenciales AWS
Write-Host "Verificando credenciales AWS..." -ForegroundColor Cyan
try {
    $identity = aws sts get-caller-identity --region $REGION 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Host "Credenciales AWS validas" -ForegroundColor Green
        Write-Host "Usuario: $($identity.Arn)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: Credenciales AWS no configuradas" -ForegroundColor Red
    Write-Host "Ejecuta: aws configure" -ForegroundColor Yellow
    exit 1
}

# Verificar funcion Lambda
Write-Host "Verificando funcion Lambda..." -ForegroundColor Cyan
try {
    $lambdaInfo = aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION 2>$null | ConvertFrom-Json
    if ($lambdaInfo) {
        Write-Host "Funcion Lambda encontrada: $LAMBDA_FUNCTION_NAME" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: Funcion Lambda no encontrada" -ForegroundColor Red
    exit 1
}

# Actualizar codigo Lambda
Write-Host "Actualizando codigo Lambda..." -ForegroundColor Cyan
try {
    $updateResult = aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file "fileb://$ZIP_FILE" --region $REGION | ConvertFrom-Json
    if ($updateResult) {
        Write-Host "Codigo actualizado exitosamente" -ForegroundColor Green
        Write-Host "Version: $($updateResult.Version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error actualizando Lambda" -ForegroundColor Red
    exit 1
}

# Verificar API Gateway
Write-Host "Verificando API Gateway..." -ForegroundColor Cyan
try {
    $apis = aws apigateway get-rest-apis --region $REGION | ConvertFrom-Json
    $targetApi = $apis.items | Where-Object { $_.name -like "*bedrock*" -or $_.name -like "*kb*" -or $_.name -like "*query*" }
    
    if ($targetApi) {
        Write-Host "API Gateway encontrado: $($targetApi.name)" -ForegroundColor Green
        Write-Host "ID: $($targetApi.id)" -ForegroundColor Gray
        
        # Verificar rutas
        $resources = aws apigateway get-resources --rest-api-id $targetApi.id --region $REGION | ConvertFrom-Json
        $documentRoutes = $resources.items | Where-Object { $_.path -like "*/documents*" }
        
        if ($documentRoutes) {
            Write-Host "Rutas de documentos encontradas:" -ForegroundColor Green
            foreach ($route in $documentRoutes) {
                Write-Host "- $($route.path)" -ForegroundColor Gray
            }
            $routesConfigured = $true
        } else {
            Write-Host "ADVERTENCIA: No se encontraron rutas /documents/*" -ForegroundColor Yellow
            $routesConfigured = $false
        }
    }
} catch {
    Write-Host "Error verificando API Gateway" -ForegroundColor Yellow
    $routesConfigured = $false
}

# Resumen
Write-Host "`nRESUMEN:" -ForegroundColor Green
Write-Host "- Funcion Lambda actualizada" -ForegroundColor Green
Write-Host "- Codigo de documentos desplegado" -ForegroundColor Green

if ($routesConfigured) {
    Write-Host "- Rutas configuradas correctamente" -ForegroundColor Green
    Write-Host "`nSISTEMA LISTO! Ejecuta: npm run dev" -ForegroundColor Green
} else {
    Write-Host "- Rutas pendientes de configuracion" -ForegroundColor Yellow
    Write-Host "`nPASOS MANUALES:" -ForegroundColor Yellow
    Write-Host "1. Ve a AWS Console - API Gateway" -ForegroundColor White
    Write-Host "2. Busca tu API y anade rutas /documents/*" -ForegroundColor White
    Write-Host "3. Usa api-gateway-routes.json como referencia" -ForegroundColor White
    Write-Host "4. Deploy la API en stage dev" -ForegroundColor White
}

Write-Host "`nDespliegue completado!" -ForegroundColor Green
