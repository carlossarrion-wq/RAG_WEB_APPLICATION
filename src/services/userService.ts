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
    
    // Buscar específicamente el tag "Person"
    const personTag = tags.find(tag => tag.Key === 'Person');
    if (personTag && personTag.Value) {
      console.log('👤 ¡ENCONTRADO TAG "Person"!');
      console.log('📝 Nombre completo desde tag Person:', personTag.Value);
      console.log('🎯 Valor extraído:', personTag.Value);
      
      // Usar el valor del tag "Person" como nombre completo
      userInfo.fullName = personTag.Value;
      userInfo.displayName = personTag.Value;
      
      // Intentar separar nombre y apellidos si contiene espacios
      const nameParts = personTag.Value.trim().split(' ');
      if (nameParts.length >= 2) {
        userInfo.firstName = nameParts[0];
        userInfo.lastName = nameParts.slice(1).join(' ');
        console.log('✂️ Nombre separado:', {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName
        });
      }
    } else {
      console.log('⚠️ No se encontró el tag "Person"');
    }
    
    // Procesar otros tags como fallback
    tags.forEach(tag => {
      if (!tag.Key || !tag.Value) return;
      
      const key = tag.Key.toLowerCase();
      const value = tag.Value;
      
      // Mostrar todos los tags para debugging
      console.log(`🏷️ Tag encontrado: "${tag.Key}" = "${tag.Value}"`);
      
      switch (key) {
        case 'firstname':
        case 'first_name':
        case 'nombre':
          if (!userInfo.firstName) userInfo.firstName = value;
          break;
        case 'lastname':
        case 'last_name':
        case 'apellido':
        case 'apellidos':
          if (!userInfo.lastName) userInfo.lastName = value;
          break;
        case 'fullname':
        case 'full_name':
        case 'nombre_completo':
        case 'displayname':
        case 'display_name':
          if (!userInfo.fullName) userInfo.fullName = value;
          break;
        case 'email':
        case 'correo':
          userInfo.email = value;
          break;
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

      // MOSTRAR INFORMACIÓN DESTACADA EN LA CONSOLA
      console.log('');
      console.log('🎉 ===============================================');
      console.log('🎉 INFORMACIÓN FINAL DEL USUARIO');
      console.log('🎉 ===============================================');
      console.log('👤 Nombre de usuario:', enhancedUser.userName);
      console.log('📝 Nombre:', enhancedUser.firstName || 'No disponible');
      console.log('📝 Apellidos:', enhancedUser.lastName || 'No disponible');
      console.log('🎯 NOMBRE COMPLETO:', enhancedUser.fullName || 'No disponible');
      console.log('🎭 Nombre para mostrar:', enhancedUser.displayName || 'No disponible');
      console.log('📧 Email:', enhancedUser.email || 'No disponible');
      console.log('🎉 ===============================================');
      console.log('');

      // Si tenemos el tag "Person", mostrarlo de forma muy destacada
      if (enhancedUser.fullName && enhancedUser.fullName !== enhancedUser.userName) {
        console.log('');
        console.log('🌟 ===============================================');
        console.log('🌟 ¡TAG "Person" ENCONTRADO Y PROCESADO!');
        console.log('🌟 ===============================================');
        console.log('🎯 NOMBRE COMPLETO EXTRAÍDO:', enhancedUser.fullName);
        console.log('🌟 ===============================================');
        console.log('');
      }

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
