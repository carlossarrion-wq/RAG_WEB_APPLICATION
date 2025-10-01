# Instrucciones de Configuración - RAG Application

## Para Compañeros que Clonen el Repositorio

### 1. Configuración Inicial

Después de hacer `git clone`, sigue estos pasos:

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración local
cp .env.example .env.local
```

### 2. Configuración del Archivo .env.local

El archivo `.env.local` ya contiene la configuración correcta de la API Gateway. **NO necesitas modificar nada** en este archivo, ya que está preconfigurado con:

- ✅ URL de API Gateway: `https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev`
- ✅ Knowledge Base ID: `TJ8IMVJVQW`
- ✅ Modelos configurados: Claude Sonnet 4 y Amazon Nova Pro

### 3. Verificar que Todo Funciona

```bash
# Ejecutar la aplicación
npm run dev
```

### 4. Funcionalidades Disponibles

Una vez configurado correctamente, deberías poder ver:

- ✅ **Apartado de Chat**: Para hacer consultas a la Knowledge Base
- ✅ **Apartado de Documentos**: Para ver, subir y gestionar documentos
- ✅ **Apartado de Configuración**: Para cambiar Knowledge Base y modelos

### 5. Solución de Problemas

#### Si no ves el apartado de documentos:

1. **Verifica que tienes el archivo `.env.local`**:
   ```bash
   # Debe existir este archivo
   ls -la .env.local
   ```

2. **Verifica que la URL de la API esté configurada**:
   - Abre `.env.local`
   - Confirma que `VITE_LAMBDA_URL` esté configurado con la URL correcta

3. **Reinicia el servidor de desarrollo**:
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a ejecutar
   npm run dev
   ```

#### Si hay errores de dependencias:

```bash
# Limpiar caché e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

### 6. Autenticación

La aplicación usa **autenticación IAM directa**:

1. En la pantalla de login, introduce tus credenciales AWS:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Session Token (opcional, para credenciales temporales)

2. Las credenciales se validan usando AWS STS GetCallerIdentity

### 7. Estructura del Proyecto

```
src/
├── components/
│   ├── Auth/           # Componentes de autenticación
│   ├── Chat/           # Componentes del chat
│   ├── Documents/      # Componentes de gestión de documentos
│   ├── Layout/         # Layout principal
│   └── Settings/       # Configuración
├── contexts/           # Contextos de React
├── services/           # Servicios para APIs
└── types/             # Tipos TypeScript
```

### 8. Archivos Backend

Los archivos Python para AWS Lambda están en la raíz:

- `kb_query_handler.py` - Función Lambda principal
- `document_manager.py` - Gestor de documentos
- `bedrock_client_hybrid_search.py` - Cliente de Bedrock

### 9. Contacto

Si tienes problemas con la configuración, verifica:

1. Que tienes Node.js instalado (versión 18 o superior)
2. Que tienes acceso a AWS con las credenciales correctas
3. Que el archivo `.env.local` existe y tiene la configuración correcta

---

**¡Importante!** Si después de seguir estos pasos aún no ves el apartado de documentos, es probable que sea un problema de permisos AWS o de conectividad con la API Gateway.
