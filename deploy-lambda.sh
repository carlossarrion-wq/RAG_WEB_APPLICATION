#!/bin/bash

# Script para preparar y desplegar la función Lambda
# Uso: ./deploy-lambda.sh

set -e

echo "🚀 Preparando despliegue de Lambda - Sistema de Gestión de Documentos"
echo "=================================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que los archivos necesarios existen
print_status "Verificando archivos necesarios..."

required_files=("document_manager.py" "kb_query_handler.py" "bedrock_client_hybrid_search.py")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    print_error "Faltan los siguientes archivos:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

print_success "Todos los archivos necesarios están presentes"

# Crear directorio temporal
TEMP_DIR="lambda-deployment-$(date +%Y%m%d-%H%M%S)"
print_status "Creando directorio temporal: $TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copiar archivos Python
print_status "Copiando archivos Python..."
cp document_manager.py "$TEMP_DIR/"
cp kb_query_handler.py "$TEMP_DIR/"
cp bedrock_client_hybrid_search.py "$TEMP_DIR/"

# Crear requirements.txt si no existe
if [ ! -f "$TEMP_DIR/requirements.txt" ]; then
    print_status "Creando requirements.txt..."
    cat > "$TEMP_DIR/requirements.txt" << EOF
boto3>=1.26.0
botocore>=1.29.0
EOF
fi

# Cambiar al directorio temporal
cd "$TEMP_DIR"

# Verificar si Python está disponible
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 no encontrado. Saltando instalación de dependencias."
else
    # Instalar dependencias si es necesario
    print_status "Verificando dependencias..."
    if [ -f "requirements.txt" ]; then
        print_status "Instalando dependencias en el directorio local..."
        python3 -m pip install -r requirements.txt -t . --quiet
        print_success "Dependencias instaladas"
    fi
fi

# Crear archivo ZIP
ZIP_NAME="lambda-function-$(date +%Y%m%d-%H%M%S).zip"
print_status "Creando archivo ZIP: $ZIP_NAME"

# Excluir archivos innecesarios del ZIP
zip -r "$ZIP_NAME" . -x "*.pyc" "*__pycache__*" "*.git*" "requirements.txt" > /dev/null

# Mover ZIP al directorio padre
mv "$ZIP_NAME" "../$ZIP_NAME"

# Volver al directorio original
cd ..

# Limpiar directorio temporal
print_status "Limpiando archivos temporales..."
rm -rf "$TEMP_DIR"

print_success "¡Paquete de despliegue creado exitosamente!"
echo ""
echo "📦 Archivo creado: $ZIP_NAME"
echo "📏 Tamaño: $(du -h "$ZIP_NAME" | cut -f1)"
echo ""
echo "🔧 Próximos pasos:"
echo "1. Ve a AWS Console → Lambda"
echo "2. Busca tu función 'bedrock-kb-query-handler'"
echo "3. En la pestaña 'Code', haz clic en 'Upload from' → '.zip file'"
echo "4. Sube el archivo: $ZIP_NAME"
echo "5. Haz clic en 'Save'"
echo ""
echo "📋 No olvides:"
echo "- Configurar los permisos IAM adicionales"
echo "- Actualizar las rutas en API Gateway"
echo "- Configurar la variable VITE_LAMBDA_URL en el frontend"
echo ""
echo "📖 Consulta DEPLOYMENT_GUIDE.md para instrucciones detalladas"

print_success "Script completado exitosamente"
