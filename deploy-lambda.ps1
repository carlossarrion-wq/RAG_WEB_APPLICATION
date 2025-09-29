# Script de PowerShell para preparar y desplegar la función Lambda
# Uso: .\deploy-lambda.ps1

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Script para preparar el paquete de despliegue de Lambda" -ForegroundColor Green
    Write-Host "Uso: .\deploy-lambda.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Este script:"
    Write-Host "- Verifica que los archivos necesarios existan"
    Write-Host "- Crea un directorio temporal"
    Write-Host "- Copia los archivos Python necesarios"
    Write-Host "- Crea un archivo ZIP para subir a AWS Lambda"
    Write-Host "- Limpia archivos temporales"
    exit 0
}

Write-Host "🚀 Preparando despliegue de Lambda - Sistema de Gestión de Documentos" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Función para imprimir mensajes con colores
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar que los archivos necesarios existen
Write-Status "Verificando archivos necesarios..."

$requiredFiles = @("document_manager.py", "kb_query_handler.py", "bedrock_client_hybrid_search.py")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-ErrorMsg "Faltan los siguientes archivos:"
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    exit 1
}

Write-Success "Todos los archivos necesarios están presentes"

# Crear directorio temporal
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tempDir = "lambda-deployment-$timestamp"
Write-Status "Creando directorio temporal: $tempDir"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copiar archivos Python
Write-Status "Copiando archivos Python..."
Copy-Item "document_manager.py" -Destination "$tempDir\"
Copy-Item "kb_query_handler.py" -Destination "$tempDir\"
Copy-Item "bedrock_client_hybrid_search.py" -Destination "$tempDir\"

# Crear requirements.txt si no existe
$requirementsPath = "$tempDir\requirements.txt"
if (-not (Test-Path $requirementsPath)) {
    Write-Status "Creando requirements.txt..."
    @"
boto3>=1.26.0
botocore>=1.29.0
"@ | Out-File -FilePath $requirementsPath -Encoding UTF8
}

# Verificar si Python está disponible
$pythonAvailable = $false
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        $pythonAvailable = $true
        Write-Status "Python encontrado: $pythonVersion"
    }
} catch {
    Write-Warning "Python no encontrado. Saltando instalación de dependencias."
}

# Instalar dependencias si Python está disponible
if ($pythonAvailable -and (Test-Path $requirementsPath)) {
    Write-Status "Instalando dependencias en el directorio local..."
    Push-Location $tempDir
    try {
        python -m pip install -r requirements.txt -t . --quiet
        Write-Success "Dependencias instaladas"
    } catch {
        Write-Warning "Error instalando dependencias: $_"
    }
    Pop-Location
}

# Crear archivo ZIP
$zipName = "lambda-function-$timestamp.zip"
Write-Status "Creando archivo ZIP: $zipName"

# Verificar si 7-Zip está disponible
$zipCommand = $null
if (Get-Command "7z" -ErrorAction SilentlyContinue) {
    $zipCommand = "7z"
} elseif (Test-Path "C:\Program Files\7-Zip\7z.exe") {
    $zipCommand = "C:\Program Files\7-Zip\7z.exe"
} elseif (Test-Path "C:\Program Files (x86)\7-Zip\7z.exe") {
    $zipCommand = "C:\Program Files (x86)\7-Zip\7z.exe"
}

if ($zipCommand) {
    # Usar 7-Zip
    Push-Location $tempDir
    & $zipCommand a "..\$zipName" * -x!*.pyc -x!__pycache__ -x!requirements.txt | Out-Null
    Pop-Location
    Write-Success "Archivo ZIP creado con 7-Zip"
} else {
    # Usar PowerShell Compress-Archive
    Write-Status "Usando PowerShell Compress-Archive..."
    
    # Obtener archivos excluyendo los no deseados
    $filesToZip = Get-ChildItem -Path $tempDir -Recurse | Where-Object {
        $_.Name -notlike "*.pyc" -and 
        $_.Name -ne "__pycache__" -and 
        $_.Name -ne "requirements.txt"
    }
    
    if ($filesToZip.Count -gt 0) {
        Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force
        Write-Success "Archivo ZIP creado con PowerShell"
    } else {
        Write-ErrorMsg "No se encontraron archivos para comprimir"
        exit 1
    }
}

# Limpiar directorio temporal
Write-Status "Limpiando archivos temporales..."
Remove-Item -Path $tempDir -Recurse -Force

# Verificar que el ZIP se creó correctamente
if (Test-Path $zipName) {
    $zipSize = (Get-Item $zipName).Length
    $zipSizeKB = [math]::Round($zipSize / 1KB, 2)
    
    Write-Success "¡Paquete de despliegue creado exitosamente!"
    Write-Host ""
    Write-Host "📦 Archivo creado: $zipName" -ForegroundColor Green
    Write-Host "📏 Tamaño: $zipSizeKB KB" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔧 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Ve a AWS Console → Lambda"
    Write-Host "2. Busca tu función 'bedrock-kb-query-handler'"
    Write-Host "3. En la pestaña 'Code', haz clic en 'Upload from' → '.zip file'"
    Write-Host "4. Sube el archivo: $zipName"
    Write-Host "5. Haz clic en 'Save'"
    Write-Host ""
    Write-Host "📋 No olvides:" -ForegroundColor Yellow
    Write-Host "- Configurar los permisos IAM adicionales"
    Write-Host "- Actualizar las rutas en API Gateway"
    Write-Host "- Configurar la variable VITE_LAMBDA_URL en el frontend"
    Write-Host ""
    Write-Host "📖 Consulta DEPLOYMENT_GUIDE.md para instrucciones detalladas" -ForegroundColor Cyan
    
    Write-Success "Script completado exitosamente"
} else {
    Write-ErrorMsg "Error: No se pudo crear el archivo ZIP"
    exit 1
}
