import boto3
import json
import logging
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
from urllib.parse import unquote

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class DocumentManager:
    """Manager for document operations in S3 and Bedrock Knowledge Base."""
    
    def __init__(self, region_name='eu-west-1'):
        """Initialize AWS clients."""
        self.s3_client = boto3.client('s3', region_name=region_name)
        self.bedrock_agent_client = boto3.client('bedrock-agent', region_name=region_name)
        self.region = region_name
        
        # Allowed file types
        self.allowed_extensions = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    
    def get_data_source_config(self, knowledge_base_id, data_source_id):
        """Get data source configuration to find S3 bucket and prefix."""
        try:
            response = self.bedrock_agent_client.get_data_source(
                knowledgeBaseId=knowledge_base_id,
                dataSourceId=data_source_id
            )
            
            data_source = response.get('dataSource', {})
            s3_config = data_source.get('dataSourceConfiguration', {}).get('s3Configuration', {})
            
            bucket_arn = s3_config.get('bucketArn', '')
            inclusion_prefixes = s3_config.get('inclusionPrefixes', [''])
            
            # Extract bucket name from ARN
            bucket_name = bucket_arn.split(':::')[-1] if bucket_arn else None
            
            return {
                'bucket_name': bucket_name,
                'prefixes': inclusion_prefixes,
                'data_source': data_source
            }
            
        except Exception as e:
            logger.error(f"Error getting data source config: {str(e)}")
            raise
    
    def list_documents(self, knowledge_base_id, data_source_id):
        """List all documents in a data source."""
        try:
            logger.info(f"Listing documents for data source {data_source_id} in KB {knowledge_base_id}")
            
            # Get data source configuration
            config = self.get_data_source_config(knowledge_base_id, data_source_id)
            bucket_name = config['bucket_name']
            prefixes = config['prefixes']
            
            if not bucket_name:
                logger.error("No bucket name found in data source configuration")
                return []
            
            documents = []
            
            # List objects for each prefix
            for prefix in prefixes:
                try:
                    paginator = self.s3_client.get_paginator('list_objects_v2')
                    pages = paginator.paginate(
                        Bucket=bucket_name,
                        Prefix=prefix,
                        MaxKeys=1000
                    )
                    
                    for page in pages:
                        if 'Contents' in page:
                            for obj in page['Contents']:
                                key = obj['Key']
                                
                                # Skip folders
                                if key.endswith('/'):
                                    continue
                                
                                # Get file extension
                                file_ext = os.path.splitext(key)[1].lower()
                                if file_ext not in self.allowed_extensions:
                                    continue
                                
                                # Extract filename from key
                                filename = os.path.basename(key)
                                
                                document = {
                                    'id': key,  # Use S3 key as document ID
                                    'name': filename,
                                    'status': 'ACTIVE',
                                    'createdAt': obj['LastModified'].isoformat(),
                                    'updatedAt': obj['LastModified'].isoformat(),
                                    'size': obj['Size'],
                                    'type': self.allowed_extensions[file_ext],
                                    'metadata': {
                                        's3Key': key,
                                        's3Bucket': bucket_name,
                                        'etag': obj['ETag'].strip('"')
                                    }
                                }
                                
                                documents.append(document)
                                
                except Exception as e:
                    logger.error(f"Error listing objects with prefix {prefix}: {str(e)}")
                    continue
            
            logger.info(f"Found {len(documents)} documents in data source {data_source_id}")
            return documents
            
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            raise
    
    def upload_document(self, knowledge_base_id, data_source_id, file_content, filename, content_type):
        """Upload a document to the data source."""
        try:
            logger.info(f"Uploading document {filename} to data source {data_source_id}")
            
            # Validate file type
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in self.allowed_extensions:
                raise ValueError(f"File type {file_ext} not allowed. Allowed types: {list(self.allowed_extensions.keys())}")
            
            # Get data source configuration
            config = self.get_data_source_config(knowledge_base_id, data_source_id)
            bucket_name = config['bucket_name']
            prefixes = config['prefixes']
            
            if not bucket_name:
                raise ValueError("No bucket name found in data source configuration")
            
            # Use first prefix or empty string
            prefix = prefixes[0] if prefixes else ''
            
            # Generate S3 key
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = filename.replace(' ', '_')
            s3_key = f"{prefix}{timestamp}_{safe_filename}" if prefix else f"{timestamp}_{safe_filename}"
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    'original_filename': filename,
                    'uploaded_at': datetime.now().isoformat(),
                    'data_source_id': data_source_id,
                    'knowledge_base_id': knowledge_base_id
                }
            )
            
            # Trigger Knowledge Base sync (optional - KB will sync automatically)
            try:
                self.bedrock_agent_client.start_ingestion_job(
                    knowledgeBaseId=knowledge_base_id,
                    dataSourceId=data_source_id
                )
                logger.info(f"Started ingestion job for data source {data_source_id}")
            except Exception as e:
                logger.warning(f"Could not start ingestion job: {str(e)}")
            
            # Return document info
            return {
                'id': s3_key,
                'name': filename,
                'status': 'ACTIVE',
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat(),
                'size': len(file_content),
                'type': self.allowed_extensions[file_ext],
                'metadata': {
                    's3Key': s3_key,
                    's3Bucket': bucket_name,
                    'original_filename': filename
                }
            }
            
        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            raise
    
    def delete_document(self, knowledge_base_id, data_source_id, document_id):
        """Delete a single document."""
        try:
            logger.info(f"Deleting document {document_id} from data source {data_source_id}")
            
            # Get data source configuration
            config = self.get_data_source_config(knowledge_base_id, data_source_id)
            bucket_name = config['bucket_name']
            
            if not bucket_name:
                raise ValueError("No bucket name found in data source configuration")
            
            # Delete from S3
            self.s3_client.delete_object(
                Bucket=bucket_name,
                Key=document_id  # document_id is the S3 key
            )
            
            # Trigger Knowledge Base sync
            try:
                self.bedrock_agent_client.start_ingestion_job(
                    knowledgeBaseId=knowledge_base_id,
                    dataSourceId=data_source_id
                )
                logger.info(f"Started ingestion job for data source {data_source_id}")
            except Exception as e:
                logger.warning(f"Could not start ingestion job: {str(e)}")
            
            logger.info(f"Document {document_id} deleted successfully")
            
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise
    
    def delete_documents_batch(self, knowledge_base_id, data_source_id, document_ids):
        """Delete multiple documents."""
        try:
            logger.info(f"Deleting {len(document_ids)} documents from data source {data_source_id}")
            
            # Get data source configuration
            config = self.get_data_source_config(knowledge_base_id, data_source_id)
            bucket_name = config['bucket_name']
            
            if not bucket_name:
                raise ValueError("No bucket name found in data source configuration")
            
            # Prepare delete objects request
            delete_objects = {
                'Objects': [{'Key': doc_id} for doc_id in document_ids]
            }
            
            # Delete from S3
            response = self.s3_client.delete_objects(
                Bucket=bucket_name,
                Delete=delete_objects
            )
            
            # Check for errors
            if 'Errors' in response and response['Errors']:
                logger.error(f"Some documents could not be deleted: {response['Errors']}")
            
            # Trigger Knowledge Base sync
            try:
                self.bedrock_agent_client.start_ingestion_job(
                    knowledgeBaseId=knowledge_base_id,
                    dataSourceId=data_source_id
                )
                logger.info(f"Started ingestion job for data source {data_source_id}")
            except Exception as e:
                logger.warning(f"Could not start ingestion job: {str(e)}")
            
            logger.info(f"Batch delete completed for {len(document_ids)} documents")
            
        except Exception as e:
            logger.error(f"Error deleting documents batch: {str(e)}")
            raise
    
    def rename_document(self, knowledge_base_id, data_source_id, document_id, new_name):
        """Rename a document by copying it with a new name and deleting the old one."""
        try:
            logger.info(f"Renaming document {document_id} to {new_name}")
            
            # Validate new filename
            file_ext = os.path.splitext(new_name)[1].lower()
            if file_ext not in self.allowed_extensions:
                raise ValueError(f"File type {file_ext} not allowed")
            
            # Get data source configuration
            config = self.get_data_source_config(knowledge_base_id, data_source_id)
            bucket_name = config['bucket_name']
            prefixes = config['prefixes']
            
            if not bucket_name:
                raise ValueError("No bucket name found in data source configuration")
            
            # Generate new S3 key
            prefix = prefixes[0] if prefixes else ''
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = new_name.replace(' ', '_')
            new_s3_key = f"{prefix}{timestamp}_{safe_filename}" if prefix else f"{timestamp}_{safe_filename}"
            
            # Copy object with new key
            copy_source = {
                'Bucket': bucket_name,
                'Key': document_id
            }
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=bucket_name,
                Key=new_s3_key,
                MetadataDirective='REPLACE',
                Metadata={
                    'original_filename': new_name,
                    'renamed_at': datetime.now().isoformat(),
                    'data_source_id': data_source_id,
                    'knowledge_base_id': knowledge_base_id
                }
            )
            
            # Delete old object
            self.s3_client.delete_object(
                Bucket=bucket_name,
                Key=document_id
            )
            
            # Trigger Knowledge Base sync
            try:
                self.bedrock_agent_client.start_ingestion_job(
                    knowledgeBaseId=knowledge_base_id,
                    dataSourceId=data_source_id
                )
                logger.info(f"Started ingestion job for data source {data_source_id}")
            except Exception as e:
                logger.warning(f"Could not start ingestion job: {str(e)}")
            
            logger.info(f"Document renamed successfully from {document_id} to {new_s3_key}")
            
            return {
                'old_id': document_id,
                'new_id': new_s3_key,
                'new_name': new_name
            }
            
        except Exception as e:
            logger.error(f"Error renaming document: {str(e)}")
            raise
