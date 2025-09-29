import { 
  BedrockAgentClient, 
  ListDataSourcesCommand,
  GetDataSourceCommand 
} from '@aws-sdk/client-bedrock-agent';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { ListDataSourcesCommandInput, GetDataSourceCommandInput } from '@aws-sdk/client-bedrock-agent';
import type { IAMUser } from '../types';

export interface DataSource {
  dataSourceId: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  knowledgeBaseId: string;
}

export interface Document {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  type?: string;
  metadata?: Record<string, any>;
  dataSourceId: string;
}

class DataSourceService {
  private createBedrockAgentClient(user: IAMUser): BedrockAgentClient {
    return new BedrockAgentClient({
      region: 'eu-west-1',
      credentials: {
        accessKeyId: user.accessKeyId,
        secretAccessKey: user.secretAccessKey,
        sessionToken: user.sessionToken,
      },
    });
  }

  private createS3Client(user: IAMUser): S3Client {
    return new S3Client({
      region: 'eu-west-1',
      credentials: {
        accessKeyId: user.accessKeyId,
        secretAccessKey: user.secretAccessKey,
        sessionToken: user.sessionToken,
      },
    });
  }

  async listDataSources(user: IAMUser, knowledgeBaseId: string): Promise<DataSource[]> {
    try {
      const client = this.createBedrockAgentClient(user);
      
      const input: ListDataSourcesCommandInput = {
        knowledgeBaseId: knowledgeBaseId,
        maxResults: 100,
      };

      const command = new ListDataSourcesCommand(input);
      const response = await client.send(command);

      if (!response.dataSourceSummaries) {
        return [];
      }

      return response.dataSourceSummaries.map(ds => ({
        dataSourceId: ds.dataSourceId || '',
        name: ds.name || 'Unknown Data Source',
        description: ds.description,
        status: ds.status || 'UNKNOWN',
        createdAt: new Date().toISOString(), // DataSourceSummary doesn't have createdAt
        updatedAt: new Date().toISOString(), // DataSourceSummary doesn't have updatedAt
        knowledgeBaseId: knowledgeBaseId,
      }));
    } catch (error) {
      console.error('Error listing data sources:', error);
      throw new Error(`Failed to list data sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listDocumentsInDataSource(user: IAMUser, knowledgeBaseId: string, dataSourceId: string): Promise<Document[]> {
    console.log(`🔍 DETECTANDO DOCUMENTOS REALES para data source ${dataSourceId} en KB ${knowledgeBaseId}`);
    console.log(`🌐 URL de Lambda configurada: ${import.meta.env.VITE_LAMBDA_URL}`);
    
    try {
      // PASO 1: Intentar con Lambda primero (más confiable)
      console.log('🔄 Intentando con Lambda...');
      
      try {
        const lambdaDocuments = await this.callLambdaWithAuth(
          user,
          'GET',
          `/documents/${encodeURIComponent(knowledgeBaseId)}/${encodeURIComponent(dataSourceId)}`
        );

        if (lambdaDocuments && lambdaDocuments.documents && lambdaDocuments.documents.length > 0) {
          console.log(`✅ Lambda devolvió ${lambdaDocuments.documents.length} documentos`);
          return lambdaDocuments.documents.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            status: doc.status || 'ACTIVE',
            createdAt: doc.createdAt || doc.created_at || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.updated_at || new Date().toISOString(),
            size: doc.size,
            type: doc.type || doc.content_type || 'application/octet-stream',
            metadata: doc.metadata || {},
            dataSourceId: dataSourceId,
          }));
        } else if (lambdaDocuments && lambdaDocuments.documents) {
          console.log('⚠️ Lambda respondió correctamente pero no hay documentos en este data source');
          return [];
        } else {
          console.log('⚠️ Lambda respondió pero con formato inesperado:', lambdaDocuments);
        }
      } catch (lambdaError) {
        console.error('❌ Error específico de Lambda:', lambdaError);
        console.log('🔄 Continuando con fallback a S3...');
      }

      // PASO 2: Fallback a S3 directo si Lambda no funciona
      console.log('📋 Obteniendo configuración del data source...');
      const dataSourceConfig = await this.getDataSourceConfiguration(user, knowledgeBaseId, dataSourceId);
      
      if (!dataSourceConfig) {
        console.log('❌ No se pudo obtener la configuración del data source');
        return [];
      }

      console.log('✅ Configuración obtenida:', dataSourceConfig);

      // PASO 3: Listar documentos reales desde S3
      console.log('📁 Listando documentos reales desde S3...');
      const s3Documents = await this.listS3Documents(user, dataSourceConfig);
      
      if (s3Documents.length > 0) {
        console.log(`🎉 ¡ENCONTRADOS ${s3Documents.length} DOCUMENTOS REALES desde S3!`);
        return s3Documents.map(doc => ({ ...doc, dataSourceId }));
      } else {
        console.log('📄 No se encontraron documentos en S3');
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error general al detectar documentos:', error);
      console.log('🚫 No se pudieron detectar documentos por ningún método');
      return [];
    }
  }

  async uploadDocument(user: IAMUser, knowledgeBaseId: string, dataSourceId: string, file: File): Promise<Document> {
    try {
      console.log(`Uploading document ${file.name} to data source ${dataSourceId}`);
      
      // Convert file to base64
      const fileContent = await this.fileToBase64(file);
      
      const response = await fetch(`${import.meta.env.VITE_LAMBDA_URL}/documents/${encodeURIComponent(knowledgeBaseId)}/${encodeURIComponent(dataSourceId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          file_content: fileContent,
          content_type: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        id: result.document_id,
        name: file.name,
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: file.size,
        type: file.type || 'application/octet-stream',
        metadata: result.metadata || {},
        dataSourceId: dataSourceId,
      };
      
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocument(user: IAMUser, knowledgeBaseId: string, dataSourceId: string, documentId: string): Promise<void> {
    try {
      console.log(`Deleting document ${documentId} from data source ${dataSourceId}`);
      
      const response = await fetch(`${import.meta.env.VITE_LAMBDA_URL}/documents/${encodeURIComponent(knowledgeBaseId)}/${encodeURIComponent(dataSourceId)}/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocumentsBatch(user: IAMUser, knowledgeBaseId: string, dataSourceId: string, documentIds: string[]): Promise<void> {
    try {
      console.log(`Batch deleting ${documentIds.length} documents from data source ${dataSourceId}`);
      
      const response = await fetch(`${import.meta.env.VITE_LAMBDA_URL}/documents/${encodeURIComponent(knowledgeBaseId)}/${encodeURIComponent(dataSourceId)}/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: documentIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error batch deleting documents:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async renameDocument(user: IAMUser, knowledgeBaseId: string, dataSourceId: string, documentId: string, newName: string): Promise<void> {
    try {
      console.log(`Renaming document ${documentId} to ${newName}`);
      
      const response = await fetch(`${import.meta.env.VITE_LAMBDA_URL}/documents/${encodeURIComponent(knowledgeBaseId)}/${encodeURIComponent(dataSourceId)}/${encodeURIComponent(documentId)}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_name: newName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error renaming document:', error);
      throw new Error(`Failed to rename document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  private async getDataSourceConfiguration(user: IAMUser, knowledgeBaseId: string, dataSourceId: string): Promise<any> {
    try {
      const client = this.createBedrockAgentClient(user);
      
      const input: GetDataSourceCommandInput = {
        knowledgeBaseId: knowledgeBaseId,
        dataSourceId: dataSourceId,
      };

      const command = new GetDataSourceCommand(input);
      const response = await client.send(command);
      
      return response.dataSource?.dataSourceConfiguration;
    } catch (error) {
      console.error('Error getting data source configuration:', error);
      return null;
    }
  }

  private async listS3Documents(user: IAMUser, dataSourceConfig: any): Promise<Document[]> {
    try {
      // Extract S3 configuration from data source
      const s3Config = dataSourceConfig?.s3Configuration;
      if (!s3Config) {
        console.log('No S3 configuration found in data source');
        return [];
      }

      const bucketArn = s3Config.bucketArn;
      const inclusionPrefixes = s3Config.inclusionPrefixes || [''];
      
      // Extract bucket name from ARN (arn:aws:s3:::bucket-name)
      const bucketName = bucketArn?.split(':::')[1];
      if (!bucketName) {
        console.log('Could not extract bucket name from ARN:', bucketArn);
        return [];
      }

      console.log(`Listing objects in S3 bucket: ${bucketName}`);
      
      const s3Client = this.createS3Client(user);
      const documents: Document[] = [];

      // List objects for each inclusion prefix
      for (const prefix of inclusionPrefixes) {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: 1000,
        });

        const response = await s3Client.send(listCommand);
        
        if (response.Contents) {
          for (const object of response.Contents) {
            if (object.Key && object.Size && object.Size > 0) {
              // Skip folders (objects ending with /)
              if (!object.Key.endsWith('/')) {
                documents.push({
                  id: object.ETag?.replace(/"/g, '') || object.Key,
                  name: object.Key.split('/').pop() || object.Key,
                  status: 'ACTIVE',
                  createdAt: object.LastModified?.toISOString() || new Date().toISOString(),
                  updatedAt: object.LastModified?.toISOString() || new Date().toISOString(),
                  size: object.Size,
                  type: this.getContentTypeFromFileName(object.Key),
                  metadata: {
                    s3Key: object.Key,
                    s3Bucket: bucketName,
                    etag: object.ETag,
                  },
                  dataSourceId: '', // Will be set by caller
                });
              }
            }
          }
        }
      }

      console.log(`Found ${documents.length} real documents in S3`);
      return documents;
      
    } catch (error) {
      console.error('Error listing S3 documents:', error);
      return [];
    }
  }

  private getContentTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      case 'html':
      case 'htm':
        return 'text/html';
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'xml':
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  }

  private async callLambdaWithAuth(user: IAMUser, method: string, path: string, body?: any): Promise<any> {
    try {
      const url = `${import.meta.env.VITE_LAMBDA_URL}${path}`;
      
      // Preparar headers con credenciales AWS si están disponibles
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Agregar credenciales AWS como headers personalizados
      if (user && user.accessKeyId) {
        headers['X-AWS-Access-Key-Id'] = user.accessKeyId;
        headers['X-AWS-Secret-Access-Key'] = user.secretAccessKey;
        if (user.sessionToken) {
          headers['X-AWS-Session-Token'] = user.sessionToken;
        }
        console.log(`🔐 Usando credenciales AWS para usuario: ${user.accessKeyId.substring(0, 8)}...`);
      } else {
        console.log(`⚠️ No hay credenciales AWS disponibles, intentando sin autenticación`);
      }
      
      const requestOptions: RequestInit = {
        method: method,
        headers: headers,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        requestOptions.body = JSON.stringify(body);
      }

      console.log(`🌐 Llamando a Lambda: ${method} ${url}`);
      console.log(`📋 Headers enviados:`, Object.keys(headers));
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error en Lambda: ${response.status} - ${errorText}`);
        
        // Si es error 403 y no tenemos credenciales, es problema de autenticación
        if (response.status === 403 && !user?.accessKeyId) {
          throw new Error(`Authentication required: Please ensure you are logged in with valid AWS credentials`);
        }
        
        throw new Error(`Lambda call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Respuesta de Lambda exitosa - ${data.documents?.length || 0} documentos`);
      return data;
      
    } catch (error) {
      console.error('❌ Error en callLambdaWithAuth:', error);
      throw error;
    }
  }

  private getMockDocumentsForDataSource(dataSourceId: string, knowledgeBaseId: string): Document[] {
    // Generate different mock documents based on data source and knowledge base
    const baseDocuments = [
      {
        id: `${dataSourceId}-doc-1`,
        name: 'Technical_Documentation.pdf',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        size: 2048576,
        type: 'application/pdf',
        dataSourceId: dataSourceId,
      },
      {
        id: `${dataSourceId}-doc-2`,
        name: 'User_Manual.docx',
        status: 'ACTIVE',
        createdAt: '2024-01-20T14:15:00Z',
        updatedAt: '2024-01-20T14:15:00Z',
        size: 1024000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dataSourceId: dataSourceId,
      },
      {
        id: `${dataSourceId}-doc-3`,
        name: 'FAQ_Document.txt',
        status: 'PROCESSING',
        createdAt: '2024-01-25T09:45:00Z',
        updatedAt: '2024-01-25T09:45:00Z',
        size: 512000,
        type: 'text/plain',
        dataSourceId: dataSourceId,
      },
    ];

    // Vary the number of documents per data source
    const numDocs = Math.floor(Math.random() * 5) + 1; // 1-5 documents
    return baseDocuments.slice(0, numDocs).map((doc, index) => ({
      ...doc,
      id: `${dataSourceId}-doc-${index + 1}`,
      name: `${doc.name.split('.')[0]}_${index + 1}.${doc.name.split('.')[1]}`,
    }));
  }
}

export const dataSourceService = new DataSourceService();
