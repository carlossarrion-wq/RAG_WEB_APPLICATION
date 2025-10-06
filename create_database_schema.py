"""
Script to create database schema in RDS MySQL
Run this script to initialize the database tables
"""

import pymysql
import sys

# Database connection details
DB_CONFIG = {
    'host': 'rag-query-logs-db.crwnm3fcrcqy.eu-west-1.rds.amazonaws.com',
    'user': 'admin',
    'password': 'RagQueryLogs2024!Secure',
    'database': 'rag_query_logs',
    'port': 3306,
    'charset': 'utf8mb4'
}

# SQL to create tables
CREATE_QUERY_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS query_logs (
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
"""

CREATE_RETRIEVED_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS retrieved_documents (
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
"""

def create_schema():
    """Create database schema"""
    connection = None
    try:
        print("Conectando a la base de datos...")
        connection = pymysql.connect(**DB_CONFIG)
        print(f"✓ Conectado exitosamente a {DB_CONFIG['host']}")
        
        with connection.cursor() as cursor:
            # Create query_logs table
            print("\nCreando tabla 'query_logs'...")
            cursor.execute(CREATE_QUERY_LOGS_TABLE)
            print("✓ Tabla 'query_logs' creada exitosamente")
            
            # Create retrieved_documents table
            print("\nCreando tabla 'retrieved_documents'...")
            cursor.execute(CREATE_RETRIEVED_DOCUMENTS_TABLE)
            print("✓ Tabla 'retrieved_documents' creada exitosamente")
            
            connection.commit()
            
        # Verify tables
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print("\n✓ Tablas en la base de datos:")
            for table in tables:
                print(f"  - {table[0]}")
        
        print("\n✓ Esquema de base de datos creado exitosamente!")
        return True
        
    except pymysql.Error as e:
        print(f"\n✗ Error de MySQL: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False
    finally:
        if connection:
            connection.close()
            print("\nConexión cerrada")

if __name__ == "__main__":
    print("=" * 60)
    print("CREACIÓN DE ESQUEMA DE BASE DE DATOS")
    print("Base de datos: rag_query_logs")
    print("=" * 60)
    
    success = create_schema()
    sys.exit(0 if success else 1)
