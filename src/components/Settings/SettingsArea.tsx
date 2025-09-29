import React from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { AVAILABLE_MODELS } from '../../config';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const SettingsArea: React.FC = () => {
  const { 
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
    currentProfile,
    customPrompt,
    setCustomPrompt
  } = useConfig();

  const handleSearchParameterChange = (key: keyof typeof searchParameters, value: number) => {
    setSearchParameters({
      ...searchParameters,
      [key]: value,
    });
  };

  const resetToDefaults = () => {
    setSearchParameters({
      maxResults: 5,
      similarityThreshold: 0.7,
      temperature: 0.7,
      maxTokens: 1000,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración</h2>
          <p className="text-gray-600">Personaliza los parámetros del chat y la búsqueda RAG</p>
        </div>

        {/* Configuración del Modelo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Modelo de IA</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Modelo
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Configuración de Knowledge Base */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Base de Conocimientos</h3>
            <button
              onClick={refreshKnowledgeBases}
              disabled={loadingKnowledgeBases}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {loadingKnowledgeBases ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
          
          <div className="space-y-4">
            {knowledgeBasesError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{knowledgeBasesError}</p>
                <button
                  onClick={refreshKnowledgeBases}
                  className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Knowledge Base
                </label>
                {loadingKnowledgeBases ? (
                  <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Cargando Knowledge Bases...</span>
                  </div>
                ) : knowledgeBases.length > 0 ? (
                  <select
                    value={knowledgeBaseId}
                    onChange={(e) => setKnowledgeBaseId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    {knowledgeBases.map((kb) => (
                      <option key={kb.id} value={kb.id}>
                        {kb.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      No se encontraron Knowledge Bases. Verifica tus permisos AWS.
                    </p>
                  </div>
                )}
                
                {knowledgeBases.length > 0 && (
                  <div className="mt-2 p-4 bg-gray-100 rounded-md border">
                    {(() => {
                      const selectedKB = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
                      return selectedKB ? (
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 mb-2">
                            Actualmente se está haciendo uso de:
                          </div>
                          <div className="text-base text-gray-800 mb-1">
                            {selectedKB.name}
                          </div>
                          <div className="text-sm text-gray-600 font-mono mb-2">
                            {selectedKB.id}
                          </div>
                          <div className="flex justify-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedKB.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedKB.status}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">Knowledge Base seleccionada no encontrada</p>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Perfil del Sistema */}
        {currentProfile && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil del Sistema</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-base font-medium text-blue-900 mb-2">
                  {currentProfile.name}
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Prompt de sistema asociado a la Knowledge Base seleccionada
                </p>
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    (Puedes personalizarlo en caso necesario)
                  </p>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary resize-vertical"
                    placeholder="Ingresa el prompt de sistema personalizado..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este texto será utilizado como prompt de sistema para guiar las respuestas del modelo de IA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parámetros de Búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Parámetros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de Resultados
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={searchParameters.maxResults}
                onChange={(e) => handleSearchParameterChange('maxResults', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número máximo de documentos a recuperar (1-20)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de Similitud
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={searchParameters.similarityThreshold}
                onChange={(e) => handleSearchParameterChange('similarityThreshold', parseFloat(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Similitud mínima para incluir documentos (0.0-1.0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperatura
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={searchParameters.temperature}
                onChange={(e) => handleSearchParameterChange('temperature', parseFloat(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Creatividad de las respuestas (0.0-2.0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de Tokens
              </label>
              <input
                type="number"
                min="100"
                max="4000"
                step="100"
                value={searchParameters.maxTokens}
                onChange={(e) => handleSearchParameterChange('maxTokens', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Longitud máxima de la respuesta (100-4000)
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="text-sm"
            >
              Restaurar Valores por Defecto
            </Button>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Modelo Actual:</span>
              <span className="font-medium">
                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Knowledge Base:</span>
              <span className="font-medium font-mono text-xs">{knowledgeBaseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Región:</span>
              <span className="font-medium">eu-west-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsArea;
