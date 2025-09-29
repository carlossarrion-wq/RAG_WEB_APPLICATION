import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { appConfig, APP_CONSTANTS } from '../config';
import { knowledgeBaseService, type KnowledgeBase } from '../services/knowledgeBaseService';
import { useAuth } from './AuthContext';

interface SystemProfile {
  id: string;
  name: string;
  defaultPrompt: string;
}

interface ConfigContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  knowledgeBaseId: string;
  setKnowledgeBaseId: (id: string) => void;
  searchParameters: SearchParameters;
  setSearchParameters: (params: SearchParameters) => void;
  knowledgeBases: KnowledgeBase[];
  loadingKnowledgeBases: boolean;
  knowledgeBasesError: string | null;
  refreshKnowledgeBases: () => void;
  systemProfiles: SystemProfile[];
  currentProfile: SystemProfile | null;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
}

interface SearchParameters {
  maxResults: number;
  similarityThreshold: number;
  temperature: number;
  maxTokens: number;
}

const defaultSearchParameters: SearchParameters = {
  maxResults: 5,
  similarityThreshold: 0.7,
  temperature: 0.7,
  maxTokens: 1000,
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

interface ConfigProviderProps {
  children: ReactNode;
}

// System profiles mapping - using name-based matching instead of ID
const systemProfiles: SystemProfile[] = [
  {
    id: 'e2e-rag-knowledgebase-pgvector',
    name: 'Perfil de Darwin',
    defaultPrompt: 'Texto personalizado de Darwin por definir.'
  },
  {
    id: 'sap-newco-e2e-rag-knowledgebase-pgvector',
    name: 'Perfil de SAP Newco',
    defaultPrompt: 'Texto personalizado de SAP Newco por definir.'
  },
  {
    id: 'sap-gadea-e2e-rag-knowledgebase-pgvector',
    name: 'Perfil de SAP Gadea',
    defaultPrompt: 'Texto personalizado de SAP Gadea por definir.'
  },
  {
    id: 'mulesoft-e2e-rag-knowledgebase-pgvector',
    name: 'Perfil de Mulesoft',
    defaultPrompt: 'Texto personalizado de Mulesoft por definir.'
  }
];

// Helper function to find profile by Knowledge Base name or ID
const findProfileByKnowledgeBase = (knowledgeBaseId: string, knowledgeBases: KnowledgeBase[]): SystemProfile | null => {
  const selectedKB = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
  if (!selectedKB) return null;

  // Try to match by name patterns
  if (selectedKB.name) {
    const kbName = selectedKB.name.toLowerCase();
    
    // Check for specific patterns in the KB name
    if (kbName.includes('sap-newco')) {
      return systemProfiles.find(profile => profile.name.includes('SAP Newco')) || null;
    }
    if (kbName.includes('sap-gadea')) {
      return systemProfiles.find(profile => profile.name.includes('SAP Gadea')) || null;
    }
    if (kbName.includes('mulesoft')) {
      return systemProfiles.find(profile => profile.name.includes('Mulesoft')) || null;
    }
    if (kbName.includes('e2e-rag-knowledgebase-pgvector') && !kbName.includes('sap') && !kbName.includes('mulesoft')) {
      return systemProfiles.find(profile => profile.name.includes('Darwin')) || null;
    }
  }

  // Fallback: try to match by exact ID
  return systemProfiles.find(profile => profile.id === knowledgeBaseId) || null;
};

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const { authState } = useAuth();
  const [selectedModel, setSelectedModelState] = useState(appConfig.bedrock.defaultModelId);
  const [knowledgeBaseId, setKnowledgeBaseIdState] = useState(appConfig.bedrock.defaultKnowledgeBaseId);
  const [searchParameters, setSearchParametersState] = useState<SearchParameters>(defaultSearchParameters);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);
  const [knowledgeBasesError, setKnowledgeBasesError] = useState<string | null>(null);
  const [customPrompt, setCustomPromptState] = useState<string>('');

  // Cargar configuración desde localStorage al inicializar
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.USER_PREFERENCES);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.selectedModel) setSelectedModelState(config.selectedModel);
        if (config.knowledgeBaseId) setKnowledgeBaseIdState(config.knowledgeBaseId);
        if (config.searchParameters) setSearchParametersState(config.searchParameters);
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  }, []);

  // Guardar configuración en localStorage cuando cambie
  const saveConfig = (newConfig: Partial<{ selectedModel: string; knowledgeBaseId: string; searchParameters: SearchParameters }>) => {
    try {
      const currentConfig = {
        selectedModel,
        knowledgeBaseId,
        searchParameters,
        ...newConfig,
      };
      localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(currentConfig));
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    saveConfig({ selectedModel: model });
  };

  const setKnowledgeBaseId = (id: string) => {
    setKnowledgeBaseIdState(id);
    saveConfig({ knowledgeBaseId: id });
  };

  const setSearchParameters = (params: SearchParameters) => {
    setSearchParametersState(params);
    saveConfig({ searchParameters: params });
  };

  // Función para cargar Knowledge Bases
  const refreshKnowledgeBases = async () => {
    if (!authState.isAuthenticated || !authState.user) {
      setKnowledgeBasesError('Usuario no autenticado');
      return;
    }

    setLoadingKnowledgeBases(true);
    setKnowledgeBasesError(null);

    try {
      const kbs = await knowledgeBaseService.listKnowledgeBases(authState.user);
      setKnowledgeBases(kbs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar Knowledge Bases';
      setKnowledgeBasesError(errorMessage);
      console.error('Error loading knowledge bases:', error);
    } finally {
      setLoadingKnowledgeBases(false);
    }
  };

  // Cargar Knowledge Bases cuando el usuario se autentica
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      refreshKnowledgeBases();
    }
  }, [authState.isAuthenticated]);

  // Get current profile based on selected knowledge base
  const currentProfile = findProfileByKnowledgeBase(knowledgeBaseId, knowledgeBases);

  // Update custom prompt when profile changes
  useEffect(() => {
    if (currentProfile) {
      setCustomPromptState(currentProfile.defaultPrompt);
    }
  }, [currentProfile]);

  const setCustomPrompt = (prompt: string) => {
    setCustomPromptState(prompt);
  };

  const value = {
    selectedModel,
    setSelectedModel,
    knowledgeBaseId,
    setKnowledgeBaseId,
    searchParameters,
    setSearchParameters,
    knowledgeBases,
    loadingKnowledgeBases,
    knowledgeBasesError,
    refreshKnowledgeBases,
    systemProfiles,
    currentProfile,
    customPrompt,
    setCustomPrompt,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};
