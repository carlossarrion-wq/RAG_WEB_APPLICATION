-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA RAG APPLICATION
-- Base de datos: rag_query_logs
-- Motor: MySQL 8.0
-- Región: eu-west-1
-- ============================================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS rag_query_logs
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE rag_query_logs;

-- ============================================================================
-- TABLA PRINCIPAL: query_logs
-- Almacena todas las consultas realizadas al sistema RAG
-- ============================================================================

CREATE TABLE query_logs (
    -- Identificadores
    query_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID único de la consulta',
    
    -- Información del Usuario IAM
    iam_username VARCHAR(255) NOT NULL COMMENT 'Nombre de usuario IAM',
    iam_user_arn VARCHAR(500) COMMENT 'ARN completo del usuario IAM',
    iam_group VARCHAR(255) COMMENT 'Grupo IAM principal del usuario',
    
    -- Contenido de la Consulta
    user_query TEXT NOT NULL COMMENT 'Pregunta formulada por el usuario',
    llm_response TEXT COMMENT 'Respuesta generada por el LLM',
    
    -- Métricas de Palabras y Tokens
    query_word_count INT COMMENT 'Número de palabras en la consulta',
    query_char_count INT COMMENT 'Número de caracteres en la consulta',
    response_word_count INT COMMENT 'Número de palabras en la respuesta',
    response_char_count INT COMMENT 'Número de caracteres en la respuesta',
    tokens_used INT COMMENT 'Tokens consumidos por el LLM (si disponible)',
    
    -- Metadatos Técnicos
    model_id VARCHAR(100) NOT NULL COMMENT 'ID del modelo LLM utilizado',
    knowledge_base_id VARCHAR(50) NOT NULL COMMENT 'ID de la Knowledge Base consultada',
    
    -- Tiempos y Rendimiento
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de la petición',
    response_timestamp TIMESTAMP NULL COMMENT 'Momento de la respuesta',
    processing_time_ms INT COMMENT 'Tiempo total de procesamiento en milisegundos',
    vector_db_time_ms INT COMMENT 'Tiempo de consulta a la BD vectorial',
    llm_processing_time_ms INT COMMENT 'Tiempo de procesamiento del LLM',
    
    -- Estado y Errores
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'Estado: pending, completed, error',
    error_message TEXT COMMENT 'Mensaje de error si status=error',
    
    -- Contexto de la Petición
    lambda_request_id VARCHAR(255) COMMENT 'ID de la petición Lambda (AWS)',
    api_gateway_request_id VARCHAR(255) COMMENT 'ID de la petición API Gateway',
    source_ip VARCHAR(45) COMMENT 'Dirección IP del cliente',
    
    -- Metadatos Adicionales
    retrieved_documents_count INT DEFAULT 0 COMMENT 'Número de documentos recuperados',
    retrieval_only BOOLEAN DEFAULT FALSE COMMENT 'Si fue solo recuperación sin generación',
    
    -- Índices para consultas frecuentes
    INDEX idx_user_queries (iam_username, request_timestamp DESC),
    INDEX idx_group_queries (iam_group, request_timestamp DESC),
    INDEX idx_status (status, request_timestamp DESC),
    INDEX idx_model_usage (model_id, request_timestamp DESC),
    INDEX idx_kb_usage (knowledge_base_id, request_timestamp DESC),
    INDEX idx_timestamp (request_timestamp DESC)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro completo de consultas al sistema RAG';

-- ============================================================================
-- TABLA SECUNDARIA: retrieved_documents (OPCIONAL)
-- Almacena los documentos recuperados para cada consulta
-- ============================================================================

CREATE TABLE retrieved_documents (
    doc_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID autoincremental',
    query_id VARCHAR(36) NOT NULL COMMENT 'ID de la consulta asociada',
    
    -- Información del Documento
    document_reference VARCHAR(500) COMMENT 'Referencia al documento (S3 URI, ID, etc.)',
    chunk_text TEXT COMMENT 'Fragmento de texto recuperado',
    
    -- Métricas de Relevancia
    similarity_score DECIMAL(5,4) COMMENT 'Score de similitud (0.0000 - 1.0000)',
    rank_position INT COMMENT 'Posición en el ranking de relevancia (1 = más relevante)',
    
    -- Timestamp
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de recuperación',
    
    -- Relaciones
    FOREIGN KEY (query_id) REFERENCES query_logs(query_id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_query_documents (query_id, rank_position),
    INDEX idx_similarity_scores (similarity_score DESC),
    INDEX idx_document_ref (document_reference(255))
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos recuperados de la BD vectorial para cada consulta';

-- ============================================================================
-- QUERIES DE EJEMPLO PARA INFORMES
-- ============================================================================

-- 1. Total de consultas por usuario
-- SELECT 
--     iam_username,
--     COUNT(*) as total_queries,
--     COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_queries,
--     COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_queries,
--     ROUND(AVG(processing_time_ms), 2) as avg_processing_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY iam_username
-- ORDER BY total_queries DESC;

-- 2. Consultas por grupo IAM
-- SELECT 
--     iam_group,
--     COUNT(*) as total_queries,
--     SUM(tokens_used) as total_tokens,
--     AVG(tokens_used) as avg_tokens_per_query,
--     AVG(processing_time_ms) as avg_processing_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
--     AND status = 'completed'
-- GROUP BY iam_group
-- ORDER BY total_queries DESC;

-- 3. Uso de tokens por usuario
-- SELECT 
--     iam_username,
--     DATE(request_timestamp) as date,
--     COUNT(*) as daily_queries,
--     SUM(tokens_used) as daily_tokens,
--     AVG(processing_time_ms) as avg_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
--     AND status = 'completed'
-- GROUP BY iam_username, DATE(request_timestamp)
-- ORDER BY date DESC, daily_queries DESC;

-- 4. Análisis de rendimiento por modelo
-- SELECT 
--     model_id,
--     COUNT(*) as total_queries,
--     AVG(processing_time_ms) as avg_total_time,
--     AVG(vector_db_time_ms) as avg_vector_time,
--     AVG(llm_processing_time_ms) as avg_llm_time,
--     AVG(tokens_used) as avg_tokens
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
--     AND status = 'completed'
-- GROUP BY model_id
-- ORDER BY total_queries DESC;

-- 5. Tasa de errores
-- SELECT 
--     DATE(request_timestamp) as date,
--     COUNT(*) as total_queries,
--     COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
--     ROUND(COUNT(CASE WHEN status = 'error' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate_percent
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- GROUP BY DATE(request_timestamp)
-- ORDER BY date DESC;

-- 6. Documentos más relevantes (requiere tabla retrieved_documents)
-- SELECT 
--     rd.document_reference,
--     COUNT(*) as times_retrieved,
--     AVG(rd.similarity_score) as avg_similarity,
--     MIN(rd.rank_position) as best_rank
-- FROM retrieved_documents rd
-- JOIN query_logs ql ON rd.query_id = ql.query_id
-- WHERE ql.request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
--     AND rd.similarity_score >= 0.7
-- GROUP BY rd.document_reference
-- ORDER BY times_retrieved DESC, avg_similarity DESC
-- LIMIT 50;

-- ============================================================================
-- MANTENIMIENTO Y LIMPIEZA
-- ============================================================================

-- Archivar consultas antiguas (ejecutar periódicamente)
-- DELETE FROM query_logs 
-- WHERE request_timestamp < DATE_SUB(NOW(), INTERVAL 6 MONTH)
--     AND status = 'error';

-- Optimizar tablas (ejecutar mensualmente)
-- OPTIMIZE TABLE query_logs;
-- OPTIMIZE TABLE retrieved_documents;

-- Ver estadísticas de la tabla
-- SELECT 
--     TABLE_NAME,
--     TABLE_ROWS,
--     ROUND(DATA_LENGTH / 1024 / 1024, 2) as DATA_SIZE_MB,
--     ROUND(INDEX_LENGTH / 1024 / 1024, 2) as INDEX_SIZE_MB,
--     ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as TOTAL_SIZE_MB
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'rag_query_logs';
