import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import type { AuthState, IAMUser, LoginFormData } from '../types';
import { createLogger } from '../config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../types';
import { createUserService } from '../services/userService';

const logger = createLogger('AuthContext');

interface AuthContextType {
  authState: AuthState;
  login: (accountId: string, accessKeyId: string, secretAccessKey: string, region?: string) => Promise<void>;
  signIn: (accountId: string, accessKeyId: string, secretAccessKey: string, region?: string) => Promise<void>;
  signUp: (accountId: string, accessKeyId: string, secretAccessKey: string) => Promise<void>;
  logout: () => void;
  checkAuthState: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  error: null,
  loading: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Intentar recuperar credenciales del localStorage
      const storedCredentials = localStorage.getItem('aws-credentials');
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        
        // Validar que las credenciales tengan la estructura correcta
        if (credentials.accountId && credentials.accessKeyId && credentials.secretAccessKey && credentials.region) {
          // Validar credenciales con AWS STS
          const isValid = await validateAWSCredentials(credentials);
          if (isValid) {
            setAuthState({
              isAuthenticated: true,
              user: credentials,
              error: null,
              loading: false,
            });
            logger.info('Usuario autenticado desde localStorage');
            return;
          } else {
            // Limpiar credenciales inválidas o expiradas
            localStorage.removeItem('aws-credentials');
            logger.warn('Credenciales almacenadas inválidas o expiradas');
          }
        } else {
          // Limpiar credenciales con estructura incorrecta
          localStorage.removeItem('aws-credentials');
        }
      }
      
      setAuthState(defaultAuthState);
    } catch (error) {
      logger.debug('No hay usuario autenticado:', error);
      setAuthState(defaultAuthState);
    }
  };

  const validateAWSCredentials = async (credentials: IAMUser): Promise<boolean> => {
    try {
      const stsClient = new STSClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);
      
      return !!response.Arn;
    } catch (error) {
      logger.error('Error validando credenciales AWS:', error);
      return false;
    }
  };

  const login = async (accountId: string, accessKeyId: string, secretAccessKey: string, region: string = 'eu-west-1') => {
    try {
      setAuthState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      logger.info('Iniciando proceso de autenticación con credenciales IAM temporales...');
      
      // Validar que el account ID sea el correcto
      if (accountId !== 'iberdrola-aws') {
        throw new Error('Account ID no válido para este proyecto');
      }

      const credentials: IAMUser = {
        accountId,
        accessKeyId,
        secretAccessKey,
        region,
      };

      // Validar credenciales con AWS STS
      const stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);

      // Log de la respuesta completa del inicio de sesión
      console.log('🔐 Respuesta completa del inicio de sesión AWS STS:', response);

      if (response.Arn && response.UserId) {
        const baseUser: IAMUser = {
          ...credentials,
          userArn: response.Arn,
          userId: response.UserId,
        };

        console.log('🎯 Iniciando obtención de información completa del usuario...');
        
        // Obtener información completa del usuario usando UserService
        try {
          const userService = createUserService(
            {
              accessKeyId,
              secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
            region
          );

          const enhancedUser = await userService.getUserInfo(baseUser);
          
          console.log('✅ Usuario con información completa:', enhancedUser);

          // Guardar credenciales completas en localStorage
          localStorage.setItem('aws-credentials', JSON.stringify(enhancedUser));

          setAuthState({
            isAuthenticated: true,
            user: enhancedUser,
            error: null,
            loading: false,
          });

          logger.info('Autenticación exitosa con información completa:', response.Arn);
          
        } catch (userServiceError) {
          console.log('⚠️ Error obteniendo información adicional del usuario:', userServiceError);
          console.log('📝 Continuando con información básica...');
          
          // Si falla la obtención de información adicional, usar la información básica
          localStorage.setItem('aws-credentials', JSON.stringify(baseUser));

          setAuthState({
            isAuthenticated: true,
            user: baseUser,
            error: null,
            loading: false,
          });

          logger.info('Autenticación exitosa (información básica):', response.Arn);
        }
      } else {
        throw new Error('Respuesta inválida de AWS STS');
      }
    } catch (error) {
      logger.error('Error durante la autenticación:', error);
      
      // Manejo específico de errores de AWS
      let errorMessage: string = ERROR_MESSAGES.AUTH_FAILED;
      
      if (error instanceof Error) {
        const errorCode = (error as any).name || '';
        const errorMsg = error.message.toLowerCase();
        
        if (errorCode === 'InvalidUserType' || errorMsg.includes('invalid access key')) {
          errorMessage = 'Access Key ID o Secret Access Key incorrecta';
        } else if (errorCode === 'SignatureDoesNotMatch' || errorMsg.includes('signature')) {
          errorMessage = 'Access Key ID o Secret Access Key incorrecta';
        } else if (errorCode === 'TokenRefreshRequired' || errorMsg.includes('token')) {
          errorMessage = 'Access Key ID o Secret Access Key incorrecta';
        } else if (errorCode === 'AccessDenied' || errorMsg.includes('access denied')) {
          errorMessage = 'Access Key ID o Secret Access Key incorrecta';
        } else if (errorCode === 'ExpiredToken' || errorMsg.includes('expired')) {
          errorMessage = 'Access Key ID o Secret Access Key incorrecta';
        } else if (errorMsg.includes('account id no válido')) {
          errorMessage = 'Account ID no válido para este proyecto.';
        } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
          errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else {
          errorMessage = error.message || ERROR_MESSAGES.AUTH_FAILED;
        }
      }
      
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  const logout = async () => {
    try {
      logger.info('Cerrando sesión...');
      localStorage.removeItem('aws-credentials');
      setAuthState(defaultAuthState);
      logger.info('Sesión cerrada exitosamente');
    } catch (error) {
      logger.error('Error al cerrar sesión:', error);
      // Forzar logout local incluso si hay error
      setAuthState(defaultAuthState);
    }
  };

  const signUp = async (accountId: string, accessKeyId: string, secretAccessKey: string) => {
    // Para IAM, signUp es lo mismo que login ya que las credenciales se crean externamente
    await login(accountId, accessKeyId, secretAccessKey);
  };

  const value = {
    authState,
    login,
    signIn: login, // Alias for compatibility
    signUp,
    logout,
    checkAuthState,
    loading: authState.loading,
    error: authState.error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
