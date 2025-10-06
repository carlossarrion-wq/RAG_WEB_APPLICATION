# Configuración de Base de Datos de Referencia

## Información Recopilada de la Cuenta AWS de Referencia

### RDS Instance: bedrock-usage-mysql

**Configuración de la Instancia:**
- **Identificador**: bedrock-usage-mysql
- **Clase de Instancia**: db.t3.micro
- **Motor**: MySQL 8.0.43
- **Estado**: available
- **Región**: eu-west-1
- **Zona de Disponibilidad**: eu-west-1a
- **Multi-AZ**: No
- **Almacenamiento**: 20 GB (gp2)
- **Cifrado**: Habilitado (KMS Key: arn:aws:kms:eu-west-1:701055077130:key/aa5febab-4ea5-48ab-9779-a263b7596ef5)
- **Acceso Público**: Sí
- **Protección contra Eliminación**: Habilitado

**Endpoint:**
- **Host**: bedrock-usage-mysql.czuimyk2qu10.eu-west-1.rds.amazonaws.com
- **Puerto**: 3306

**Credenciales (de variables de entorno Lambda):**
- **Usuario**: admin
- **Contraseña**: BedrockUsage2024!
- **Base de Datos**: bedrock_usage

**Networking:**
- **VPC**: vpc-0a4db1b2120242bde
- **Subnet Group**: default (subnets en eu-west-1a, eu-west-1b, eu-west-1c)
- **Security Group**: sg-03fb5802582c7c66b (bedrock-usage-rds-sg)
  - Permite tráfico MySQL (puerto 3306) desde:
    - 0.0.0.0/0 (acceso público)
    - 83.61.73.113/32 (IP específica)
    - sg-03fb5802582c7c66b (mismo security group)

**Backups:**
- **Retención**: 7 días
- **Ventana de Backup**: 01:36-02:06 UTC
- **Ventana de Mantenimiento**: Viernes 04:03-04:33 UTC

**Parámetros:**
- **Parameter Group**: default.mysql8.0

### Lambdas que Usan la Base de Datos

#### 1. bedrock-realtime-usage-controller
- **Runtime**: Python 3.9
- **Timeout**: 60 segundos
- **Memoria**: 512 MB
- **Variables de Entorno**:
  - RDS_ENDPOINT: bedrock-usage-mysql.czuimyk2qu10.eu-west-1.rds.amazonaws.com
  - RDS_USERNAME: admin
  - RDS_PASSWORD: BedrockUsage2024!
  - RDS_DATABASE: bedrock_usage
  - SNS_TOPIC_ARN: arn:aws:sns:eu-west-1:701055077130:bedrock-usage-alerts
  - EMAIL_NOTIFICATIONS_ENABLED: true
  - EMAIL_SERVICE_LAMBDA_NAME: bedrock-email-service

#### 2. bedrock-daily-reset
- **Runtime**: Python 3.9
- **Timeout**: 300 segundos (5 minutos)
- **Memoria**: 512 MB
- **Variables de Entorno**:
  - RDS_ENDPOINT: bedrock-usage-mysql.czuimyk2qu10.eu-west-1.rds.amazonaws.com
  - RDS_USERNAME: admin
  - RDS_PASSWORD: BedrockUsage2024!
  - RDS_DATABASE: bedrock_usage
  - SNS_TOPIC_ARN: arn:aws:sns:eu-west-1:701055077130:bedrock-usage-alerts
  - EMAIL_SERVICE_FUNCTION: bedrock-email-service
  - ACCOUNT_ID: 701055077130

#### 3. bedrock-mysql-query-executor
- **Runtime**: Python 3.9
- **Timeout**: 30 segundos
- **Memoria**: 256 MB
- **Variables de Entorno**:
  - DB_USER: admin
  - DB_PASSWORD: BedrockUsage2024!

### Esquema de Base de Datos Inferido

Basándome en el README_BD.md y las Lambdas que usan la base de datos, el esquema probablemente incluye:

**Tablas Principales:**
1. **conversations** - Conversaciones de usuarios
2. **requests** - Peticiones individuales
3. **request_metadata** - Metadatos técnicos de peticiones
4. **retrieved_documents** - Documentos recuperados

**Campos Clave Identificados:**
- Usuario IAM (iam_username)
- Consulta del usuario (user_query)
- Respuesta del LLM (llm_response)
- Tokens utilizados (tokens_used)
- Tiempos de procesamiento
- Estado de la petición (status)
- Modelo utilizado (model_name)
- Knowledge Base ID

## Recomendaciones para Nueva Implementación

### Configuración Sugerida para Nueva RDS

**Instancia:**
- Clase: db.t3.micro (igual que referencia, suficiente para empezar)
- Motor: MySQL 8.0.43
- Almacenamiento: 20 GB gp2
- Multi-AZ: No (para desarrollo/pruebas)
- Cifrado: Habilitado

**Networking:**
- VPC: Usar VPC existente o crear nueva
- Security Group: Crear nuevo con acceso desde Lambda
- Acceso Público: No (más seguro, acceso solo desde Lambda)

**Seguridad:**
- Credenciales en AWS Secrets Manager (NO en variables de entorno)
- IAM Database Authentication (opcional, más seguro)
- Protección contra eliminación: Habilitado

**Backups:**
- Retención: 7 días
- Snapshots automáticos habilitados

### Diferencias con el Proyecto de Referencia

**Simplificaciones:**
1. No necesitamos tabla `conversations` (no hay conversaciones multi-turno)
2. Combinar `requests` y `request_metadata` en una sola tabla `query_logs`
3. Mantener `retrieved_documents` como tabla separada (opcional)

**Campos Adicionales Específicos:**
- `iam_user_arn` - ARN completo del usuario IAM
- `iam_group` - Grupo IAM del usuario
- `query_word_count` - Número de palabras en la consulta
- `response_word_count` - Número de palabras en la respuesta
- `api_gateway_request_id` - ID de la petición API Gateway

### Conexión desde Lambda

**Librería requerida:**
```python
import pymysql
```

**Patrón de conexión:**
```python
connection = pymysql.connect(
    host=os.environ['DB_HOST'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
    database=os.environ['DB_NAME'],
    connect_timeout=5
)
```

**Mejora con Secrets Manager:**
```python
import boto3
import json

def get_db_credentials():
    client = boto3.client('secretsmanager', region_name='eu-west-1')
    response = client.get_secret_value(SecretId='rds-credentials')
    return json.loads(response['SecretString'])
```

## Próximos Pasos

1. Volver a la cuenta principal
2. Crear RDS instance con configuración similar
3. Crear esquema de base de datos simplificado
4. Configurar Secrets Manager
5. Modificar Lambda para conectar a RDS
6. Testing y validación
