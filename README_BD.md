# Sistema de Monitorización y Tracking para RAG en AWS

## Objetivos del Modelo de Datos

Este modelo de datos está diseñado para proporcionar un sistema completo de monitorización y tracking para una aplicación RAG (Retrieval-Augmented Generation) desplegada en AWS. Los objetivos principales son:

### 1. **Monitorización de Uso**
- Rastrear el número de peticiones realizadas por cada usuario
- Identificar patrones de uso y comportamiento
- Generar informes de actividad por usuario y período temporal

### 2. **Gestión de Conversaciones**
- Mantener el histórico completo de cada conversación
- Permitir la recuperación del contexto para continuar conversaciones previas
- Organizar las peticiones en sesiones conversacionales coherentes

### 3. **Análisis de Rendimiento**
- Medir tiempos de respuesta de cada componente (BD vectorial, LLM)
- Monitorizar el consumo de tokens y recursos
- Identificar cuellos de botella y optimizar el sistema

### 4. **Trazabilidad y Auditoría**
- Registrar metadatos técnicos de cada petición
- Mantener referencias a documentos recuperados
- Facilitar la depuración y análisis de resultados

### 5. **Generación de Informes**
- Estadísticas de uso por usuario y período
- Análisis de costos basado en tokens consumidos
- Métricas de calidad y relevancia de respuestas

## Arquitectura del Sistema

```
Usuario (IAM) → API Gateway → Lambda → [BD Vectorial + LLM] → RDS (Tracking)
                                              ↓
                                        Respuesta + Metadatos
```

## Modelo de Datos

### Diagrama de Relaciones

```
conversations (1) ←──── (N) requests (1) ←──── (1) request_metadata
                                    ↓
                                   (N)
                                    ↓
                            retrieved_documents
```

## DDL - Definición de Base de Datos

### Crear Base de Datos

```sql
-- Para MySQL
CREATE DATABASE rag_monitoring
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE rag_monitoring;

-- Para PostgreSQL
-- CREATE DATABASE rag_monitoring
--     ENCODING 'UTF8'
--     LC_COLLATE = 'en_US.UTF-8'
--     LC_CTYPE = 'en_US.UTF-8';
```

## DDL - Definición de Tablas

### 1. Tabla `conversations`

Almacena las conversaciones iniciadas por los usuarios. Cada conversación agrupa múltiples peticiones relacionadas.

```sql
CREATE TABLE conversations (
    conversation_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID único de la conversación',
    iam_username VARCHAR(255) NOT NULL COMMENT 'Nombre de usuario en AWS IAM',
    title VARCHAR(255) COMMENT 'Título descriptivo de la conversación',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Indica si la conversación está activa',
    total_messages INT DEFAULT 0 COMMENT 'Contador de mensajes en la conversación',
    INDEX idx_user_conversations (iam_username, created_at DESC),
    INDEX idx_active_conversations (is_active, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Conversaciones de usuarios con el sistema RAG';
```

**Campos clave:**
- `conversation_id`: Identificador único (UUID v4)
- `iam_username`: Usuario de AWS IAM que inicia la conversación
- `title`: Título generado automáticamente o asignado por el usuario
- `total_messages`: Contador incremental de mensajes

### 2. Tabla `requests`

Registra cada petición individual realizada por los usuarios, incluyendo la pregunta y la respuesta del LLM.

```sql
CREATE TABLE requests (
    request_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID único de la petición',
    conversation_id VARCHAR(36) NOT NULL COMMENT 'ID de la conversación a la que pertenece',
    iam_username VARCHAR(255) NOT NULL COMMENT 'Usuario de IAM que realiza la petición',
    user_query TEXT NOT NULL COMMENT 'Pregunta formulada por el usuario',
    llm_response TEXT COMMENT 'Respuesta generada por el LLM',
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de la petición',
    response_timestamp TIMESTAMP COMMENT 'Momento de la respuesta',
    response_time_ms INT COMMENT 'Tiempo total de respuesta en milisegundos',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'Estado: pending, completed, error',
    error_message TEXT COMMENT 'Mensaje de error si status=error',
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    INDEX idx_user_requests (iam_username, request_timestamp DESC),
    INDEX idx_conversation_requests (conversation_id, request_timestamp ASC),
    INDEX idx_status_requests (status, request_timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Peticiones individuales realizadas al sistema RAG';
```

**Campos clave:**
- `request_id`: Identificador único (UUID v4)
- `user_query`: Texto de la pregunta del usuario
- `llm_response`: Respuesta generada por el modelo
- `response_time_ms`: Métrica de rendimiento
- `status`: Estados posibles: `pending`, `completed`, `error`

### 3. Tabla `request_metadata`

Almacena metadatos técnicos detallados de cada petición para análisis de rendimiento y costos.

```sql
CREATE TABLE request_metadata (
    metadata_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID autoincremental',
    request_id VARCHAR(36) NOT NULL COMMENT 'ID de la petición asociada',
    lambda_request_id VARCHAR(255) COMMENT 'ID de la petición Lambda de AWS',
    vector_db_query_time_ms INT COMMENT 'Tiempo de consulta a la BD vectorial',
    llm_processing_time_ms INT COMMENT 'Tiempo de procesamiento del LLM',
    tokens_used INT COMMENT 'Número de tokens consumidos',
    model_name VARCHAR(100) COMMENT 'Nombre del modelo LLM utilizado',
    temperature DECIMAL(3,2) COMMENT 'Parámetro de temperatura del modelo',
    retrieved_documents_count INT COMMENT 'Número de documentos recuperados',
    similarity_scores JSON COMMENT 'Scores de similitud de documentos recuperados',
    ip_address VARCHAR(45) COMMENT 'Dirección IP del cliente (IPv4 o IPv6)',
    user_agent TEXT COMMENT 'User agent del navegador/cliente',
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    INDEX idx_request_metadata (request_id),
    INDEX idx_model_usage (model_name, tokens_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Metadatos técnicos de las peticiones para análisis detallado';
```

**Campos clave:**
- `lambda_request_id`: Para correlación con logs de CloudWatch
- `vector_db_query_time_ms` y `llm_processing_time_ms`: Métricas de rendimiento por componente
- `tokens_used`: Para cálculo de costos
- `similarity_scores`: JSON con scores de relevancia de documentos

### 4. Tabla `retrieved_documents`

Registra los documentos recuperados de la base de datos vectorial para cada petición.

```sql
CREATE TABLE retrieved_documents (
    doc_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID autoincremental',
    request_id VARCHAR(36) NOT NULL COMMENT 'ID de la petición asociada',
    document_reference VARCHAR(500) COMMENT 'Referencia al documento (S3 URI, ID, etc.)',
    chunk_text TEXT COMMENT 'Fragmento de texto recuperado',
    similarity_score DECIMAL(5,4) COMMENT 'Score de similitud (0.0000 - 1.0000)',
    rank_position INT COMMENT 'Posición en el ranking de relevancia',
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    INDEX idx_request_documents (request_id, rank_position),
    INDEX idx_similarity_scores (similarity_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos recuperados de la BD vectorial para cada petición';
```

**Campos clave:**
- `document_reference`: URI o identificador del documento fuente
- `chunk_text`: Fragmento específico utilizado como contexto
- `similarity_score`: Métrica de relevancia (0-1)
- `rank_position`: Orden de relevancia (1 = más relevante)

## Queries de Ejemplo para Informes

### 1. Conteo de Peticiones por Usuario

```sql
-- Total de peticiones por usuario
SELECT 
    iam_username,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM requests
GROUP BY iam_username
ORDER BY total_requests DESC;
```

### 2. Actividad Diaria por Usuario

```sql
-- Peticiones diarias por usuario en los últimos 30 días
SELECT 
    iam_username,
    DATE(request_timestamp) as date,
    COUNT(*) as daily_requests,
    AVG(response_time_ms) as avg_response_time_ms
FROM requests
WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY iam_username, DATE(request_timestamp)
ORDER BY date DESC, daily_requests DESC;
```

### 3. Estadísticas de Uso de Tokens

```sql
-- Consumo de tokens por usuario
SELECT 
    r.iam_username,
    COUNT(r.request_id) as total_requests,
    SUM(rm.tokens_used) as total_tokens,
    AVG(rm.tokens_used) as avg_tokens_per_request,
    MAX(rm.tokens_used) as max_tokens_single_request,
    AVG(r.response_time_ms) as avg_response_time_ms
FROM requests r
JOIN request_metadata rm ON r.request_id = rm.request_id
WHERE r.request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND r.status = 'completed'
GROUP BY r.iam_username
ORDER BY total_tokens DESC;
```

### 4. Recuperar Historial de Conversación

```sql
-- Obtener todos los mensajes de una conversación específica
SELECT 
    r.request_id,
    r.user_query,
    r.llm_response,
    r.request_timestamp,
    r.response_time_ms,
    r.status,
    rm.tokens_used,
    rm.retrieved_documents_count
FROM requests r
LEFT JOIN request_metadata rm ON r.request_id = rm.request_id
WHERE r.conversation_id = 'uuid-de-conversacion'
ORDER BY r.request_timestamp ASC;
```

### 5. Análisis de Rendimiento del Sistema

```sql
-- Métricas de rendimiento por componente
SELECT 
    DATE(r.request_timestamp) as date,
    COUNT(*) as total_requests,
    AVG(rm.vector_db_query_time_ms) as avg_vector_db_time,
    AVG(rm.llm_processing_time_ms) as avg_llm_time,
    AVG(r.response_time_ms) as avg_total_time,
    MAX(r.response_time_ms) as max_response_time,
    AVG(rm.retrieved_documents_count) as avg_docs_retrieved
FROM requests r
JOIN request_metadata rm ON r.request_id = rm.request_id
WHERE r.request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND r.status = 'completed'
GROUP BY DATE(r.request_timestamp)
ORDER BY date DESC;
```

### 6. Top Conversaciones Más Activas

```sql
-- Conversaciones con más mensajes
SELECT 
    c.conversation_id,
    c.iam_username,
    c.title,
    c.total_messages,
    c.created_at,
    c.updated_at,
    TIMESTAMPDIFF(MINUTE, c.created_at, c.updated_at) as duration_minutes
FROM conversations c
WHERE c.is_active = TRUE
ORDER BY c.total_messages DESC
LIMIT 20;
```

### 7. Análisis de Documentos Más Relevantes

```sql
-- Documentos más frecuentemente recuperados con alta relevancia
SELECT 
    rd.document_reference,
    COUNT(*) as times_retrieved,
    AVG(rd.similarity_score) as avg_similarity,
    MIN(rd.rank_position) as best_rank
FROM retrieved_documents rd
JOIN requests r ON rd.request_id = r.request_id
WHERE r.request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND rd.similarity_score >= 0.7
GROUP BY rd.document_reference
ORDER BY times_retrieved DESC, avg_similarity DESC
LIMIT 50;
```

### 8. Informe de Errores

```sql
-- Análisis de errores por usuario y tipo
SELECT 
    iam_username,
    DATE(request_timestamp) as date,
    COUNT(*) as error_count,
    error_message
FROM requests
WHERE status = 'error'
    AND request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY iam_username, DATE(request_timestamp), error_message
ORDER BY date DESC, error_count DESC;
```

## Integración con Lambda

### Flujo de Datos

1. **Inicio de Petición**: Lambda recibe la petición del usuario
2. **Crear/Recuperar Conversación**: Verificar si existe `conversation_id` o crear uno nuevo
3. **Registrar Petición**: Insertar en `requests` con `status='pending'`
4. **Consultar BD Vectorial**: Medir tiempo y recuperar documentos
5. **Procesar con LLM**: Medir tiempo y tokens consumidos
6. **Guardar Metadatos**: Insertar en `request_metadata` y `retrieved_documents`
7. **Actualizar Petición**: Actualizar `requests` con respuesta y `status='completed'`
8. **Actualizar Conversación**: Incrementar `total_messages` y actualizar `updated_at`

### Ejemplo de Código Python (Lambda)

```python
import uuid
import json
from datetime import datetime
import pymysql

def lambda_handler(event, context):
    # Extraer datos del evento
    iam_username = event['requestContext']['authorizer']['claims']['cognito:username']
    conversation_id = event.get('conversation_id') or str(uuid.uuid4())
    user_query = event['query']
    
    # Conectar a RDS
    connection = pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database='rag_monitoring'
    )
    
    try:
        with connection.cursor() as cursor:
            # 1. Crear/verificar conversación
            cursor.execute("""
                INSERT INTO conversations (conversation_id, iam_username, title)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
            """, (conversation_id, iam_username, user_query[:100]))
            
            # 2. Crear registro de petición
            request_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO requests (request_id, conversation_id, iam_username, user_query, status)
                VALUES (%s, %s, %s, %s, 'pending')
            """, (request_id, conversation_id, iam_username, user_query))
            
            connection.commit()
            
            # 3. Procesar petición (BD vectorial + LLM)
            start_time = datetime.now()
            vector_start = datetime.now()
            retrieved_docs = query_vector_db(user_query)
            vector_time = (datetime.now() - vector_start).total_seconds() * 1000
            
            llm_start = datetime.now()
            llm_response, tokens = query_llm(user_query, retrieved_docs)
            llm_time = (datetime.now() - llm_start).total_seconds() * 1000
            
            total_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # 4. Actualizar petición con respuesta
            cursor.execute("""
                UPDATE requests 
                SET llm_response = %s, 
                    response_timestamp = CURRENT_TIMESTAMP,
                    response_time_ms = %s,
                    status = 'completed'
                WHERE request_id = %s
            """, (llm_response, int(total_time), request_id))
            
            # 5. Guardar metadatos
            cursor.execute("""
                INSERT INTO request_metadata 
                (request_id, lambda_request_id, vector_db_query_time_ms, 
                 llm_processing_time_ms, tokens_used, model_name, 
                 retrieved_documents_count, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (request_id, context.request_id, int(vector_time), 
                  int(llm_time), tokens, 'claude-3-sonnet', 
                  len(retrieved_docs), event['requestContext']['identity']['sourceIp']))
            
            # 6. Guardar documentos recuperados
            for idx, doc in enumerate(retrieved_docs):
                cursor.execute("""
                    INSERT INTO retrieved_documents 
                    (request_id, document_reference, chunk_text, similarity_score, rank_position)
                    VALUES (%s, %s, %s, %s, %s)
                """, (request_id, doc['reference'], doc['text'], 
                      doc['score'], idx + 1))
            
            # 7. Actualizar contador de mensajes
            cursor.execute("""
                UPDATE conversations 
                SET total_messages = total_messages + 1
                WHERE conversation_id = %s
            """, (conversation_id,))
            
            connection.commit()
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'conversation_id': conversation_id,
                    'request_id': request_id,
                    'response': llm_response
                })
            }
            
    except Exception as e:
        # Registrar error
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE requests 
                SET status = 'error', error_message = %s
                WHERE request_id = %s
            """, (str(e), request_id))
            connection.commit()
        raise
    finally:
        connection.close()
```

## Consideraciones de Implementación

### Seguridad
- Usar AWS Secrets Manager para credenciales de RDS
- Implementar IAM roles con permisos mínimos necesarios
- Cifrar datos sensibles en reposo y en tránsito
- Implementar rate limiting por usuario

### Rendimiento
- Índices optimizados para queries frecuentes
- Considerar particionamiento de tablas por fecha para grandes volúmenes
- Implementar caché para conversaciones activas (ElastiCache)
- Usar connection pooling para RDS

### Escalabilidad
- RDS Multi-AZ para alta disponibilidad
- Read replicas para queries de reporting
- Archivado de conversaciones antiguas (>6 meses)
- Considerar DynamoDB para metadatos de alta frecuencia

### Monitorización
- CloudWatch Alarms para métricas críticas
- X-Ray para tracing de peticiones
- Dashboards de Grafana/QuickSight para visualización
- Alertas de anomalías en uso o errores

## Mantenimiento

### Limpieza de Datos
```sql
-- Archivar conversaciones inactivas de más de 6 meses
UPDATE conversations 
SET is_active = FALSE 
WHERE updated_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- Eliminar peticiones fallidas antiguas (opcional)
DELETE FROM requests 
WHERE status = 'error' 
    AND request_timestamp < DATE_SUB(NOW(), INTERVAL 3 MONTH);
```

### Optimización de Índices
```sql
-- Analizar uso de índices
SHOW INDEX FROM requests;
SHOW INDEX FROM conversations;

-- Optimizar tablas periódicamente
OPTIMIZE TABLE requests;
OPTIMIZE TABLE conversations;
OPTIMIZE TABLE request_metadata;
OPTIMIZE TABLE retrieved_documents;
```

## Licencia

Este modelo de datos es parte de un sistema propietario para monitorización de aplicaciones RAG en AWS.
