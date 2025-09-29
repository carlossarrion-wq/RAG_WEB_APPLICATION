# Guía de Desarrollo - RAG Chat Application

## 📋 Índice

1. [MVP - Versión Inicial](#1-mvp---versión-inicial)
2. [Análisis del Proyecto Base](#2-análisis-del-proyecto-base)
3. [Configuración Inicial del Proyecto](#3-configuración-inicial-del-proyecto)
4. [Migración de Autenticación a AWS Cognito](#4-migración-de-autenticación-a-aws-cognito)
5. [Adaptación de la Interfaz Existente](#5-adaptación-de-la-interfaz-existente)
6. [Integración con Lambda Existente](#6-integración-con-lambda-existente)
7. [Mejoras Propuestas](#7-mejoras-propuestas)

---

## 1. MVP - Versión Inicial

### 🎯 Objetivo Principal
Crear una aplicación basada en el proyecto existente `FrontalRAG` pero con mejoras clave:
- **Migrar de autenticación AWS Keys a AWS Cognito**
- **Mantener la interfaz de chat existente**
- **Respetar la función Lambda `bedrock-kb-query-handler`**
- **Usar el endpoint `/kb-query` existente**
- **Aplicar la paleta de colores del `dashboard.css`**

### 🚀 Funcionalidades MVP
1. ✅ Login con AWS Cognito (reemplazar autenticación actual)
2. ✅ Interfaz de chat basada en el diseño existente
3. ✅ Selector de modelos (Claude Sonnet 4 y Nova Pro)
4. ✅ Selector de Knowledge Base (TJ8IMVJVQW por defecto)
5. ✅ Conexión con Lambda function existente
6. ✅ Paleta de colores del dashboard.css

---

## 2. Análisis del Proyecto Base

### 📁 Estructura Actual (FrontalRAG)
```
FrontalRAG/src/
├── components/
│   ├── Auth/LoginForm.tsx              # ✅ Mantener diseño, cambiar lógica
│   ├── Chat/ChatArea.tsx               # ✅ Mantener funcionalidad
│   ├── Chat/MessageList.tsx            # ✅ Mantener
│   ├── Chat/MessageInput.tsx           # ✅ Mantener
│   ├── Configuration/ModelSelector.tsx # ✅ Mantener
│   ├── Configuration/OriginConfig.tsx  # ✅ Adaptar para KB selector
│   └── Layout/MainLayout.tsx           # ✅ Mantener estructura
├── contexts/AuthContext.tsx            # 🔄 Migrar a Cognito
├── services/apiService.ts              # ✅ Mantener (usa /kb-query)
└── types/index.ts                      # 🔄 Adaptar para Cognito
```

### 🔍 Funcionalidades Existentes a Mantener
- **Chat Interface**: Funcional con historial conversacional
- **Model Selection**: Claude4 y NovaPro
- **Knowledge Base Integration**: Usa endpoint `/kb-query`
- **Connection Status**: Indicador de estado del backend
- **Message History**: Gestión de conversaciones
- **Reset Conversation**: Funcionalidad de reseteo

### 🔧 Integración Backend Existente
- **Endpoint**: `/api/kb-query` (via proxy Vite)
- **Lambda Function**: `bedrock-kb-query-handler`
- **Knowledge Base ID**: `TJ8IMVJVQW`
- **Modelos Soportados**: 
  - `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - `amazon.nova-pro-v1:0`

---

## 3. Configuración Inicial del Proyecto

### 3.1 Inicialización con Vite y Dependencias Actualizadas

```bash
# Crear proyecto con Vite y TypeScript
npm create vite@latest . -- --template react-ts

# Instalar dependencias base
npm install

# Instalar dependencias específicas (últimas versiones)
npm install @aws-sdk/client-lambda@^3.658.0
npm install @aws-amplify/ui-react@^6.6.0
npm install aws-amplify@^6.6.0
npm install react-router-dom@^6.26.0
npm install react-hook-form@^7.53.0
npm install lucide-react@^0.445.0
npm install tailwindcss@^3.4.0
npm install uuid@^10.0.0
npm install @types/uuid@^10.0.0

# Dependencias de desarrollo
npm install -D @types/node@^22.0.0
npm install -D autoprefixer@^10.4.0
npm install -D postcss@^8.4.0
npm install -D typescript@^5.6.0
```

### 3.2 Configuración de Variables de Entorno

Crear archivo `.env.local`:
```env
# AWS Configuration
VITE_AWS_REGION=eu-west-1
VITE_AWS_USER_POOL_ID=your_cognito_user_pool_id
VITE_AWS_USER_POOL_CLIENT_ID=your_cognito_client_id

# Bedrock Configuration
VITE_DEFAULT_KNOWLEDGE_BASE_ID=TJ8IMVJVQW
VITE_DEFAULT_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
VITE_ALTERNATIVE_MODEL_ID=amazon.nova-pro-v1:0

# API Configuration (mantener endpoint existente)
VITE_API_BASE_URL=/api
VITE_LAMBDA_ENDPOINT=/kb-query

# Application Configuration
VITE_APP_NAME=RAG Chat Application
VITE_APP_VERSION=1.0.0
```

**Estado**: ⏳ **PENDIENTE**

---

## 4. Migración de Autenticación a AWS Cognito

### 4.1 Configuración de AWS Amplify

```typescript
// src/config/aws.ts
import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID,
      region: import.meta.env.VITE_AWS_REGION,
    }
  }
};

Amplify.configure(awsConfig);
```

### 4.2 Actualización del AuthContext

```typescript
// src/contexts/AuthContext.tsx
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

// Cambiar de AWSCredentials a CognitoUser
interface CognitoUser {
  username: string;
  email?: string;
  accessToken: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  error: string | null;
  loading: boolean;
}
```

### 4.3 Actualización del LoginForm

```typescript
// src/components/Auth/LoginForm.tsx
// Cambiar de campos AWS Keys a email/password
const [credentials, setCredentials] = useState({
  email: '',
  password: '',
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await login(credentials.email, credentials.password);
};
```

**Estado**: ⏳ **PENDIENTE**

---

## 5. Adaptación de la Interfaz Existente

### 5.1 Aplicación de Paleta de Colores dashboard.css

**Colores Principales:**
- **Primary**: `#1e4a72` (azul oscuro)
- **Secondary**: `#2d5aa0` (azul medio)
- **Background**: `#f8f9fa` (gris claro)
- **Success**: `#27ae60` (verde)
- **Warning**: `#e67e22` (naranja)
- **Error**: `#f56565` (rojo)

### 5.2 Componentes a Mantener (con nuevos estilos)

```typescript
// src/components/Layout/MainLayout.tsx
// Mantener estructura, aplicar colores dashboard.css

// src/components/Chat/ChatArea.tsx
// Mantener funcionalidad, actualizar estilos

// src/components/Configuration/ModelSelector.tsx
// Mantener lógica, aplicar nuevos estilos
```

### 5.3 Selector de Knowledge Base Mejorado

```typescript
// src/components/Configuration/KnowledgeBaseSelector.tsx
interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

const knowledgeBases: KnowledgeBase[] = [
  {
    id: 'TJ8IMVJVQW',
    name: 'Knowledge Base Principal',
    description: 'Base de conocimientos principal del sistema',
    isActive: true
  }
  // Preparado para futuras KB
];
```

**Estado**: ⏳ **PENDIENTE**

---

## 6. Integración con Lambda Existente

### 6.1 Mantener apiService.ts

```typescript
// src/services/apiService.ts
// ✅ MANTENER - Ya funciona correctamente
// ✅ Usa endpoint /kb-query
// ✅ Integra con bedrock-kb-query-handler
// ✅ Soporta historial conversacional
```

### 6.2 Actualizar Autenticación en Llamadas API

```typescript
// src/services/apiService.ts
const getAuthHeaders = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};
```

### 6.3 Configuración del Proxy Vite

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://your-api-gateway-url',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'x-api-key': 'your-api-key'
        }
      }
    }
  }
});
```

**Estado**: ⏳ **PENDIENTE**

---

## 7. Mejoras Propuestas

### 7.1 Mejoras Identificadas del Proyecto Actual

**🔍 Análisis del Código Existente:**

1. **Autenticación Mejorada**: 
   - ❌ Actual: AWS Keys manuales (inseguro)
   - ✅ Propuesta: AWS Cognito (seguro, escalable)

2. **Gestión de Estado**:
   - ❌ Actual: useState local
   - ✅ Propuesta: Context API + React Query

3. **Manejo de Errores**:
   - ❌ Actual: Errores básicos
   - ✅ Propuesta: Error boundaries + notificaciones

4. **Persistencia**:
   - ❌ Actual: Solo en memoria
   - ✅ Propuesta: localStorage + IndexedDB

### 7.2 Mejoras Técnicas Propuestas

**¿Te gustaría que implemente estas mejoras?**

1. **React Query para Cache**: Mejor gestión de estado servidor
2. **Error Boundaries**: Manejo robusto de errores
3. **Persistencia Local**: Historial de conversaciones
4. **Loading States**: Mejores indicadores de carga
5. **Responsive Design**: Optimización móvil
6. **Dark Mode**: Tema oscuro opcional

### 7.3 Funcionalidades Futuras

**Fase 2 - Expansiones:**
- Múltiples Knowledge Bases
- Exportar conversaciones
- Búsqueda en historial
- Configuración avanzada de modelos
- Analytics de uso

**Estado**: 📋 **PENDIENTE APROBACIÓN**

---

## 📊 Progreso del Desarrollo

### Fase 1 - MVP (Actual)
- [x] **Análisis del proyecto existente**
- [x] **Documentación actualizada**
- [ ] **Configuración del nuevo proyecto**
- [ ] **Migración a AWS Cognito**
- [ ] **Adaptación de estilos dashboard.css**
- [ ] **Testing de integración con Lambda**
- [ ] **MVP funcional completo**

### Fase 2 - Mejoras (Futuro)
- [ ] **Implementar mejoras técnicas aprobadas**
- [ ] **Funcionalidades adicionales**
- [ ] **Optimización y testing**

---

## 🔄 Actualizaciones

**Última actualización**: 24 de septiembre de 2024  
**Próxima revisión**: Después de completar migración a Cognito

---

## 📝 Decisiones Técnicas Clave

### ✅ Mantener del Proyecto Existente
- Estructura de componentes de chat
- Integración con Lambda `/kb-query`
- Lógica de selección de modelos
- Gestión de historial conversacional
- Proxy configuration de Vite

### 🔄 Migrar/Actualizar
- Sistema de autenticación (AWS Keys → Cognito)
- Paleta de colores (aplicar dashboard.css)
- Versiones de dependencias (a las últimas)
- Tipos TypeScript (adaptar a Cognito)

### 🆕 Añadir Nuevo
- Configuración AWS Amplify
- Selector de Knowledge Base mejorado
- Error handling robusto
- Mejoras de UX propuestas

---

## ⚠️ Restricciones Importantes

1. **NO crear nueva función Lambda** - Usar `bedrock-kb-query-handler` existente
2. **Respetar endpoint `/kb-query`** - No cambiar la API
3. **Mantener Knowledge Base ID** - `TJ8IMVJVQW` como principal
4. **Aplicar paleta dashboard.css** - Colores específicos requeridos
5. **Consultar mejoras** - Pedir aprobación antes de implementar

---

*Esta guía se actualiza conforme avanza el desarrollo basado en el proyecto existente.*
