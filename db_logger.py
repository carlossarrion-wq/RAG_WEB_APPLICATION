"""
Database Logger Module for RAG Query Logs
Handles all database operations for logging queries to RDS MySQL
"""

import boto3
import pymysql
import json
import logging
import uuid
import os
import re
from datetime import datetime
from typing import Dict, Any, Optional, List

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class DatabaseLogger:
    """
    Handles logging of RAG queries to RDS MySQL database
    """
    
    def __init__(self, secret_name: str = 'rag-query-logs-db-credentials', region: str = 'eu-west-1'):
        """
        Initialize DatabaseLogger with credentials from Secrets Manager
        
        Args:
            secret_name: Name of the secret in AWS Secrets Manager
            region: AWS region
        """
        self.secret_name = secret_name
        self.region = region
        self.connection = None
        self._credentials = None
        
    def _get_credentials(self) -> Dict[str, Any]:
        """
        Retrieve database credentials from AWS Secrets Manager
        
        Returns:
            Dictionary with database credentials
        """
        if self._credentials:
            return self._credentials
            
        try:
            client = boto3.client('secretsmanager', region_name=self.region)
            response = client.get_secret_value(SecretId=self.secret_name)
            self._credentials = json.loads(response['SecretString'])
            logger.info(f"Successfully retrieved credentials from Secrets Manager")
            return self._credentials
        except Exception as e:
            logger.error(f"Error retrieving credentials from Secrets Manager: {str(e)}")
            raise
    
    def _connect(self) -> pymysql.connections.Connection:
        """
        Establish connection to RDS MySQL database
        
        Returns:
            pymysql connection object
        """
        if self.connection and self.connection.open:
            return self.connection
            
        try:
            creds = self._get_credentials()
            self.connection = pymysql.connect(
                host=creds['host'],
                user=creds['username'],
                password=creds['password'],
                database=creds['dbname'],
                port=creds.get('port', 3306),
                connect_timeout=5,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            logger.info(f"Successfully connected to database: {creds['host']}")
            return self.connection
        except Exception as e:
            logger.error(f"Error connecting to database: {str(e)}")
            raise
    
    def _close(self):
        """Close database connection"""
        if self.connection and self.connection.open:
            self.connection.close()
            logger.info("Database connection closed")
    
    def _count_words(self, text: str) -> int:
        """
        Count words in text (improved version)
        Removes extra whitespace and counts actual words
        """
        if not text:
            return 0
        # Remove extra whitespace and split by whitespace
        words = text.strip().split()
        return len(words)
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text
        Rough estimation: ~1.3 tokens per word for Spanish/English
        """
        if not text:
            return 0
        word_count = self._count_words(text)
        # Estimate tokens (roughly 1.3 tokens per word)
        return int(word_count * 1.3)
    
    def _extract_iam_info(self, event: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract IAM user information from Lambda event headers (sent from frontend)
        
        Args:
            event: Lambda event object
            
        Returns:
            Dictionary with IAM username, ARN, group, person, team, and conversation_id
        """
        iam_info = {
            'username': 'unknown',
            'arn': None,
            'group': None,
            'person': None,
            'team': None,
            'conversation_id': None
        }
        
        try:
            # Extract from HTTP headers (sent from frontend)
            headers = event.get('headers', {})
            if headers is None:
                headers = {}
            
            # Normalize header keys to lowercase for case-insensitive lookup
            headers_lower = {k.lower(): v for k, v in headers.items()}
            
            # Extract user information from custom headers
            iam_info['username'] = headers_lower.get('x-user-name', 'unknown')
            iam_info['arn'] = headers_lower.get('x-user-arn')
            iam_info['group'] = headers_lower.get('x-user-group')
            iam_info['person'] = headers_lower.get('x-user-person')
            iam_info['team'] = headers_lower.get('x-user-team')
            iam_info['conversation_id'] = headers_lower.get('x-conversation-id')
            
            logger.info(f"Extracted user info from headers: username={iam_info['username']}, person={iam_info['person']}, team={iam_info['team']}, conversation_id={iam_info['conversation_id']}")
            
            # Fallback: Try to extract from request context if headers are not present
            if iam_info['username'] == 'unknown':
                logger.info("Headers not found, trying request context...")
                request_context = event.get('requestContext', {})
                if request_context is None:
                    request_context = {}
                
                identity = request_context.get('identity', {})
                if identity is None:
                    identity = {}
                
                # Try to get IAM user from identity
                if identity and 'userArn' in identity:
                    iam_info['arn'] = identity['userArn']
                    # Extract username from ARN: arn:aws:iam::account:user/username
                    if '/user/' in iam_info['arn']:
                        iam_info['username'] = iam_info['arn'].split('/user/')[-1]
                
                # Alternative: from authorizer
                authorizer = request_context.get('authorizer', {})
                if authorizer is None:
                    authorizer = {}
                
                if authorizer and 'principalId' in authorizer:
                    iam_info['username'] = authorizer['principalId']
            
            logger.info(f"Final IAM info: username={iam_info['username']}, group={iam_info['group']}, person={iam_info['person']}, team={iam_info['team']}, conversation_id={iam_info['conversation_id']}")
            
        except Exception as e:
            logger.error(f"Error extracting IAM info: {str(e)}")
        
        return iam_info
    
    def create_query_log(self, event: Dict[str, Any], query: str, model_id: str, 
                        knowledge_base_id: str) -> str:
        """
        Create initial query log entry with 'pending' status
        
        Args:
            event: Lambda event object
            query: User query text
            model_id: LLM model ID
            knowledge_base_id: Knowledge Base ID
            
        Returns:
            query_id (UUID)
        """
        query_id = str(uuid.uuid4())
        
        try:
            connection = self._connect()
            
            # Extract IAM information (including Person and Team tags)
            iam_info = self._extract_iam_info(event)
            
            # Extract request context
            request_context = event.get('requestContext', {})
            if request_context is None:
                request_context = {}
            
            lambda_request_id = request_context.get('requestId')
            
            # Safely extract source IP
            identity_context = request_context.get('identity', {})
            if identity_context is None:
                identity_context = {}
            source_ip = identity_context.get('sourceIp')
            
            # Count words and estimate tokens
            query_word_count = self._count_words(query)
            query_char_count = len(query) if query else 0
            estimated_tokens = self._estimate_tokens(query)
            
            logger.info(f"Query metrics: {query_word_count} words, {query_char_count} chars, ~{estimated_tokens} tokens")
            
            # Store Person in iam_username and Team in iam_group if available
            username_to_store = iam_info.get('person') or iam_info['username']
            group_to_store = iam_info.get('team') or iam_info['group']
            
            with connection.cursor() as cursor:
                sql = """
                    INSERT INTO query_logs (
                        query_id, conversation_id, iam_username, iam_user_arn, iam_group,
                        person, team,
                        user_query, query_word_count, query_char_count,
                        model_id, knowledge_base_id, status,
                        lambda_request_id, api_gateway_request_id, source_ip,
                        tokens_used, request_timestamp
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                """
                cursor.execute(sql, (
                    query_id,
                    iam_info.get('conversation_id'),  # Nuevo campo conversation_id
                    username_to_store,
                    iam_info['arn'],
                    group_to_store,
                    iam_info.get('person'),  # Nueva columna person
                    iam_info.get('team'),    # Nueva columna team
                    query,
                    query_word_count,
                    query_char_count,
                    model_id,
                    knowledge_base_id,
                    'pending',
                    lambda_request_id,
                    request_context.get('requestId'),
                    source_ip,
                    estimated_tokens
                ))
                connection.commit()
                
            logger.info(f"Created query log with ID: {query_id} for user: {username_to_store} (person: {iam_info.get('person')}, team: {iam_info.get('team')}, conversation_id: {iam_info.get('conversation_id')})")
            return query_id
            
        except Exception as e:
            logger.error(f"Error creating query log: {str(e)}")
            raise
    
    def update_query_log_success(self, query_id: str, response: str, 
                                 processing_time_ms: int, tokens_used: Optional[int] = None,
                                 retrieved_docs_count: int = 0,
                                 vector_db_time_ms: Optional[int] = None,
                                 llm_time_ms: Optional[int] = None):
        """
        Update query log with successful response
        
        Args:
            query_id: Query UUID
            response: LLM response text
            processing_time_ms: Total processing time
            tokens_used: Number of tokens used (if available)
            retrieved_docs_count: Number of documents retrieved
            vector_db_time_ms: Vector DB query time
            llm_time_ms: LLM processing time
        """
        try:
            connection = self._connect()
            
            # Count words in response
            response_word_count = self._count_words(response)
            response_char_count = len(response) if response else 0
            
            # Estimate total tokens if not provided
            if tokens_used is None:
                # Estimate tokens for query + response
                tokens_used = self._estimate_tokens(response)
            
            logger.info(f"Response metrics: {response_word_count} words, {response_char_count} chars, ~{tokens_used} tokens")
            
            with connection.cursor() as cursor:
                sql = """
                    UPDATE query_logs SET
                        llm_response = %s,
                        response_word_count = %s,
                        response_char_count = %s,
                        tokens_used = %s,
                        processing_time_ms = %s,
                        vector_db_time_ms = %s,
                        llm_processing_time_ms = %s,
                        retrieved_documents_count = %s,
                        status = 'completed',
                        response_timestamp = NOW()
                    WHERE query_id = %s
                """
                cursor.execute(sql, (
                    response,
                    response_word_count,
                    response_char_count,
                    tokens_used,
                    processing_time_ms,
                    vector_db_time_ms,
                    llm_time_ms,
                    retrieved_docs_count,
                    query_id
                ))
                connection.commit()
                
            logger.info(f"Updated query log {query_id} with success status")
            
        except Exception as e:
            logger.error(f"Error updating query log: {str(e)}")
            raise
    
    def update_query_log_error(self, query_id: str, error_message: str):
        """
        Update query log with error status
        
        Args:
            query_id: Query UUID
            error_message: Error message
        """
        try:
            connection = self._connect()
            
            with connection.cursor() as cursor:
                sql = """
                    UPDATE query_logs SET
                        status = 'error',
                        error_message = %s,
                        response_timestamp = NOW()
                    WHERE query_id = %s
                """
                cursor.execute(sql, (error_message, query_id))
                connection.commit()
                
            logger.info(f"Updated query log {query_id} with error status")
            
        except Exception as e:
            logger.error(f"Error updating query log with error: {str(e)}")
    
    def log_retrieved_documents(self, query_id: str, documents: List[Dict[str, Any]]):
        """
        Log retrieved documents for a query
        
        Args:
            query_id: Query UUID
            documents: List of retrieved documents with content, location, and score
        """
        if not documents:
            return
            
        try:
            connection = self._connect()
            
            with connection.cursor() as cursor:
                sql = """
                    INSERT INTO retrieved_documents (
                        query_id, document_reference, chunk_text,
                        similarity_score, rank_position
                    ) VALUES (%s, %s, %s, %s, %s)
                """
                
                for idx, doc in enumerate(documents, start=1):
                    cursor.execute(sql, (
                        query_id,
                        doc.get('location', ''),
                        doc.get('content', ''),
                        doc.get('score', 0.0),
                        idx
                    ))
                
                connection.commit()
                
            logger.info(f"Logged {len(documents)} retrieved documents for query {query_id}")
            
        except Exception as e:
            logger.error(f"Error logging retrieved documents: {str(e)}")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self._close()
