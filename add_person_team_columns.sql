-- ============================================================================
-- SCRIPT PARA AÑADIR COLUMNAS PERSON Y TEAM A LA TABLA query_logs
-- ============================================================================

USE rag_query_logs;

-- Añadir columna 'person' para almacenar la etiqueta Person del usuario IAM
ALTER TABLE query_logs 
ADD COLUMN person VARCHAR(255) COMMENT 'Etiqueta Person del usuario IAM (ej: Jose Fernandez)'
AFTER iam_group;

-- Añadir columna 'team' para almacenar la etiqueta Team del usuario IAM
ALTER TABLE query_logs 
ADD COLUMN team VARCHAR(255) COMMENT 'Etiqueta Team del usuario IAM (ej: team_sdlc_group)'
AFTER person;

-- Crear índices para las nuevas columnas
CREATE INDEX idx_person_queries ON query_logs(person, request_timestamp DESC);
CREATE INDEX idx_team_queries ON query_logs(team, request_timestamp DESC);

-- Verificar que las columnas se añadieron correctamente
DESCRIBE query_logs;

-- ============================================================================
-- QUERIES DE EJEMPLO CON LAS NUEVAS COLUMNAS
-- ============================================================================

-- 1. Total de consultas por persona
-- SELECT 
--     person,
--     COUNT(*) as total_queries,
--     COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_queries,
--     SUM(tokens_used) as total_tokens,
--     AVG(processing_time_ms) as avg_processing_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY person
-- ORDER BY total_queries DESC;

-- 2. Total de consultas por equipo
-- SELECT 
--     team,
--     COUNT(*) as total_queries,
--     COUNT(DISTINCT person) as unique_users,
--     SUM(tokens_used) as total_tokens,
--     AVG(processing_time_ms) as avg_processing_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY team
-- ORDER BY total_queries DESC;

-- 3. Actividad diaria por equipo
-- SELECT 
--     team,
--     DATE(request_timestamp) as date,
--     COUNT(*) as daily_queries,
--     COUNT(DISTINCT person) as active_users,
--     SUM(tokens_used) as daily_tokens
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
--     AND status = 'completed'
-- GROUP BY team, DATE(request_timestamp)
-- ORDER BY date DESC, daily_queries DESC;

-- 4. Top usuarios por equipo
-- SELECT 
--     team,
--     person,
--     COUNT(*) as total_queries,
--     SUM(tokens_used) as total_tokens,
--     AVG(processing_time_ms) as avg_time_ms
-- FROM query_logs
-- WHERE request_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
--     AND status = 'completed'
-- GROUP BY team, person
-- ORDER BY team, total_queries DESC;
