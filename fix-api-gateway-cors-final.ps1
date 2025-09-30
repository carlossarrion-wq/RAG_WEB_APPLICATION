# Script para configurar CORS correctamente en API Gateway
Write-Host "Configurando CORS en API Gateway..." -ForegroundColor Green

# Configuración
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"

Write-Host "API Gateway ID: $API_ID" -ForegroundColor Yellow
Write-Host "Región: $REGION" -ForegroundColor Yellow

try {
    # 1. Obtener información de la API
    Write-Host "`n1. Obteniendo información de la API..." -ForegroundColor Cyan
    $apiInfo = aws apigatewayv2 get-api --api-id $API_ID --region $REGION | ConvertFrom-Json
    Write-Host "API Name: $($apiInfo.Name)" -ForegroundColor Green
    Write-Host "Protocol: $($apiInfo.ProtocolType)" -ForegroundColor Green

    # 2. Listar rutas existentes
    Write-Host "`n2. Listando rutas existentes..." -ForegroundColor Cyan
    $routes = aws apigatewayv2 get-routes --api-id $API_ID --region $REGION | ConvertFrom-Json
    
    foreach ($route in $routes.Items) {
        Write-Host "Ruta: $($route.RouteKey) - ID: $($route.RouteId)" -ForegroundColor Yellow
    }

    # 3. Configurar CORS para cada ruta que no sea OPTIONS
    Write-Host "`n3. Configurando CORS..." -ForegroundColor Cyan
    
    # Configurar CORS a nivel de API
    Write-Host "Configurando CORS a nivel de API..." -ForegroundColor Yellow
    
    $corsConfig = @{
        AllowCredentials = $false
        AllowHeaders = @(
            "Content-Type",
            "X-Amz-Date", 
            "Authorization",
            "X-Api-Key",
            "X-Amz-Security-Token",
            "X-AWS-Access-Key-Id",
            "X-AWS-Secret-Access-Key", 
            "X-AWS-Session-Token"
        )
        AllowMethods = @("GET", "POST", "PUT", "DELETE", "OPTIONS")
        AllowOrigins = @("*")
        ExposeHeaders = @()
        MaxAge = 300
    } | ConvertTo-Json -Depth 3

    # Actualizar configuración CORS de la API
    $corsResult = aws apigatewayv2 update-api --api-id $API_ID --region $REGION --cors-configuration $corsConfig
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CORS configurado correctamente a nivel de API" -ForegroundColor Green
    } else {
        Write-Host "❌ Error configurando CORS a nivel de API" -ForegroundColor Red
    }

    # 4. Crear rutas OPTIONS si no existen
    Write-Host "`n4. Verificando rutas OPTIONS..." -ForegroundColor Cyan
    
    $optionsRoutes = @(
        "OPTIONS /documents/{knowledgeBaseId}/{dataSourceId}",
        "OPTIONS /documents/{knowledgeBaseId}/{dataSourceId}/batch",
        "OPTIONS /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}",
        "OPTIONS /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename"
    )

    foreach ($optionsRoute in $optionsRoutes) {
        $existingRoute = $routes.Items | Where-Object { $_.RouteKey -eq $optionsRoute }
        
        if (-not $existingRoute) {
            Write-Host "Creando ruta: $optionsRoute" -ForegroundColor Yellow
            
            try {
                $newRoute = aws apigatewayv2 create-route --api-id $API_ID --region $REGION --route-key $optionsRoute --target "integrations/mock" | ConvertFrom-Json
                Write-Host "✅ Ruta OPTIONS creada: $($newRoute.RouteId)" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ No se pudo crear la ruta OPTIONS: $optionsRoute" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✅ Ruta OPTIONS ya existe: $optionsRoute" -ForegroundColor Green
        }
    }

    # 5. Desplegar cambios
    Write-Host "`n5. Desplegando cambios..." -ForegroundColor Cyan
    $deployment = aws apigatewayv2 create-deployment --api-id $API_ID --region $REGION --stage-name dev | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cambios desplegados correctamente" -ForegroundColor Green
        Write-Host "Deployment ID: $($deployment.DeploymentId)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error desplegando cambios" -ForegroundColor Red
    }

    Write-Host "`n🎉 Configuración CORS completada!" -ForegroundColor Green
    Write-Host "Espera unos minutos para que los cambios se propaguen." -ForegroundColor Yellow
    Write-Host "Luego prueba la eliminación de documentos nuevamente." -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifica que tienes permisos para modificar API Gateway" -ForegroundColor Yellow
}

Write-Host "`nPresiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
