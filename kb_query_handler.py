import json
import boto3
import logging
import os
import sys
import time
import base64
from datetime import datetime
from urllib.parse import unquote

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Add current directory to path to import modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import BedrockClient from bedrock_client_hybrid_search and DocumentManager
from bedrock_client_hybrid_search import BedrockClient
from document_manager import DocumentManager

def lambda_handler(event, context):
    """
    AWS Lambda handler for knowledge base queries and document management
    """
    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod', 'POST')
        path = event.get('path', '/')
        
        logger.info(f"Processing {http_method} request to {path}")
        
        # Common headers for all responses with comprehensive CORS support
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AWS-Access-Key-Id, X-AWS-Secret-Access-Key, X-AWS-Session-Token, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
            'Access-Control-Allow-Credentials': 'false',
            'Access-Control-Max-Age': '86400'
        }
        
        # Handle OPTIONS requests for CORS - ALWAYS return 200 regardless of path
        if http_method == 'OPTIONS':
            logger.info(f"Handling OPTIONS request for path: {path}")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'CORS preflight successful',
                    'path': path,
                    'method': http_method
                })
            }
        
        # Route requests based on path and method
        if path.startswith('/documents'):
            return handle_document_request(event, context, headers)
        else:
            # Default to chat/query functionality
            return handle_chat_request(event, context, headers)
            
    except Exception as e:
        logger.error(f"Request processing failed: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }


def handle_chat_request(event, context, headers):
    """
    Handle chat/query requests (original functionality)
    """
    try:
        logger.info("Starting knowledge base query processing")
        
        # Parse request parameters
        body_str = event.get('body') or '{}'
        body = json.loads(body_str)
        query = body.get('query', '')
        model_id = body.get('model_id', 'anthropic.claude-sonnet-4-20250514-v1:0')
        knowledge_base_id = body.get('knowledge_base_id', 'TJ8IMVJVQW')  # ID por defecto
        retrieval_only = body.get('retrieval_only', False)
        
        # Log request parameters
        logger.info(f"Query: {query}")
        logger.info(f"Model ID: {model_id}")
        logger.info(f"Knowledge Base ID: {knowledge_base_id}")
        logger.info(f"Retrieval only: {retrieval_only}")
        
        # Validar parámetros
        if not query:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'La consulta es obligatoria'})
            }
        
        # Validar modelo
        allowed_models = [
            'anthropic.claude-sonnet-4-20250514-v1:0',  # Claude Sonnet 4
            'amazon.nova-pro-v1:0',                     # Amazon Nova Pro
        ]
        
        if model_id not in allowed_models:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': f'Modelo no válido. Modelos permitidos: {", ".join(allowed_models)}',
                    'allowed_models': allowed_models
                })
            }
        
        # Inicializar el cliente de Bedrock con el modelo seleccionado
        bedrock_client = BedrockClient(region_name='eu-west-1', model_id=model_id)
        
        # Realizar la consulta a la knowledge base con búsqueda híbrida
        start_time = time.time()
        result = bedrock_client.retrieve_and_generate(
            knowledge_base_id=knowledge_base_id,
            prompt=query,
            model_id=model_id,
            retrieval_only=retrieval_only
        )
        
        # Añadir metadatos adicionales
        result['query'] = query
        result['model_used'] = model_id
        result['knowledge_base_id'] = knowledge_base_id
        result['total_processing_time_ms'] = round((time.time() - start_time) * 1000, 2)
        
        # Return results
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"Knowledge base query processing failed: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_document_request(event, context, headers):
    """
    Handle document management requests
    """
    try:
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters') or {}
        
        logger.info(f"🔍 Procesando petición de documentos: {http_method} {path}")
        
        # Handle OPTIONS requests immediately for CORS - don't process document logic
        if http_method == 'OPTIONS':
            logger.info(f"Handling document OPTIONS request for path: {path}")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'CORS preflight successful',
                    'path': path,
                    'method': http_method
                })
            }
        
        logger.info(f"📋 Headers recibidos: {event.get('headers', {})}")
        
        # Extract AWS credentials from headers
        request_headers = event.get('headers', {})
        aws_credentials = None
        
        # Check for AWS credentials in headers (case-insensitive)
        access_key_id = None
        secret_access_key = None
        session_token = None
        
        for header_name, header_value in request_headers.items():
            header_lower = header_name.lower()
            if header_lower == 'x-aws-access-key-id':
                access_key_id = header_value
            elif header_lower == 'x-aws-secret-access-key':
                secret_access_key = header_value
            elif header_lower == 'x-aws-session-token':
                session_token = header_value
        
        if access_key_id and secret_access_key:
            aws_credentials = {
                'aws_access_key_id': access_key_id,
                'aws_secret_access_key': secret_access_key,
                'aws_session_token': session_token
            }
            logger.info(f"🔐 Usando credenciales AWS del usuario: {access_key_id[:8]}...")
        else:
            logger.info("⚠️ No se encontraron credenciales AWS en headers, usando rol de Lambda")
        
        # Initialize DocumentManager with custom credentials
        doc_manager = DocumentManager(aws_credentials=aws_credentials)
        
        # Parse path to extract parameters
        # Expected paths:
        # GET /documents/{knowledgeBaseId}/{dataSourceId}
        # POST /documents/{knowledgeBaseId}/{dataSourceId}
        # DELETE /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}
        # DELETE /documents/{knowledgeBaseId}/{dataSourceId}/batch
        # PUT /documents/{knowledgeBaseId}/{dataSourceId}/{documentId}/rename
        
        path_parts = [p for p in path.split('/') if p]
        logger.info(f"📂 Path parts: {path_parts}")
        
        if len(path_parts) < 3:
            logger.error(f"❌ Path inválido: {path}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid path. Expected format: /documents/{knowledgeBaseId}/{dataSourceId}',
                    'received_path': path,
                    'path_parts': path_parts
                })
            }
        
        knowledge_base_id = unquote(path_parts[1])
        data_source_id = unquote(path_parts[2])
        
        logger.info(f"🎯 Document operation: {http_method} for KB: {knowledge_base_id}, DS: {data_source_id}")
        
        if http_method == 'GET':
            # List documents
            logger.info(f"📄 Listando documentos para KB: {knowledge_base_id}, DS: {data_source_id}")
            try:
                documents = doc_manager.list_documents(knowledge_base_id, data_source_id)
                logger.info(f"✅ Encontrados {len(documents)} documentos")
                
                response_body = {
                    'documents': documents,
                    'knowledge_base_id': knowledge_base_id,
                    'data_source_id': data_source_id,
                    'count': len(documents),
                    'timestamp': datetime.now().isoformat()
                }
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(response_body)
                }
            except Exception as list_error:
                logger.error(f"❌ Error al listar documentos: {str(list_error)}")
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'error': f'Error listing documents: {str(list_error)}',
                        'knowledge_base_id': knowledge_base_id,
                        'data_source_id': data_source_id
                    })
                }
            
        elif http_method == 'POST':
            # Upload document
            body_str = event.get('body') or '{}'
            body = json.loads(body_str)
            
            # Handle file upload - expect base64 encoded content
            filename = body.get('filename')
            file_content_b64 = body.get('file_content')
            content_type = body.get('content_type', 'application/octet-stream')
            
            if not filename or not file_content_b64:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'filename and file_content are required'})
                }
            
            # Decode base64 content
            try:
                file_content = base64.b64decode(file_content_b64)
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Invalid base64 content: {str(e)}'})
                }
            
            result = doc_manager.upload_document(
                knowledge_base_id, 
                data_source_id, 
                file_content, 
                filename, 
                content_type
            )
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps(result)
            }
            
        elif http_method == 'DELETE':
            if len(path_parts) >= 4:
                if path_parts[3] == 'batch':
                    # Batch delete
                    body_str = event.get('body') or '{}'
                    body = json.loads(body_str)
                    document_ids = body.get('document_ids', [])
                    
                    if not document_ids:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({'error': 'document_ids array is required'})
                        }
                    
                    result = doc_manager.delete_documents_batch(
                        knowledge_base_id, 
                        data_source_id, 
                        document_ids
                    )
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps(result)
                    }
                else:
                    # Single document delete
                    document_id = unquote(path_parts[3])
                    result = doc_manager.delete_document(
                        knowledge_base_id, 
                        data_source_id, 
                        document_id
                    )
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps(result)
                    }
            else:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Document ID or batch operation required for DELETE'})
                }
                
        elif http_method == 'PUT':
            if len(path_parts) >= 5 and path_parts[4] == 'rename':
                # Rename document
                document_id = unquote(path_parts[3])
                body_str = event.get('body') or '{}'
                body = json.loads(body_str)
                new_name = body.get('new_name')
                
                if not new_name:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'new_name is required'})
                    }
                
                result = doc_manager.rename_document(
                    knowledge_base_id, 
                    data_source_id, 
                    document_id, 
                    new_name
                )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(result)
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid PUT operation. Expected /documents/{kb}/{ds}/{docId}/rename'})
                }
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': f'Method {http_method} not allowed'})
            }
            
    except Exception as e:
        logger.error(f"Document request processing failed: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
