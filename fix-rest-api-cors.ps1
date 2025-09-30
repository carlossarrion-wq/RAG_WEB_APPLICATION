# Script para configurar CORS en API Gateway REST
Write-Host "Configurando CORS en API Gateway REST..." -ForegroundColor Green

# Configuración
$API_ID = "zwxrsuw8o9"
$REGION = "eu-west-1"

Write-Host "API Gateway ID: $API_ID" -ForegroundColor Yellow
Write-Host "Región: $REGION" -ForegroundColor Yellow

try {
    # 1. Obtener información de la API
    Write-Host "`n1. Obteniendo información de la API..." -ForegroundColor Cyan
    $apiInfo = aws apigateway get-rest-api --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
    Write-Host "API Name: $($apiInfo.name)" -ForegroundColor Green
    Write-Host "Root Resource ID: $($apiInfo.rootResourceId)" -ForegroundColor Green

    # 2. Listar recursos existentes
    Write-Host "`n2. Listando recursos existentes..." -ForegroundColor Cyan
    $resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
    
    foreach ($resource in $resources.items) {
        Write-Host "Recurso: $($resource.path) - ID: $($resource.id)" -ForegroundColor Yellow
        if ($resource.resourceMethods) {
            $methods = $resource.resourceMethods | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
            Write-Host "  Métodos: $($methods -join ', ')" -ForegroundColor Gray
        }
    }

    # 3. Encontrar recursos que necesitan CORS
    Write-Host "`n3. Configurando CORS para recursos..." -ForegroundColor Cyan
    
    $corsResources = $resources.items | Where-Object { 
        $_.path -like "*/documents*" -and $_.resourceMethods 
    }

    foreach ($resource in $corsResources) {
        Write-Host "`nConfigurando CORS para: $($resource.path)" -ForegroundColor Yellow
        
        # Verificar si ya existe método OPTIONS
        $hasOptions = $resource.resourceMethods.PSObject.Properties.Name -contains "OPTIONS"
        
        if (-not $hasOptions) {
            Write-Host "Creando método OPTIONS..." -ForegroundColor Cyan
            
            # Crear método OPTIONS
            try {
                aws apigateway put-method --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --authorization-type NONE --region $REGION
                Write-Host "✅ Método OPTIONS creado" -ForegroundColor Green
                
                # Crear integración mock para OPTIONS
                aws apigateway put-integration --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --type MOCK --integration-http-method OPTIONS --request-templates '{\"application/json\":\"{\\\"statusCode\\\": 200}\"}' --region $REGION
                Write-Host "✅ Integración OPTIONS creada" -ForegroundColor Green
                
                # Configurar respuesta del método OPTIONS
                aws apigateway put-method-response --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":false,\"method.response.header.Access-Control-Allow-Methods\":false,\"method.response.header.Access-Control-Allow-Origin\":false}' --region $REGION
                Write-Host "✅ Respuesta del método OPTIONS configurada" -ForegroundColor Green
                
                # Configurar respuesta de la integración OPTIONS
                aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $resource.id --http-method OPTIONS --status-code 200 --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"\\\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token\\\"\",\"method.response.header.Access-Control-Allow-Methods\":\"\\\"GET,POST,PUT,DELETE,OPTIONS\\\"\",\"method.response.header.Access-Control-Allow-Origin\":\"\\\"*\\\"\"}' --region $REGION
                Write-Host "✅ Respuesta de integración OPTIONS configurada" -ForegroundColor Green
                
            } catch {
                Write-Host "⚠️ Error configurando OPTIONS para $($resource.path): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✅ Método OPTIONS ya existe" -ForegroundColor Green
        }
        
        # Configurar CORS para otros métodos existentes
        $otherMethods = $resource.resourceMethods.PSObject.Properties.Name | Where-Object { $_ -ne "OPTIONS" }
        
        foreach ($method in $otherMethods) {
            Write-Host "Configurando CORS para método $method..." -ForegroundColor Cyan
            
            try {
                # Actualizar respuesta del método para incluir headers CORS
                aws apigateway update-method-response --rest-api-id $API_ID --resource-id $resource.id --http-method $method --status-code 200 --patch-ops '[{\"op\":\"add\",\"path\":\"/responseParameters/method.response.header.Access-Control-Allow-Origin\",\"value\":false}]' --region $REGION 2>$null
                
                # Actualizar respuesta de integración para incluir headers CORS
                aws apigateway update-integration-response --rest-api-id $API_ID --resource-id $resource.id --http-method $method --status-code 200 --patch-ops '[{\"op\":\"add\",\"path\":\"/responseParameters/method.response.header.Access-Control-Allow-Origin\",\"value\":\"\\\"*\\\"\"}]' --region $REGION 2>$null
                
                Write-Host "✅ CORS configurado para método $method" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ CORS ya configurado o error para método $method" -ForegroundColor Yellow
            }
        }
    }

    # 4. Desplegar cambios
    Write-Host "`n4. Desplegando cambios..." -ForegroundColor Cyan
    $deployment = aws apigateway create-deployment --rest-api-id $API_ID --stage-name dev --description "CORS configuration update" --region $REGION | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cambios desplegados correctamente" -ForegroundColor Green
        Write-Host "Deployment ID: $($deployment.id)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error desplegando cambios" -ForegroundColor Red
    }

    Write-Host "`n🎉 Configuración CORS completada!" -ForegroundColor Green
    Write-Host "URL de la API: https://$API_ID.execute-api.$REGION.amazonaws.com/dev" -ForegroundColor Yellow
    Write-Host "Espera unos minutos para que los cambios se propaguen." -ForegroundColor Yellow
    Write-Host "Luego prueba la eliminación de documentos nuevamente." -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifica que tienes permisos para modificar API Gateway" -ForegroundColor Yellow
}

Write-Host "`nPresiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
