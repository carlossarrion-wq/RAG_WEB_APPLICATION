// Tipos principales para la aplicación RAG Chat

// AWS IAM User
export interface IAMUser {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  userArn?: string;
  userId?: string;
  sessionToken?: string;
}

// Authentication State
export interface AuthState {
  isAuthenticated: boolean;
  user: IAMUser | null;
  error: string | null;
  loading: boolean;
}

// Models
export type ModelType = 'Claude4' | 'NovaPro';

export interface Model {
  id: string;
  name: string;
  type: ModelType;
  description?: string;
  isActive: boolean;
}

// Knowledge Base
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault?: boolean;
  documentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat Messages
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  knowledgeBaseId?: string;
  modelId?: string;
  sources?: RetrievalResult[];
}

// Conversation History for API
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Chat State
export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  currentModel: Model | null;
  currentKnowledgeBase: KnowledgeBase | null;
}

// API Response Types
export interface KBQueryRequest {
  query: string;
  model_id: string;
  knowledge_base_id: string;
}

export interface KBQueryResponse {
  answer: string;
  processing_time_ms: number;
  retrievalResults: RetrievalResult[];
  query: string;
  model_used: string;
  knowledge_base_id: string;
  total_processing_time_ms: number;
}

export interface RetrievalResult {
  content: string;
  location: string;
  similarity_score?: number;
  metadata?: Record<string, any>;
}

// Error Types
export interface APIError {
  error: string;
  code: string;
  details?: string;
  timestamp: string;
}

// Configuration Types
export interface AppConfig {
  aws: {
    region: string;
    userPoolId: string;
    userPoolClientId: string;
  };
  api: {
    baseUrl: string;
    gatewayUrl: string;
    apiKey: string;
  };
  bedrock: {
    defaultKnowledgeBaseId: string;
    defaultModelId: string;
    alternativeModelId: string;
  };
  app: {
    name: string;
    version: string;
    description: string;
  };
  dev: {
    mode: boolean;
    logLevel: string;
  };
}

// UI State Types
export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

// Form Types
export interface LoginFormData {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  rememberMe?: boolean;
}

export interface MessageFormData {
  content: string;
}

// Connection Status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export interface SelectProps extends BaseComponentProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;

// Constants
export const MODELS: Model[] = [
  {
    id: 'anthropic.claude-sonnet-4-20250514-v1:0',
    name: 'Claude Sonnet 4',
    type: 'Claude4',
    description: 'Modelo principal de Claude Sonnet 4 con capacidades avanzadas',
    isActive: true,
  },
  {
    id: 'amazon.nova-pro-v1:0',
    name: 'Nova Pro',
    type: 'NovaPro',
    description: 'Modelo alternativo Nova Pro de Amazon',
    isActive: true,
  },
];

export const DEFAULT_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'TJ8IMVJVQW',
    name: 'Knowledge Base Principal',
    description: 'Base de conocimientos principal del sistema',
    isActive: true,
    isDefault: true,
  },
];

// API Endpoints
export const API_ENDPOINTS = {
  KB_QUERY: '/kb-query',
  HEALTH: '/health',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  AUTH_FAILED: 'Error de autenticación. Verifica tus credenciales.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  API_ERROR: 'Error en el servidor. Inténtalo de nuevo más tarde.',
  VALIDATION_ERROR: 'Datos inválidos. Verifica la información ingresada.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  MESSAGE_SENT: 'Mensaje enviado correctamente',
  SETTINGS_SAVED: 'Configuración guardada',
} as const;
