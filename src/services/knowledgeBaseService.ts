import { BedrockAgentClient, ListKnowledgeBasesCommand } from '@aws-sdk/client-bedrock-agent';
import type { IAMUser } from '../types';
import { createLogger } from '../config';

const logger = createLogger('KnowledgeBaseService');

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Servicio para gestionar Knowledge Bases de AWS Bedrock
 */
export const knowledgeBaseService = {
  /**
   * Obtiene todas las Knowledge Bases disponibles
   * @param credentials Credenciales AWS del usuario
   * @returns Lista de Knowledge Bases
   */
  async listKnowledgeBases(credentials: IAMUser): Promise<KnowledgeBase[]> {
    try {
      logger.info('Obteniendo lista de Knowledge Bases...');
      
      const client = new BedrockAgentClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new ListKnowledgeBasesCommand({
        maxResults: 50, // Máximo número de resultados
      });

      const response = await client.send(command);
      
      if (!response.knowledgeBaseSummaries) {
        logger.warn('No se encontraron Knowledge Bases');
        return [];
      }

      const knowledgeBases: KnowledgeBase[] = response.knowledgeBaseSummaries.map(kb => ({
        id: kb.knowledgeBaseId || '',
        name: kb.name || 'Sin nombre',
        description: kb.description,
        status: kb.status || 'UNKNOWN',
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      }));

      logger.info(`Se encontraron ${knowledgeBases.length} Knowledge Bases`);
      return knowledgeBases;
      
    } catch (error) {
      logger.error('Error al obtener Knowledge Bases:', error);
      
      // Manejo específico de errores
      if (error instanceof Error) {
        if (error.message.includes('AccessDenied')) {
          throw new Error('No tienes permisos para acceder a las Knowledge Bases. Verifica tus credenciales AWS.');
        }
        if (error.message.includes('UnauthorizedOperation')) {
          throw new Error('Operación no autorizada. Verifica que tu usuario tenga permisos para Bedrock Agent.');
        }
      }
      
      throw new Error('Error al obtener las Knowledge Bases. Verifica tu conexión y credenciales.');
    }
  },

  /**
   * Obtiene información detallada de una Knowledge Base específica
   * @param credentials Credenciales AWS del usuario
   * @param knowledgeBaseId ID de la Knowledge Base
   * @returns Información detallada de la Knowledge Base
   */
  async getKnowledgeBase(credentials: IAMUser, knowledgeBaseId: string): Promise<KnowledgeBase | null> {
    try {
      logger.info(`Obteniendo información de Knowledge Base: ${knowledgeBaseId}`);
      
      const client = new BedrockAgentClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new ListKnowledgeBasesCommand({
        maxResults: 50,
      });

      const response = await client.send(command);
      
      if (!response.knowledgeBaseSummaries) {
        return null;
      }

      const kb = response.knowledgeBaseSummaries.find(
        kb => kb.knowledgeBaseId === knowledgeBaseId
      );

      if (!kb) {
        logger.warn(`Knowledge Base no encontrada: ${knowledgeBaseId}`);
        return null;
      }

      return {
        id: kb.knowledgeBaseId || '',
        name: kb.name || 'Sin nombre',
        description: kb.description,
        status: kb.status || 'UNKNOWN',
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      };
      
    } catch (error) {
      logger.error('Error al obtener Knowledge Base específica:', error);
      return null;
    }
  },
};
