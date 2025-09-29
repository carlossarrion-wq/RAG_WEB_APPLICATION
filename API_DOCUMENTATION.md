# Documentación API - RAG Chat Application

## 📋 Índice

1. [Información General](#1-información-general)
2. [Autenticación](#2-autenticación)
3. [Endpoint Principal](#3-endpoint-principal)
4. [Modelos de Datos](#4-modelos-de-datos)
5. [Ejemplos de Uso](#5-ejemplos-de-uso)
6. [Códigos de Error](#6-códigos-de-error)
7. [Límites y Restricciones](#7-límites-y-restricciones)

---

## 1. Información General

### 1.1 URL Base
```
https://your-api-gateway-url.execute-api.eu-west-1.amazonaws.com/prod
```

### 1.2 Función Lambda
- **Nombre**: `bedrock-kb-query-handler`
- **Región**: eu-west-1
- **Runtime**: Python 3.11
- **Timeout**: 5 minutos

### 1.3 Características
- **Búsqueda Híbrida**: Combina búsqueda semántica y por palabras clave
- **Historial Conversacional**: Mantiene contexto de conversaciones previas
- **Múltiples Modelos**: Soporte para Claude Sonnet 4 y Nova Pro
- **Knowledge Base**: Integración con AWS Bedrock Knowledge Base

---

## 2. Autenticación

### 2.1 API Key (Actual)
```http
x-api-key: your-api-gateway-key
```

### 2.2 AWS Cognito (Futuro)
```http
Authorization: Bearer <cognito-jwt-token>
```

### 2.3 Headers Requeridos
```http
Content-Type: application/json
x-api-key: your-api-gateway-key
```

---

## 3. Endpoint Principal

### 3.1 Consulta RAG Híbrida

**Endpoint**: `POST /kb-query`

**Descripción**: Realiza una consulta híbrida utilizando la Knowledge Base y genera una respuesta contextualizada usando el modelo de IA seleccionado.

#### Request

```http
POST /kb-query
Content-Type: application/json
x-api-key: your-api-gateway-key

{
  "query": "¿Cómo configurar autenticación OAuth2 en el sistema?",
  "model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
  "knowledge_base_id": "TJ8IMVJVQW"
}
```

#### Request con Historial Conversacional

```http
POST /kb-query
Content-Type: application/json
x-api-key: your-api-gateway-key

{
  "query": "=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===\nUsuario: ¿Qué es OAuth2?\nAsistente: OAuth2 es un protocolo de autorización...\n\n=== PREGUNTA ACTUAL ===\n¿Cómo implementarlo en nuestro sistema?",
  "model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
  "knowledge_base_id": "TJ8IMVJVQW"
}
```

#### Response Exitosa (200)

```json
{
  "answer": "Para configurar autenticación OAuth2 en el sistema, basándome en la documentación disponible, te recomiendo seguir estos pasos:\n\n1. **Configuración del Proveedor OAuth2**\n   - Registra tu aplicación en el proveedor (Google, Microsoft, etc.)\n   - Obtén el Client ID y Client Secret\n   - Configura las URLs de callback\n\n2. **Implementación en el Backend**\n   - Instala las librerías necesarias para OAuth2\n   - Configura los endpoints de autorización\n   - Implementa el manejo de tokens\n\n3. **Configuración de Seguridad**\n   - Establece los scopes apropiados\n   - Configura la validación de tokens\n   - Implementa el refresh de tokens\n\nEs importante seguir las mejores prácticas de seguridad y validar todos los tokens recibidos.",
  "processing_time_ms": 2340.56,
  "retrievalResults": [
    {
      "content": "La configuración de OAuth2 requiere registrar la aplicación en el proveedor de identidad. Los pasos incluyen: 1) Registro de la aplicación, 2) Configuración de URLs de callback, 3) Obtención de credenciales (Client ID y Secret)...",
      "location": "oauth2-configuration-guide.pdf"
    },
    {
      "content": "Para implementar OAuth2 de forma segura, es esencial validar todos los tokens, usar HTTPS en todas las comunicaciones, y implementar un sistema robusto de refresh tokens...",
      "location": "security-best-practices.pdf"
    }
  ],
  "query": "¿Cómo configurar autenticación OAuth2 en el sistema?",
  "model_used": "anthropic.claude-sonnet-4-20250514-v1:0",
  "knowledge_base_id": "TJ8IMVJVQW",
  "total_processing_time_ms": 2340.56
}
```

---

## 4. Modelos de Datos

### 4.1 Request Schema

```typescript
interface KBQueryRequest {
  query: string;                    // Consulta del usuario (20-4000 caracteres)
  model_id: string;                 // ID del modelo de IA
  knowledge_base_id: string;        // ID de la Knowledge Base
}
```

#### Modelos Soportados

```typescript
type ModelId = 
  | "anthropic.claude-sonnet-4-20250514-v1:0"  // Claude Sonnet 4 (Principal)
  | "amazon.nova-pro-v1:0";                     // Nova Pro (Alternativo)
```

#### Knowledge Bases Disponibles

```typescript
type KnowledgeBaseId = "TJ8IMVJVQW";  // Knowledge Base Principal
```

### 4.2 Response Schema

```typescript
interface KBQueryResponse {
  answer: string;                           // Respuesta generada por el modelo
  processing_time_ms: number;              // Tiempo de procesamiento en ms
  retrievalResults: RetrievalResult[];     // Resultados de la búsqueda
  query: string;                           // Consulta original
  model_used: string;                      // Modelo utilizado
  knowledge_base_id: string;               // Knowledge Base utilizada
  total_processing_time_ms: number;        // Tiempo total de procesamiento
}

interface RetrievalResult {
  content: string;                         // Contenido del fragmento
  location: string;                        // Ubicación del documento
  similarity_score?: number;               // Puntuación de similitud (opcional)
  metadata?: Record<string, any>;          // Metadatos adicionales (opcional)
}
```

### 4.3 Error Schema

```typescript
interface ErrorResponse {
  error: string;                           // Mensaje de error
  code: string;                            // Código de error
  details?: string;                        // Detalles adicionales (opcional)
  timestamp: string;                       // Timestamp del error
}
```

---

## 5. Ejemplos de Uso

### 5.1 Consulta Simple

```bash
curl -X POST https://your-api-gateway-url/kb-query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "query": "¿Qué es la autenticación multifactor?",
    "model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
    "knowledge_base_id": "TJ8IMVJVQW"
  }'
```

### 5.2 Consulta con Modelo Alternativo

```bash
curl -X POST https://your-api-gateway-url/kb-query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "query": "Explica los principios de seguridad en aplicaciones web",
    "model_id": "amazon.nova-pro-v1:0",
    "knowledge_base_id": "TJ8IMVJVQW"
  }'
```

### 5.3 Consulta con Historial (JavaScript)

```javascript
const queryWithHistory = async (currentQuery, conversationHistory) => {
  // Formatear query con historial
  let formattedQuery = '';
  
  if (conversationHistory.length > 0) {
    formattedQuery += '=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===\n';
    conversationHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
      formattedQuery += `${role}: ${msg.content}\n`;
    });
    formattedQuery += '\n';
  }
  
  formattedQuery += '=== PREGUNTA ACTUAL ===\n';
  formattedQuery += currentQuery;

  const response = await fetch('/api/kb-query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key'
    },
    body: JSON.stringify({
      query: formattedQuery,
      model_id: 'anthropic.claude-sonnet-4-20250514-v1:0',
      knowledge_base_id: 'TJ8IMVJVQW'
    })
  });

  return await response.json();
};
```

### 5.4 Manejo de Errores (JavaScript)

```javascript
const handleKBQuery = async (query) => {
  try {
    const response = await fetch('/api/kb-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key'
      },
      body: JSON.stringify({
        query,
        model_id: 'anthropic.claude-sonnet-4-20250514-v1:0',
        knowledge_base_id: 'TJ8IMVJVQW'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error}`);
    }

    const data = await response.json();
    return data.answer;
    
  } catch (error) {
    console.error('Error querying KB:', error);
    throw error;
  }
};
```

---

## 6. Códigos de Error

### 6.1 Errores de Cliente (4xx)

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | Bad Request | Parámetros inválidos o faltantes |
| 401 | Unauthorized | API Key inválida o faltante |
| 403 | Forbidden | Sin permisos para acceder al recurso |
| 404 | Not Found | Endpoint no encontrado |
| 413 | Payload Too Large | Query demasiado larga (>4000 caracteres) |
| 429 | Too Many Requests | Límite de rate limiting excedido |

### 6.2 Errores de Servidor (5xx)

| Código | Error | Descripción |
|--------|-------|-------------|
| 500 | Internal Server Error | Error interno del servidor |
| 502 | Bad Gateway | Error en la función Lambda |
| 503 | Service Unavailable | Servicio temporalmente no disponible |
| 504 | Gateway Timeout | Timeout en la función Lambda |

### 6.3 Errores Específicos de Bedrock

```json
{
  "error": "Model not available",
  "code": "MODEL_NOT_AVAILABLE",
  "details": "The specified model is not available in the eu-west-1 region",
  "timestamp": "2024-09-24T14:30:00Z"
}
```

```json
{
  "error": "Knowledge Base not found",
  "code": "KB_NOT_FOUND",
  "details": "Knowledge Base TJ8IMVJVQW not found or not accessible",
  "timestamp": "2024-09-24T14:30:00Z"
}
```

```json
{
  "error": "Insufficient permissions",
  "code": "PERMISSION_DENIED",
  "details": "Lambda function does not have permissions to access Bedrock",
  "timestamp": "2024-09-24T14:30:00Z"
}
```

---

## 7. Límites y Restricciones

### 7.1 Límites de Request

| Parámetro | Límite | Descripción |
|-----------|--------|-------------|
| Query Length | 4000 caracteres | Longitud máxima de la consulta |
| Request Size | 1 MB | Tamaño máximo del payload |
| Timeout | 5 minutos | Tiempo máximo de procesamiento |

### 7.2 Rate Limiting

| Tipo | Límite | Ventana |
|------|--------|---------|
| Requests por IP | 100 | 1 minuto |
| Requests por API Key | 1000 | 1 hora |
| Concurrent Requests | 10 | Por API Key |

### 7.3 Límites de Bedrock

| Recurso | Límite | Descripción |
|---------|--------|-------------|
| Tokens por Request | 200,000 | Tokens máximos por consulta |
| Requests por Minuto | 100 | RPM por modelo |
| Knowledge Base Queries | 50 | Consultas simultáneas |

### 7.4 Mejores Prácticas

#### Optimización de Consultas
- Mantener consultas concisas y específicas
- Usar historial conversacional solo cuando sea necesario
- Limitar el historial a los últimos 5-10 intercambios

#### Manejo de Errores
- Implementar retry logic con backoff exponencial
- Manejar timeouts gracefully
- Validar parámetros antes de enviar requests

#### Performance
- Cachear respuestas cuando sea apropiado
- Usar conexiones persistentes
- Monitorear métricas de latencia

---

## 8. Monitoreo y Debugging

### 8.1 Headers de Response

```http
x-request-id: 12345678-1234-1234-1234-123456789012
x-processing-time: 2340
x-model-used: anthropic.claude-sonnet-4-20250514-v1:0
x-kb-used: TJ8IMVJVQW
```

### 8.2 Logs de CloudWatch

```bash
# Ver logs de la función Lambda
aws logs tail /aws/lambda/bedrock-kb-query-handler --follow

# Filtrar por errores
aws logs filter-log-events \
  --log-group-name /aws/lambda/bedrock-kb-query-handler \
  --filter-pattern "ERROR"
```

### 8.3 Métricas Disponibles

- **Duration**: Tiempo de ejecución de la función
- **Invocations**: Número de invocaciones
- **Errors**: Número de errores
- **Throttles**: Número de throttles
- **ConcurrentExecutions**: Ejecuciones concurrentes

---

## 9. Changelog

### v1.0.0 (Actual)
- ✅ Endpoint `/kb-query` funcional
- ✅ Soporte para Claude Sonnet 4 y Nova Pro
- ✅ Integración con Knowledge Base TJ8IMVJVQW
- ✅ Búsqueda híbrida implementada
- ✅ Historial conversacional soportado

### v1.1.0 (Futuro)
- 🔄 Autenticación con AWS Cognito
- 🔄 Múltiples Knowledge Bases
- 🔄 Métricas avanzadas
- 🔄 Rate limiting mejorado

---

**Última actualización**: 24 de septiembre de 2024  
**Versión API**: 1.0.0  
**Región**: eu-west-1  
**Modelo Principal**: anthropic.claude-sonnet-4-20250514-v1:0
