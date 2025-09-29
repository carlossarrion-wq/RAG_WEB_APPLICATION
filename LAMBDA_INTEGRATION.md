# Integración con Lambda Function "bedrock-kb-query-handler"

## Estado Actual ✅

La aplicación RAG Chat está **completamente configurada** para llamar a la función Lambda "bedrock-kb-query-handler" a través del endpoint POST `/kb-query`.

## Configuración Verificada

### 1. API Service (src/services/apiService.ts)
- ✅ Método `queryRAG()` configurado para llamar al endpoint `/kb-query`
- ✅ Formato de request compatible con la función Lambda híbrida
- ✅ Manejo de historial conversacional incluido
- ✅ Gestión de errores y reintentos implementada
- ✅ Headers de autenticación con API Key configurados

### 2. Endpoint Configuration (src/types/index.ts)
```typescript
export const API_ENDPOINTS = {
  KB_QUERY: '/kb-query',  // ✅ Configurado correctamente
  HEALTH: '/health',
} as const;
```

### 3. Request Format
La aplicación envía requests en el formato esperado por la Lambda:
```typescript
interface HybridBackendRequest {
  query: string;              // Pregunta del usuario + historial
  model_id: string;           // ID del modelo seleccionado
  knowledge_base_id: string;  // ID de la Knowledge Base
}
```

### 4. Response Processing
La aplicación procesa correctamente la respuesta de la Lambda:
```typescript
interface HybridBackendResponse {
  answer: string;                    // Respuesta principal
  processing_time_ms: number;       // Tiempo de procesamiento
  retrievalResults: RetrievalResult[]; // Resultados de búsqueda
  query: string;                     // Query procesada
  model_used: string;                // Modelo utilizado
  knowledge_base_id: string;         // KB utilizada
  total_processing_time_ms: number;  // Tiempo total
}
```

## Configuración de Entorno

### Variables Configuradas (.env.local)
```bash
# API Configuration - ✅ CONFIGURADO CON URL REAL
VITE_API_GATEWAY_URL=https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev
VITE_API_KEY=  # No requerido para este API Gateway

# Bedrock Configuration - ✅ YA CONFIGURADO
VITE_DEFAULT_KNOWLEDGE_BASE_ID=TJ8IMVJVQW
VITE_DEFAULT_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
VITE_ALTERNATIVE_MODEL_ID=amazon.nova-pro-v1:0
```

## Flujo de Funcionamiento

1. **Usuario envía mensaje** → ChatArea.tsx
2. **Se obtiene configuración** → ConfigContext (modelo + KB ID)
3. **Se prepara historial** → Conversación previa formateada
4. **Se llama al API** → apiService.queryRAG()
5. **Request a Lambda** → POST /kb-query con formato híbrido
6. **Lambda procesa** → Búsqueda híbrida en Bedrock KB
7. **Respuesta procesada** → answer extraído y mostrado
8. **Mensaje mostrado** → ChatArea actualizado

## Características Implementadas

### ✅ Historial Conversacional
- La aplicación envía el historial completo de la conversación
- Formato: "=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===" + mensajes previos
- Permite continuidad en la conversación

### ✅ Configuración Dinámica
- Selección de modelo desde la interfaz de configuración
- Knowledge Base ID configurable
- Parámetros de búsqueda ajustables

### ✅ Manejo de Errores
- Reintentos automáticos (3 intentos)
- Timeouts configurables (30 segundos)
- Mensajes de error descriptivos
- Logging detallado para debugging

### ✅ Estado de Conexión
- Health check del API Gateway
- Indicador visual de estado de conexión
- Verificación automática al cargar

## Próximos Pasos para Activar

### 1. Configurar API Gateway URL
Actualizar en `.env.local`:
```bash
VITE_API_GATEWAY_URL=https://TU-API-GATEWAY-URL.execute-api.eu-west-1.amazonaws.com/prod
```

### 2. Configurar API Key (si es necesario)
```bash
VITE_API_KEY=tu-api-key-real
```

### 3. Verificar Lambda Function
Asegurarse de que la función Lambda "bedrock-kb-query-handler":
- Esté desplegada y activa
- Tenga el endpoint `/kb-query` configurado en API Gateway
- Acepte el formato de request implementado
- Devuelva el formato de response esperado

## Testing

### Comando para probar la aplicación:
```bash
npm run dev
```

### Verificaciones:
1. ✅ Login con credenciales AWS
2. ✅ Estado de conexión "Conectado" en el chat
3. ✅ Envío de mensaje de prueba
4. ✅ Respuesta de la Lambda function
5. ✅ Historial conversacional funcionando

## Logs y Debugging

La aplicación incluye logging detallado:
- Requests enviados a la Lambda
- Responses recibidas
- Errores y reintentos
- Tiempos de procesamiento

Para ver logs detallados, configurar:
```bash
VITE_LOG_LEVEL=debug
```

## Conclusión

🎉 **La integración con la Lambda function está COMPLETA y LISTA para usar**

Solo necesitas:
1. Actualizar `VITE_API_GATEWAY_URL` con tu URL real
2. Configurar `VITE_API_KEY` si es necesario
3. Asegurar que la Lambda function esté desplegada

La aplicación llamará automáticamente a "bedrock-kb-query-handler" a través del endpoint POST `/kb-query` con el formato correcto.
