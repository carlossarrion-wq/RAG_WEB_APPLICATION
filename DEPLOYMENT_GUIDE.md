# Guía de Despliegue - Sistema de Gestión de Documentos

## 📋 Resumen
Esta guía te ayudará a desplegar el sistema completo de gestión de documentos que integra con AWS Bedrock Knowledge Base.

## 🎯 Componentes Desarrollados

### Backend (AWS Lambda)
- ✅ `document_manager.py` - Clase DocumentManager con operaciones CRUD
- ✅ `kb_query_handler.py` - Handler Lambda extendido con nuevos endpoints

### Frontend (React)
- ✅ `src/components/Documents/DocumentsArea.tsx` - UI completa con drag & drop
- ✅ `src/services/dataSourceService.ts` - Servicios actualizados

## 🚀 Pasos de Despliegue

### Paso 1: Preparar Archivos Lambda

#### 1.1 Crear paquete de despliegue
```bash
# Crear directorio temporal
mkdir lambda-deployment
cd lambda-deployment

# Copiar archivos Python
cp ../document_manager.py .
cp ../kb_query_handler.py .
cp ../bedrock_client_hybrid_search.py .
```

#### 1.2 Instalar dependencias (si es necesario)
```bash
# Si necesitas instalar dependencias adicionales
pip install boto3 -t .
```

#### 1.3 Crear archivo ZIP
```bash
# Crear archivo ZIP para subir a Lambda
zip -r lambda-function.zip .
```

### Paso 2: Actualizar Función Lambda

#### 2.1 Subir código a AWS Lambda
1. Ve a AWS Console → Lambda
2. Busca tu función `bedrock-kb-query-handler`
3. En la pestaña "Code", haz clic en "Upload from" → ".zip file"
4. Sube el archivo `lambda-function.zip`
5. Haz clic en "Save"

#### 2.2 Configurar permisos IAM
La función Lambda necesita estos permisos adicionales:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::tu-bucket-knowledge-base/*",
                "arn:aws:s3:::tu-bucket-knowledge-base"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:GetDataSource",
                "bedrock:ListDataSources",
                "bedrock:StartIngestionJob"
            ],
            "Resource": "*"
        }
    ]
}
```

### Paso 3: Configurar API Gateway

#### 3.1 Añadir nuevas rutas
En tu API Gateway existente, añade estas rutas:

```
GET    /documents/{knowledgeBaseId}/{dataSourceId}
POST   /documents/{knowledgeBaseId}/{dataSourceId}
DELETE /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}
DELETE /documents/{knowledgeBaseId}/{dataSourceId}/batch
PUT    /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename
```

#### 3.2 Configurar integración Lambda
- Todas las rutas deben apuntar a tu función `bedrock-kb-query-handler`
- Habilitar "Lambda Proxy Integration"
- Configurar CORS si es necesario

### Paso 4: Configurar Frontend

#### 4.1 Actualizar variables de entorno
Edita tu archivo `.env.local`:

```env
VITE_LAMBDA_URL=https://tu-api-gateway-url.amazonaws.com/prod
```

#### 4.2 Compilar aplicación
```bash
npm run build
```

### Paso 5: Pruebas

#### 5.1 Probar endpoints manualmente
```bash
# Listar documentos
curl -X GET "https://tu-api-gateway-url.amazonaws.com/prod/documents/TJ8IMVJVQW/tu-data-source-id"

# Subir documento (requiere autenticación)
curl -X POST "https://tu-api-gateway-url.amazonaws.com/prod/documents/TJ8IMVJVQW/tu-data-source-id" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf", "file_content": "base64-content", "content_type": "application/pdf"}'
```

#### 5.2 Probar UI
1. Inicia la aplicación: `npm run dev`
2. Ve a la sección "Documentos"
3. Prueba:
   - Drag & drop de archivos
   - Selección múltiple
   - Eliminación de documentos
   - Edición de nombres

## ⚠️ Solución de Problemas

### Error: "CORS policy"
- Verifica que API Gateway tenga CORS habilitado
- Los headers CORS ya están en el código Lambda

### Error: "Access Denied"
- Verifica permisos IAM de la función Lambda
- Asegúrate de que el bucket S3 permita acceso desde Lambda

### Error: "File too large"
- AWS Lambda tiene límite de 6MB para requests
- Para archivos más grandes, considera usar S3 presigned URLs

### Error: "Knowledge Base not found"
- Verifica que el ID de Knowledge Base sea correcto
- Asegúrate de que la función Lambda tenga permisos para Bedrock

## 📝 Notas Importantes

1. **Backup**: Haz backup de tu función Lambda actual antes de actualizar
2. **Testing**: Prueba en un entorno de desarrollo primero
3. **Monitoring**: Revisa CloudWatch Logs para errores
4. **Security**: Los archivos se transfieren en base64, considera la seguridad para archivos sensibles

## 🎉 Funcionalidades Implementadas

- ✅ Listado de documentos reales desde S3
- ✅ Subida de archivos con drag & drop
- ✅ Progress bars individuales
- ✅ Eliminación individual y masiva
- ✅ Edición inline de nombres
- ✅ Validación de tipos de archivo
- ✅ Modales de confirmación
- ✅ Estados visuales y manejo de errores

¡El sistema está listo para producción!
