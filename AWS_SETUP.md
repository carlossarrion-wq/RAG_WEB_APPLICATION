# Configuración AWS - RAG Chat Application

## 📋 Índice

1. [Configuración de AWS Cognito](#1-configuración-de-aws-cognito)
2. [Configuración de API Gateway](#2-configuración-de-api-gateway)
3. [Función Lambda Existente](#3-función-lambda-existente)
4. [Knowledge Base Configuration](#4-knowledge-base-configuration)
5. [Permisos y Políticas](#5-permisos-y-políticas)
6. [Variables de Entorno](#6-variables-de-entorno)

---

## 1. Configuración de AWS Cognito

### 1.1 Crear User Pool

```bash
# Crear User Pool via AWS CLI
aws cognito-idp create-user-pool \
  --pool-name "rag-chat-users" \
  --region eu-west-1 \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "DefaultEmailSubject": "Verificación de cuenta RAG Chat",
    "DefaultEmailMessage": "Tu código de verificación es {####}"
  }'
```

### 1.2 Crear User Pool Client

```bash
# Crear App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-name "rag-chat-web-client" \
  --region eu-west-1 \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls "http://localhost:5173" \
  --logout-urls "http://localhost:5173" \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client
```

### 1.3 Configuración Manual (AWS Console)

**Paso 1: Crear User Pool**
1. Ir a AWS Cognito Console
2. Crear nuevo User Pool
3. Configurar:
   - **Pool name**: `rag-chat-users`
   - **Sign-in options**: Email
   - **Password policy**: Mínimo 8 caracteres, mayúsculas, minúsculas, números
   - **MFA**: Opcional (recomendado: SMS o TOTP)

**Paso 2: Configurar App Client**
1. En el User Pool creado, ir a "App integration"
2. Crear App client:
   - **App client name**: `rag-chat-web-client`
   - **Client secret**: No generar
   - **Auth flows**: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`

**Paso 3: Configurar Hosted UI (Opcional)**
1. En "App integration" → "Domain"
2. Configurar dominio personalizado o usar dominio de Cognito
3. Configurar callback URLs: `http://localhost:5173`

---

## 2. Configuración de API Gateway

### 2.1 API Gateway Existente

**⚠️ IMPORTANTE**: El proyecto ya tiene un API Gateway configurado que expone la función Lambda `bedrock-kb-query-handler`.

**Configuración Actual:**
- **Endpoint**: `/kb-query`
- **Método**: POST
- **Autenticación**: API Key
- **Región**: eu-west-1

### 2.2 Integración con Cognito (Opcional)

Si se desea añadir autenticación Cognito al API Gateway:

```yaml
# api-gateway-cognito.yaml
Resources:
  CognitoAuthorizer:
    Type: AWS::ApiGateway::Authorizer
    Properties:
      Name: CognitoAuthorizer
      Type: COGNITO_USER_POOLS
      IdentitySource: method.request.header.Authorization
      RestApiId: !Ref ApiGateway
      ProviderARNs:
        - !Sub "${CognitoUserPool.Arn}"
```

### 2.3 Configuración CORS

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:eu-west-1:*:*/*/POST/kb-query",
      "Condition": {
        "StringEquals": {
          "aws:SourceIp": ["your-allowed-ips"]
        }
      }
    }
  ]
}
```

---

## 3. Función Lambda Existente

### 3.1 Información de la Función

**⚠️ NO MODIFICAR**: La función Lambda `bedrock-kb-query-handler` ya existe y funciona correctamente.

**Configuración Actual:**
- **Nombre**: `bedrock-kb-query-handler`
- **Runtime**: Python 3.11
- **Región**: eu-west-1
- **Timeout**: 5 minutos
- **Memory**: 1024 MB

### 3.2 Payload de Entrada

```json
{
  "query": "¿Cómo configurar autenticación OAuth2?",
  "model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
  "knowledge_base_id": "TJ8IMVJVQW"
}
```

### 3.3 Respuesta Esperada

```json
{
  "answer": "Para configurar autenticación OAuth2...",
  "processing_time_ms": 2340.56,
  "retrievalResults": [
    {
      "content": "Documentación relevante...",
      "location": "documento-oauth2.pdf"
    }
  ],
  "query": "¿Cómo configurar autenticación OAuth2?",
  "model_used": "anthropic.claude-sonnet-4-20250514-v1:0",
  "knowledge_base_id": "TJ8IMVJVQW",
  "total_processing_time_ms": 2340.56
}
```

---

## 4. Knowledge Base Configuration

### 4.1 Knowledge Base Existente

**⚠️ NO MODIFICAR**: La Knowledge Base ya está configurada y funcionando.

**Configuración Actual:**
- **ID**: `TJ8IMVJVQW`
- **Nombre**: Knowledge Base Principal
- **Región**: eu-west-1
- **Vector Store**: Amazon Aurora PostgreSQL
- **Embedding Model**: Amazon Titan Embeddings

### 4.2 Configuración para Múltiples KB (Futuro)

```typescript
// src/config/knowledgeBases.ts
export const knowledgeBases = [
  {
    id: 'TJ8IMVJVQW',
    name: 'Knowledge Base Principal',
    description: 'Base de conocimientos principal del sistema',
    isActive: true,
    isDefault: true
  },
  // Futuras KB se añadirán aquí
];
```

---

## 5. Permisos y Políticas

### 5.1 Política IAM para Lambda

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": [
        "arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0",
        "arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-pro-v1:0",
        "arn:aws:bedrock:eu-west-1:*:knowledge-base/TJ8IMVJVQW"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:eu-west-1:*:*"
    }
  ]
}
```

### 5.2 Política IAM para Frontend (Cognito)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:InitiateAuth",
        "cognito-idp:RespondToAuthChallenge",
        "cognito-idp:GetUser"
      ],
      "Resource": "arn:aws:cognito-idp:eu-west-1:*:userpool/*"
    }
  ]
}
```

### 5.3 Rol de Ejecución Lambda

```bash
# Crear rol de ejecución
aws iam create-role \
  --role-name bedrock-kb-query-handler-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Adjuntar políticas
aws iam attach-role-policy \
  --role-name bedrock-kb-query-handler-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

## 6. Variables de Entorno

### 6.1 Variables para el Frontend

```env
# .env.local
# AWS Configuration
VITE_AWS_REGION=eu-west-1
VITE_AWS_USER_POOL_ID=eu-west-1_XXXXXXXXX
VITE_AWS_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Configuration
VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.eu-west-1.amazonaws.com/prod
VITE_API_KEY=your-api-gateway-key

# Bedrock Configuration
VITE_DEFAULT_KNOWLEDGE_BASE_ID=TJ8IMVJVQW
VITE_DEFAULT_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
VITE_ALTERNATIVE_MODEL_ID=amazon.nova-pro-v1:0

# Application Configuration
VITE_APP_NAME=RAG Chat Application
VITE_APP_VERSION=1.0.0
```

### 6.2 Variables para Lambda (Existentes)

```env
# Variables de entorno de la función Lambda (NO MODIFICAR)
BEDROCK_REGION=eu-west-1
DEFAULT_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
KNOWLEDGE_BASE_ID=TJ8IMVJVQW
LOG_LEVEL=INFO
```

---

## 7. Configuración de Desarrollo Local

### 7.1 Proxy Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_GATEWAY_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'x-api-key': process.env.VITE_API_KEY
        }
      }
    }
  }
});
```

### 7.2 Configuración AWS Amplify

```typescript
// src/config/aws.ts
import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID,
      region: import.meta.env.VITE_AWS_REGION,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
};

Amplify.configure(awsConfig);
```

---

## 8. Testing de Configuración

### 8.1 Test de Cognito

```bash
# Test de autenticación Cognito
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

### 8.2 Test de API Gateway

```bash
# Test del endpoint existente
curl -X POST \
  https://your-api-gateway-url/kb-query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "query": "Test query",
    "model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
    "knowledge_base_id": "TJ8IMVJVQW"
  }'
```

### 8.3 Test de Lambda

```bash
# Test directo de la función Lambda
aws lambda invoke \
  --function-name bedrock-kb-query-handler \
  --payload '{"query":"Test","model_id":"anthropic.claude-sonnet-4-20250514-v1:0","knowledge_base_id":"TJ8IMVJVQW"}' \
  --region eu-west-1 \
  response.json
```

---

## 9. Troubleshooting

### 9.1 Errores Comunes de Cognito

**Error: User Pool not found**
```bash
# Verificar que el User Pool existe
aws cognito-idp describe-user-pool --user-pool-id <USER_POOL_ID>
```

**Error: Invalid client configuration**
```bash
# Verificar configuración del App Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID>
```

### 9.2 Errores de API Gateway

**Error: Forbidden (403)**
- Verificar API Key
- Verificar permisos CORS
- Verificar configuración de autorización

**Error: Internal Server Error (500)**
- Revisar logs de Lambda en CloudWatch
- Verificar configuración de variables de entorno

### 9.3 Errores de Lambda

**Error: Timeout**
- Aumentar timeout de Lambda (máximo 15 minutos)
- Optimizar consultas a Knowledge Base

**Error: Permission denied**
- Verificar políticas IAM
- Verificar permisos de Bedrock

---

## 10. Monitoreo y Logs

### 10.1 CloudWatch Logs

```bash
# Ver logs de Lambda
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/bedrock-kb-query-handler

# Ver logs en tiempo real
aws logs tail /aws/lambda/bedrock-kb-query-handler --follow
```

### 10.2 Métricas de CloudWatch

- **Lambda Duration**: Tiempo de ejecución
- **Lambda Errors**: Errores de ejecución
- **API Gateway 4XXError**: Errores de cliente
- **API Gateway 5XXError**: Errores de servidor
- **Cognito SignInSuccesses**: Logins exitosos

---

**Última actualización**: 24 de septiembre de 2024  
**Región AWS**: eu-west-1  
**Modelo Claude Sonnet 4**: anthropic.claude-sonnet-4-20250514-v1:0  
**Servicios utilizados**: Cognito, API Gateway, Lambda, Bedrock, Knowledge Base
