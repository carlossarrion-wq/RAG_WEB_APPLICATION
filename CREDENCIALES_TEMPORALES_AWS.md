# Cómo Generar Credenciales Temporales de AWS

## 🔐 **Sistema de Autenticación Implementado**

La aplicación ahora usa **autenticación real con AWS STS** usando credenciales temporales IAM. No hay simulación - se conecta directamente con AWS.

## 📋 **Campos de Login**

- **Account ID**: `iberdrola-aws` (fijo, no editable)
- **Access Key ID**: Tu Access Key temporal
- **Secret Access Key**: Tu Secret Key temporal  
- **Región**: `eu-west-1` (fija, no editable)

## 🛠️ **Métodos para Generar Credenciales Temporales**

### **Método 1: AWS CLI (Recomendado)**

```bash
# Generar credenciales temporales por 1 hora
aws sts get-session-token --duration-seconds 3600

# Generar credenciales temporales por 12 horas
aws sts get-session-token --duration-seconds 43200
```

**Respuesta esperada:**
```json
{
    "Credentials": {
        "AccessKeyId": "ASIA...",
        "SecretAccessKey": "...",
        "SessionToken": "...",
        "Expiration": "2024-09-24T17:48:00Z"
    }
}
```

### **Método 2: AWS Console**

1. **Ir a IAM Console** → Security Credentials
2. **Crear Access Key** (si no tienes)
3. **Usar AWS CloudShell** para generar temporales:
   ```bash
   aws sts get-session-token --duration-seconds 3600
   ```

### **Método 3: Programáticamente**

```python
import boto3

# Crear cliente STS
sts = boto3.client('sts')

# Generar credenciales temporales
response = sts.get_session_token(DurationSeconds=3600)

print("Access Key ID:", response['Credentials']['AccessKeyId'])
print("Secret Access Key:", response['Credentials']['SecretAccessKey'])
print("Session Token:", response['Credentials']['SessionToken'])
```

## ⚠️ **Importante sobre Session Tokens**

- **La aplicación NO requiere Session Token** en el formulario
- **Pero internamente STS puede generar uno** para credenciales temporales
- **El AuthContext maneja automáticamente** el Session Token si existe

## 🔍 **Validación de Credenciales**

La aplicación valida las credenciales usando:
```javascript
aws sts get-caller-identity
```

Esto verifica:
- ✅ Credenciales válidas
- ✅ Permisos de acceso
- ✅ Account ID correcto
- ✅ Región correcta

## 📝 **Ejemplo de Uso**

1. **Generar credenciales:**
   ```bash
   aws sts get-session-token --duration-seconds 3600
   ```

2. **Copiar del resultado:**
   - `AccessKeyId` → Campo "Access Key ID"
   - `SecretAccessKey` → Campo "Secret Access Key"

3. **Login en la aplicación** con esas credenciales

## 🕐 **Duración de Credenciales**

- **Mínimo**: 15 minutos (900 segundos)
- **Máximo**: 36 horas (129,600 segundos)
- **Recomendado**: 1-12 horas para desarrollo

## 🚨 **Errores Comunes**

### **"Access Key ID inválido"**
- Verifica que copiaste correctamente el AccessKeyId
- Asegúrate de que las credenciales no hayan expirado

### **"Secret Access Key incorrecto"**
- Verifica que copiaste correctamente el SecretAccessKey
- No incluyas espacios o caracteres extra

### **"Account ID no válido"**
- El sistema solo acepta el account "iberdrola-aws"
- No puedes cambiar este valor

### **"Credenciales expiradas"**
- Genera nuevas credenciales temporales
- Verifica la fecha de expiración

## 🔄 **Renovación Automática**

- **La aplicación NO renueva automáticamente** las credenciales
- **Cuando expiren**, tendrás que:
  1. Generar nuevas credenciales
  2. Hacer logout
  3. Login con las nuevas credenciales

## 🛡️ **Seguridad**

- ✅ **Credenciales temporales** - Expiran automáticamente
- ✅ **Validación real** - Conecta directamente con AWS STS
- ✅ **No almacena contraseñas** - Solo metadatos en localStorage
- ✅ **Account ID fijo** - No permite otros accounts
- ✅ **Región fija** - Solo eu-west-1

## 🎯 **Próximos Pasos**

1. **Genera credenciales temporales** usando uno de los métodos
2. **Inicia sesión** en la aplicación
3. **Prueba el chat** - Debería funcionar con autenticación real
4. **Cuando expiren**, repite el proceso

¡La autenticación ahora es completamente real y funcional!
