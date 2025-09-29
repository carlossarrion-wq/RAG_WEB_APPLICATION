import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { dataSourceService } from '../../services/dataSourceService';
import type { DataSource, Document } from '../../services/dataSourceService';

interface DataSourceWithDocuments extends DataSource {
  documents: Document[];
  documentsLoading: boolean;
  documentsError: string | null;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface ConfirmationModal {
  isOpen: boolean;
  type: 'delete' | 'bulkDelete';
  title: string;
  message: string;
  documentId?: string;
  documentIds?: string[];
  dataSourceIndex?: number;
  onConfirm: () => void;
}

const DocumentsArea: React.FC = () => {
  const { knowledgeBaseId, knowledgeBases } = useConfig();
  const { authState } = useAuth();
  const [dataSources, setDataSources] = useState<DataSourceWithDocuments[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Document management state
  const [uploadingFiles, setUploadingFiles] = useState<{ [dataSourceId: string]: UploadingFile[] }>({});
  const [selectedDocuments, setSelectedDocuments] = useState<{ [dataSourceId: string]: Set<string> }>({});
  const [editingDocument, setEditingDocument] = useState<{ dataSourceId: string; documentId: string; newName: string } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    type: 'delete',
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  
  // File input refs
  const fileInputRefs = useRef<{ [dataSourceId: string]: HTMLInputElement | null }>({});

  // Get current Knowledge Base info
  const currentKB = knowledgeBases.find(kb => kb.id === knowledgeBaseId);

  // Supported file types
  const supportedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  const supportedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

  // Function to load data sources and their documents
  const loadDataSources = async () => {
    if (!authState.isAuthenticated || !authState.user || !knowledgeBaseId) {
      setError('Usuario no autenticado o Knowledge Base no seleccionada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading data sources for KB:', knowledgeBaseId);
      
      // Load data sources from AWS Bedrock
      const dataSourcesList = await dataSourceService.listDataSources(authState.user, knowledgeBaseId);
      
      // Initialize data sources with empty documents
      const dataSourcesWithDocs: DataSourceWithDocuments[] = dataSourcesList.map(ds => ({
        ...ds,
        documents: [],
        documentsLoading: false,
        documentsError: null,
      }));

      setDataSources(dataSourcesWithDocs);

      // Load documents for each data source
      for (let i = 0; i < dataSourcesWithDocs.length; i++) {
        const dataSource = dataSourcesWithDocs[i];
        
        // Update loading state for this data source
        setDataSources(prev => prev.map((ds, index) => 
          index === i ? { ...ds, documentsLoading: true } : ds
        ));

        try {
          const documents = await dataSourceService.listDocumentsInDataSource(
            authState.user, 
            knowledgeBaseId, 
            dataSource.dataSourceId
          );

          // Assign dataSourceId to each document
          const documentsWithDataSourceId = documents.map(doc => ({
            ...doc,
            dataSourceId: dataSource.dataSourceId
          }));

          // Update with loaded documents
          setDataSources(prev => prev.map((ds, index) => 
            index === i ? { 
              ...ds, 
              documents: documentsWithDataSourceId, 
              documentsLoading: false,
              documentsError: null 
            } : ds
          ));
        } catch (docError) {
          // Update with error
          setDataSources(prev => prev.map((ds, index) => 
            index === i ? { 
              ...ds, 
              documents: [],
              documentsLoading: false,
              documentsError: docError instanceof Error ? docError.message : 'Error al cargar documentos'
            } : ds
          ));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar orígenes de datos';
      setError(errorMessage);
      console.error('Error loading data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load documents for a specific data source
  const loadDocumentsForDataSource = async (dataSourceIndex: number) => {
    if (!authState.isAuthenticated || !authState.user || !knowledgeBaseId) return;

    const dataSource = dataSources[dataSourceIndex];
    if (!dataSource) return;

    // Update loading state
    setDataSources(prev => prev.map((ds, index) => 
      index === dataSourceIndex ? { ...ds, documentsLoading: true, documentsError: null } : ds
    ));

    try {
      const documents = await dataSourceService.listDocumentsInDataSource(
        authState.user, 
        knowledgeBaseId, 
        dataSource.dataSourceId
      );

      // Assign dataSourceId to each document
      const documentsWithDataSourceId = documents.map(doc => ({
        ...doc,
        dataSourceId: dataSource.dataSourceId
      }));

      // Update with loaded documents
      setDataSources(prev => prev.map((ds, index) => 
        index === dataSourceIndex ? { 
          ...ds, 
          documents: documentsWithDataSourceId, 
          documentsLoading: false,
          documentsError: null 
        } : ds
      ));
    } catch (error) {
      // Update with error
      setDataSources(prev => prev.map((ds, index) => 
        index === dataSourceIndex ? { 
          ...ds, 
          documents: [],
          documentsLoading: false,
          documentsError: error instanceof Error ? error.message : 'Error al cargar documentos'
        } : ds
      ));
    }
  };

  // Load data sources when Knowledge Base changes
  useEffect(() => {
    if (knowledgeBaseId && authState.isAuthenticated) {
      loadDataSources();
    } else {
      setDataSources([]);
    }
  }, [knowledgeBaseId, authState.isAuthenticated]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get file type icon
  const getFileTypeIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    if (type.includes('image')) return '🖼️';
    return '📁';
  };

  // Validate file type
  const isValidFileType = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return supportedFileTypes.includes(file.type) || supportedExtensions.includes(extension);
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList, dataSourceId: string, dataSourceIndex: number) => {
    if (!authState.user || !knowledgeBaseId) return;

    const validFiles = Array.from(files).filter(file => {
      if (!isValidFileType(file)) {
        alert(`Archivo ${file.name} no es compatible. Tipos soportados: ${supportedExtensions.join(', ')}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Initialize uploading files
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => ({
      ...prev,
      [dataSourceId]: [...(prev[dataSourceId] || []), ...newUploadingFiles]
    }));

    // Upload files one by one
    for (const uploadingFile of newUploadingFiles) {
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => ({
            ...prev,
            [dataSourceId]: prev[dataSourceId]?.map(f => 
              f.id === uploadingFile.id 
                ? { ...f, progress: Math.min(f.progress + Math.random() * 20, 90) }
                : f
            ) || []
          }));
        }, 500);

        await dataSourceService.uploadDocument(
          authState.user,
          knowledgeBaseId,
          dataSourceId,
          uploadingFile.file
        );

        clearInterval(progressInterval);

        // Mark as completed
        setUploadingFiles(prev => ({
          ...prev,
          [dataSourceId]: prev[dataSourceId]?.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, progress: 100, status: 'completed' }
              : f
          ) || []
        }));

        // Refresh documents after a short delay
        setTimeout(() => {
          loadDocumentsForDataSource(dataSourceIndex);
        }, 1000);

      } catch (error) {
        // Mark as error
        setUploadingFiles(prev => ({
          ...prev,
          [dataSourceId]: prev[dataSourceId]?.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Error desconocido' }
              : f
          ) || []
        }));
      }
    }

    // Clean up completed/error files after 5 seconds
    setTimeout(() => {
      setUploadingFiles(prev => ({
        ...prev,
        [dataSourceId]: prev[dataSourceId]?.filter(f => f.status === 'uploading') || []
      }));
    }, 5000);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent, dataSourceId: string) => {
    e.preventDefault();
    setDragOver(dataSourceId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, dataSourceId: string, dataSourceIndex: number) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files, dataSourceId, dataSourceIndex);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, dataSourceId: string, dataSourceIndex: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files, dataSourceId, dataSourceIndex);
    }
    // Reset input
    e.target.value = '';
  };

  // Handle document selection
  const handleDocumentSelect = (dataSourceId: string, documentId: string, checked: boolean) => {
    setSelectedDocuments(prev => {
      const currentSelection = prev[dataSourceId] || new Set();
      const newSelection = new Set(currentSelection);
      
      if (checked) {
        newSelection.add(documentId);
      } else {
        newSelection.delete(documentId);
      }
      
      return {
        ...prev,
        [dataSourceId]: newSelection
      };
    });
  };

  // Handle select all documents
  const handleSelectAll = (dataSourceId: string, documents: Document[], checked: boolean) => {
    setSelectedDocuments(prev => ({
      ...prev,
      [dataSourceId]: checked ? new Set(documents.map(d => d.id)) : new Set()
    }));
  };

  // Handle delete document
  const handleDeleteDocument = (dataSourceId: string, documentId: string, dataSourceIndex: number) => {
    setConfirmationModal({
      isOpen: true,
      type: 'delete',
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.',
      documentId,
      dataSourceIndex,
      onConfirm: async () => {
        try {
          if (!authState.user || !knowledgeBaseId) return;
          
          await dataSourceService.deleteDocument(
            authState.user,
            knowledgeBaseId,
            dataSourceId,
            documentId
          );
          
          // Refresh documents
          loadDocumentsForDataSource(dataSourceIndex);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          alert(`Error al eliminar documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    });
  };

  // Handle bulk delete
  const handleBulkDelete = (dataSourceId: string, dataSourceIndex: number) => {
    const selectedIds = Array.from(selectedDocuments[dataSourceId] || []);
    if (selectedIds.length === 0) return;

    setConfirmationModal({
      isOpen: true,
      type: 'bulkDelete',
      title: 'Confirmar eliminación masiva',
      message: `¿Estás seguro de que quieres eliminar ${selectedIds.length} documento(s)? Esta acción no se puede deshacer.`,
      documentIds: selectedIds,
      dataSourceIndex,
      onConfirm: async () => {
        try {
          if (!authState.user || !knowledgeBaseId) return;
          
          await dataSourceService.deleteDocumentsBatch(
            authState.user,
            knowledgeBaseId,
            dataSourceId,
            selectedIds
          );
          
          // Clear selection and refresh documents
          setSelectedDocuments(prev => ({ ...prev, [dataSourceId]: new Set() }));
          loadDocumentsForDataSource(dataSourceIndex);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          alert(`Error al eliminar documentos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    });
  };

  // Handle rename document
  const handleRenameDocument = async (dataSourceId: string, documentId: string, dataSourceIndex: number) => {
    if (!editingDocument || !authState.user || !knowledgeBaseId) return;

    try {
      await dataSourceService.renameDocument(
        authState.user,
        knowledgeBaseId,
        dataSourceId,
        documentId,
        editingDocument.newName
      );
      
      // Refresh documents and clear editing state
      loadDocumentsForDataSource(dataSourceIndex);
      setEditingDocument(null);
    } catch (error) {
      alert(`Error al renombrar documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Start editing document name
  const startEditingDocument = (dataSourceId: string, documentId: string, currentName: string) => {
    setEditingDocument({
      dataSourceId,
      documentId,
      newName: currentName
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingDocument(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Documentos</h2>
          <p className="text-gray-600">
            Visualiza y gestiona los documentos almacenados en la Knowledge Base seleccionada
          </p>
        </div>

        {/* Knowledge Base Info */}
        {currentKB && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Knowledge Base Actual
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentKB.name}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                currentKB.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentKB.status}
              </span>
            </div>
          </div>
        )}

        {/* Data Sources and Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Orígenes de Datos y Documentos
              </h3>
              <Button
                onClick={loadDataSources}
                disabled={loading}
                variant="primary"
                size="sm"
              >
                {loading ? 'Cargando...' : 'Actualizar Lista'}
              </Button>
            </div>
          </div>

          <div className="p-6">
            {error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={loadDataSources}
                  className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                >
                  Reintentar
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando orígenes de datos...</span>
              </div>
            ) : dataSources.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📁</div>
                <p className="text-gray-500">
                  No se encontraron orígenes de datos en esta Knowledge Base
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {dataSources.map((dataSource, dataSourceIndex) => (
                  <div key={dataSource.dataSourceId} className="border border-gray-200 rounded-lg">
                    {/* Data Source Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-xl">🗂️</div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {dataSource.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              ID: {dataSource.dataSourceId}
                            </p>
                            {dataSource.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {dataSource.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            dataSource.status === 'AVAILABLE' 
                              ? 'bg-green-100 text-green-800'
                              : dataSource.status === 'CREATING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {dataSource.status}
                          </span>
                      <Button
                        onClick={() => fileInputRefs.current[dataSource.dataSourceId]?.click()}
                        variant="ghost"
                        size="sm"
                        className="flex items-center justify-center !bg-green-400 hover:!bg-green-600 !text-white font-bold w-8 h-8 min-w-8 p-0 transition-colors duration-300 ease-in-out border-0"
                        title="Subir documentos"
                      >
                        <span className="text-lg leading-none">+</span>
                      </Button>
                          <Button
                            onClick={() => loadDocumentsForDataSource(dataSourceIndex)}
                            disabled={dataSource.documentsLoading}
                            variant="secondary"
                            size="sm"
                          >
                            {dataSource.documentsLoading ? 'Cargando...' : 'Actualizar'}
                          </Button>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[dataSource.dataSourceId] = el;
                            }}
                            type="file"
                            multiple
                            accept={supportedExtensions.join(',')}
                            onChange={(e) => handleFileInputChange(e, dataSource.dataSourceId, dataSourceIndex)}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Documents in Data Source */}
                    <div className="p-4">

                      {/* Uploading Files */}
                      {uploadingFiles[dataSource.dataSourceId]?.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <h5 className="text-sm font-medium text-gray-900">Subiendo archivos:</h5>
                          {uploadingFiles[dataSource.dataSourceId].map((uploadingFile) => (
                            <div
                              key={uploadingFile.id}
                              className={`border rounded-lg p-3 ${
                                uploadingFile.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="text-lg">{getFileTypeIcon(uploadingFile.file.type)}</div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {uploadingFile.file.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({formatFileSize(uploadingFile.file.size)})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {uploadingFile.status === 'uploading' && `${Math.round(uploadingFile.progress)}%`}
                                  {uploadingFile.status === 'completed' && '✅ Completado'}
                                  {uploadingFile.status === 'error' && '❌ Error'}
                                </div>
                              </div>
                              {uploadingFile.status === 'uploading' && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadingFile.progress}%` }}
                                  ></div>
                                </div>
                              )}
                              {uploadingFile.status === 'error' && uploadingFile.error && (
                                <p className="text-xs text-red-600 mt-1">{uploadingFile.error}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Document List */}
                      {dataSource.documentsError ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-600">{dataSource.documentsError}</p>
                          <button
                            onClick={() => loadDocumentsForDataSource(dataSourceIndex)}
                            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : dataSource.documentsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600">Cargando documentos...</span>
                        </div>
                      ) : dataSource.documents.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-gray-400 text-2xl mb-2">📄</div>
                          <p className="text-gray-500 text-sm">
                            No hay documentos en este origen de datos
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Sube archivos usando el área de arriba
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Bulk Actions */}
                          {dataSource.documents.length > 0 && (
                            <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedDocuments[dataSource.dataSourceId]?.size === dataSource.documents.length &&
                                      dataSource.documents.length > 0
                                    }
                                    onChange={(e) => handleSelectAll(dataSource.dataSourceId, dataSource.documents, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    Seleccionar todos ({dataSource.documents.length})
                                  </span>
                                </label>
                                {(selectedDocuments[dataSource.dataSourceId]?.size || 0) > 0 && (
                                  <span className="text-sm text-blue-600">
                                    {selectedDocuments[dataSource.dataSourceId]?.size} seleccionados
                                  </span>
                                )}
                              </div>
                              {(selectedDocuments[dataSource.dataSourceId]?.size || 0) > 0 && (
                                <Button
                                  onClick={() => handleBulkDelete(dataSource.dataSourceId, dataSourceIndex)}
                                  variant="secondary"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  🗑️ Eliminar seleccionados
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Documents */}
                          <div className="space-y-3">
                            {dataSource.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className={`border rounded-lg p-3 transition-colors ${
                                  selectedDocuments[dataSource.dataSourceId]?.has(doc.id)
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-100 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedDocuments[dataSource.dataSourceId]?.has(doc.id) || false}
                                      onChange={(e) => handleDocumentSelect(dataSource.dataSourceId, doc.id, e.target.checked)}
                                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="text-xl mt-0.5">
                                      {getFileTypeIcon(doc.type || '')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {editingDocument?.documentId === doc.id && editingDocument?.dataSourceId === dataSource.dataSourceId ? (
                                        <div className="flex items-center space-x-2 mb-2">
                                          <input
                                            type="text"
                                            value={editingDocument.newName}
                                            onChange={(e) => setEditingDocument(prev => prev ? { ...prev, newName: e.target.value } : null)}
                                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handleRenameDocument(dataSource.dataSourceId, doc.id, dataSourceIndex);
                                              } else if (e.key === 'Escape') {
                                                cancelEditing();
                                              }
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleRenameDocument(dataSource.dataSourceId, doc.id, dataSourceIndex)}
                                            className="text-green-600 hover:text-green-700 text-sm"
                                          >
                                            ✅
                                          </button>
                                          <button
                                            onClick={cancelEditing}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                          >
                                            ❌
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2 mb-2">
                                          <h5 className="text-sm font-medium text-gray-900 truncate flex-1">
                                            {doc.name}
                                          </h5>
                                          <button
                                            onClick={() => startEditingDocument(dataSource.dataSourceId, doc.id, doc.name)}
                                            className="text-gray-400 hover:text-gray-600 text-sm"
                                            title="Editar nombre"
                                          >
                                            ✏️
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                                        <span>ID: {doc.id}</span>
                                        {doc.size && <span>{formatFileSize(doc.size)}</span>}
                                        <span>Creado: {formatDate(doc.createdAt)}</span>
                                      </div>
                                      {doc.updatedAt !== doc.createdAt && (
                                        <div className="mt-1 text-xs text-gray-500">
                                          Actualizado: {formatDate(doc.updatedAt)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                      doc.status === 'ACTIVE' 
                                        ? 'bg-green-100 text-green-800'
                                        : doc.status === 'PROCESSING'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {doc.status}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteDocument(dataSource.dataSourceId, doc.id, dataSourceIndex)}
                                      className="text-red-400 hover:text-red-600 text-sm"
                                      title="Eliminar documento"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {dataSources.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dataSources.length}</div>
                <div className="text-gray-600">Orígenes de Datos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dataSources.reduce((total, ds) => total + ds.documents.length, 0)}
                </div>
                <div className="text-gray-600">Total Documentos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dataSources.reduce((total, ds) => total + ds.documents.filter(d => d.status === 'ACTIVE').length, 0)}
                </div>
                <div className="text-gray-600">Documentos Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {dataSources.reduce((total, ds) => total + ds.documents.filter(d => d.status === 'PROCESSING').length, 0)}
                </div>
                <div className="text-gray-600">Procesando</div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmationModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="text-2xl mr-3">⚠️</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {confirmationModal.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  {confirmationModal.message}
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                    variant="secondary"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmationModal.onConfirm}
                    variant="primary"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {confirmationModal.type === 'bulkDelete' ? 'Eliminar todos' : 'Eliminar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsArea;
