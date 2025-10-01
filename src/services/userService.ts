import { IAMClient, GetUserCommand, ListUserTagsCommand } from '@aws-sdk/client-iam';
import type { IAMUser } from '../types';
import { createLogger } from '../config';

const logger = createLogger('UserService');

export class UserService {
  private iamClient: IAMClient;

  constructor(credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string) {
    this.iamClient = new IAMClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }

  /**
   * Extrae el nombre de usuario del ARN
   */
  private extractUserNameFromArn(userArn: string): string {
    try {
      // ARN format: arn:aws:iam::account-id:user/username
      const parts = userArn.split('/');
      return parts[parts.length - 1];
    } catch (error) {
      logger.error('Error extracting username from ARN:', error);
      return 'Usuario';
    }
  }

  /**
   * Convierte tags de AWS en información de usuario
   */
  private parseUserTags(tags: Array<{ Key?: string; Value?: string }>): Partial<IAMUser> {
    const userInfo: Partial<IAMUser> = {};
    
    console.log('🏷️ Tags del usuario encontrados:', tags);
    
    tags.forEach(tag => {
      if (!tag.Key || !tag.Value) return;
      
      const key = tag.Key.toLowerCase();
      const value = tag.Value;
      
      switch (key) {
        case 'firstname':
        case 'first_name':
        case 'nombre':
          userInfo.firstName = value;
          break;
        case 'lastname':
        case 'last_name':
        case 'apellido':
        case 'apellidos':
          userInfo.lastName = value;
          break;
        case 'fullname':
        case 'full_name':
        case 'nombre_completo':
        case 'displayname':
        case 'display_name':
          userInfo.fullName = value;
          break;
        case 'email':
        case 'correo':
          userInfo.email = value;
          break;
        default:
          console.log(`🏷️ Tag no reconocido: ${tag.Key} = ${tag.Value}`);
      }
    });
    
    return userInfo;
  }

  /**
   * Genera nombre completo a partir de firstName y lastName
   */
  private generateFullName(firstName?: string, lastName?: string): string | undefined {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName;
  }

  /**
   * Obtiene información completa del usuario desde AWS IAM
   */
  async getUserInfo(baseUser: IAMUser): Promise<IAMUser> {
    console.log('👤 Iniciando obtención de información del usuario...');
    console.log('📋 Usuario base:', {
      userArn: baseUser.userArn,
      userId: baseUser.userId,
      accountId: baseUser.accountId
    });

    let enhancedUser: IAMUser = { ...baseUser };

    try {
      // Extraer nombre de usuario del ARN como fallback
      if (baseUser.userArn) {
        enhancedUser.userName = this.extractUserNameFromArn(baseUser.userArn);
        console.log('📝 Nombre de usuario extraído del ARN:', enhancedUser.userName);
      }

      // Intentar obtener información del usuario desde IAM
      try {
        console.log('🔍 Intentando obtener información del usuario con GetUser...');
        
        const getUserCommand = new GetUserCommand({
          UserName: enhancedUser.userName
        });
        
        const userResponse = await this.iamClient.send(getUserCommand);
        console.log('✅ Respuesta de GetUser:', userResponse);

        if (userResponse.User) {
          // Obtener tags del usuario
          console.log('🏷️ Obteniendo tags del usuario...');
          
          const listTagsCommand = new ListUserTagsCommand({
            UserName: enhancedUser.userName
          });
          
          const tagsResponse = await this.iamClient.send(listTagsCommand);
          console.log('✅ Respuesta de ListUserTags:', tagsResponse);

          if (tagsResponse.Tags && tagsResponse.Tags.length > 0) {
            const userInfoFromTags = this.parseUserTags(tagsResponse.Tags);
            enhancedUser = { ...enhancedUser, ...userInfoFromTags };
            console.log('📊 Información extraída de tags:', userInfoFromTags);
          } else {
            console.log('⚠️ No se encontraron tags para el usuario');
          }
        }

      } catch (iamError: any) {
        console.log('⚠️ Error obteniendo información de IAM:', iamError.message);
        console.log('📝 Usando información básica del ARN como fallback');
      }

      // Generar nombre completo si no existe pero tenemos firstName y lastName
      if (!enhancedUser.fullName && (enhancedUser.firstName || enhancedUser.lastName)) {
        enhancedUser.fullName = this.generateFullName(enhancedUser.firstName, enhancedUser.lastName);
        console.log('🔄 Nombre completo generado:', enhancedUser.fullName);
      }

      // Usar userName como displayName si no tenemos nombre completo
      if (!enhancedUser.displayName) {
        enhancedUser.displayName = enhancedUser.fullName || enhancedUser.userName || 'Usuario';
        console.log('🎭 Nombre para mostrar:', enhancedUser.displayName);
      }

      console.log('🎉 Información final del usuario:', {
        userName: enhancedUser.userName,
        firstName: enhancedUser.firstName,
        lastName: enhancedUser.lastName,
        fullName: enhancedUser.fullName,
        displayName: enhancedUser.displayName,
        email: enhancedUser.email
      });

      return enhancedUser;

    } catch (error: any) {
      console.error('❌ Error general obteniendo información del usuario:', error);
      
      // En caso de error, devolver al menos la información básica
      enhancedUser.displayName = enhancedUser.userName || 'Usuario';
      
      return enhancedUser;
    }
  }
}

/**
 * Función helper para crear una instancia del UserService
 */
export const createUserService = (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string) => {
  return new UserService(credentials, region);
};
