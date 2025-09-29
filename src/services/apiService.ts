import type { 
  KBQueryRequest, 
  KBQueryResponse, 
  ConversationMessage, 
  APIError 
} from '../types';
import { API_ENDPOINTS } from '../types';
import { appConfig, createLogger, APP_CONSTANTS } from '../config';

const logger = createLogger('ApiService');

// Interfaces para la comunicación con el backend híbrido
interface HybridBackendRequest {
  query: string;
  model_id: string;
  knowledge_base_id: string;
}

interface HybridBackendResponse {
  answer: string;
  processing_time_ms: number;
  retrievalResults: RetrievalResult[];
  query: string;
  model_used: string;
  knowledge_base_id: string;
  total_processing_time_ms: number;
}

interface RetrievalResult {
  content: string;
  location: string;
  similarity_score?: number;
  metadata?: Record<string, any>;
}

/**
 * Formatea el historial conversacional junto con la nueva pregunta
 * @param conversationHistory Historial de mensajes previos
 * @param currentQuery Nueva pregunta del usuario
 * @returns String formateado para el campo query
 */
const formatQueryWithHistory = (
  conversationHistory: ConversationMessage[],
  currentQuery: string
): string => {
  let formattedQuery = '';
  
  // Agregar historial si existe
  if (conversationHistory && conversationHistory.length > 0) {
    formattedQuery += '=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===\n';
    
    conversationHistory.forEach((message) => {
      const role = message.role === 'user' ? 'Usuario' : 'Asistente';
      formattedQuery += `${role}: ${message.content}\n`;
    });
    
    formattedQuery += '\n';
  }
  
  // Agregar pregunta actual
  formattedQuery += '=== PREGUNTA ACTUAL ===\n';
  formattedQuery += currentQuery;
  
  return formattedQuery;
};

/**
 * Obtiene los headers de autenticación
 * @returns Headers con autenticación
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    // Para IAM, podríamos usar las credenciales almacenadas para firmar requests
    // Por ahora usamos API Key
    
    return {
      'Content-Type': 'application/json',
      'x-api-key': appConfig.api.apiKey,
    };
  } catch (error) {
    logger.error('Error getting auth headers:', error);
    return {
      'Content-Type': 'application/json',
      'x-api-key': appConfig.api.apiKey,
    };
  }
};

/**
 * Maneja errores de la API
 * @param error Error de la respuesta
 * @param response Response object
 * @returns Error formateado
 */
const handleApiError = async (error: any, response?: Response): Promise<APIError> => {
  let apiError: APIError = {
    error: 'Error desconocido',
    code: 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  };

  if (response) {
    try {
      const errorData = await response.json();
      apiError = {
        error: errorData.error || `Error HTTP ${response.status}`,
        code: errorData.code || `HTTP_${response.status}`,
        details: errorData.details || response.statusText,
        timestamp: errorData.timestamp || new Date().toISOString(),
      };
    } catch {
      apiError = {
        error: `Error HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
        details: response.statusText,
        timestamp: new Date().toISOString(),
      };
    }
  } else if (error instanceof Error) {
    apiError = {
      error: error.message,
      code: 'NETWORK_ERROR',
      details: error.stack,
      timestamp: new Date().toISOString(),
    };
  }

  return apiError;
};

/**
 * Realiza una petición HTTP con reintentos
 * @param url URL de la petición
 * @param options Opciones de fetch
 * @param retries Número de reintentos
 * @returns Response
 */
const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  retries: number = APP_CONSTANTS.MAX_RETRIES
): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APP_CONSTANTS.API_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || i === retries) {
        return response;
      }
      
      // Si no es el último intento y el error es recuperable, reintentamos
      if (response.status >= 500 || response.status === 429) {
        logger.warn(`Intento ${i + 1} falló con status ${response.status}, reintentando...`);
        await new Promise(resolve => setTimeout(resolve, APP_CONSTANTS.RETRY_DELAY * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      
      logger.warn(`Intento ${i + 1} falló:`, error);
      await new Promise(resolve => setTimeout(resolve, APP_CONSTANTS.RETRY_DELAY * (i + 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
};

/**
 * Servicio para comunicarse con el backend RAG
 */
export const apiService = {
  /**
   * Envía una consulta al backend RAG híbrido
   * @param query Texto de la consulta
   * @param modelId ID del modelo a utilizar
   * @param knowledgeBaseId ID de la knowledge base
   * @param conversationHistory Historial de la conversación (opcional)
   * @returns Respuesta del backend
   */
  async queryRAG(
    query: string,
    modelId: string,
    knowledgeBaseId: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<string> {
    try {
      logger.info('Enviando consulta al backend RAG híbrido:', query);
      logger.debug('Modelo seleccionado:', modelId);
      logger.debug('Knowledge Base ID:', knowledgeBaseId);
      
      if (conversationHistory && conversationHistory.length > 0) {
        logger.debug('Enviando historial conversacional:', conversationHistory.length, 'mensajes');
      }
      
      // Formatear la query con el historial conversacional
      const formattedQuery = formatQueryWithHistory(conversationHistory || [], query);
      
      logger.debug('Query formateada con historial:', formattedQuery);
      
      // Preparar la solicitud con el formato híbrido
      const request: HybridBackendRequest = {
        query: formattedQuery,
        model_id: modelId,
        knowledge_base_id: knowledgeBaseId,
      };
      
      // Obtener headers de autenticación
      const headers = await getAuthHeaders();
      
      // Realizar la llamada a la API
      const response = await fetchWithRetry(`${appConfig.api.baseUrl}${API_ENDPOINTS.KB_QUERY}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const apiError = await handleApiError(null, response);
        logger.error('Error en la llamada a la API:', apiError);
        throw new Error(apiError.error);
      }
      
      // Procesar la respuesta híbrida
      const data: HybridBackendResponse = await response.json();
      
      // Extraer el contenido principal de la respuesta
      if (data.answer) {
        logger.info('Respuesta recibida del backend híbrido');
        logger.debug('Tiempo de procesamiento:', data.processing_time_ms, 'ms');
        logger.debug('Modelo usado:', data.model_used);
        logger.debug('Resultados de recuperación:', data.retrievalResults?.length || 0);
        return data.answer;
      } else {
        logger.error('Respuesta del backend sin contenido válido:', data);
        throw new Error('La respuesta del backend no contiene contenido válido');
      }
    } catch (error) {
      logger.error('Error al consultar el backend RAG híbrido:', error);
      
      // Personalizar el mensaje de error según el tipo
      if (error instanceof Error) {
        if (error.message.includes('AbortError') || error.message.includes('timeout')) {
          throw new Error('La consulta ha tardado demasiado tiempo. Por favor, inténtalo de nuevo.');
        }
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Comprueba el estado de salud del backend
   * @returns Estado de salud del backend
   */
  async checkHealth(): Promise<boolean> {
    try {
      logger.debug('Comprobando estado de salud del backend');
      
      const headers = await getAuthHeaders();
      
      const response = await fetchWithRetry(`${appConfig.api.baseUrl}${API_ENDPOINTS.HEALTH}`, {
        method: 'GET',
        headers,
      }, 1); // Solo un intento para health check
      
      const isHealthy = response.ok;
      logger.debug('Estado de salud del backend:', isHealthy ? 'saludable' : 'no disponible');
      
      return isHealthy;
    } catch (error) {
      logger.error('Error al comprobar el estado de salud del backend:', error);
      return false;
    }
  },

  /**
   * Obtiene información del sistema
   * @returns Información del sistema
   */
  async getSystemInfo(): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetchWithRetry(`${appConfig.api.baseUrl}/system/info`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Error getting system info: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Error getting system info:', error);
      throw error;
    }
  },
};

export default apiService;
