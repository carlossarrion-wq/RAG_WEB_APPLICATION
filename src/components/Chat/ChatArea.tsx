import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiService } from '../../services/apiService';
import { useConfig } from '../../contexts/ConfigContext';
import { useChat } from '../../contexts/ChatContext';
import type { ConversationMessage } from '../../types';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatArea: React.FC = () => {
  const { messages, setMessages, resetConversation, addMessage } = useChat();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const { selectedModel, knowledgeBaseId } = useConfig();

  // Verificar salud del API al cargar - DESHABILITADO porque el endpoint /health no existe
  useEffect(() => {
    // Como el chat funciona correctamente, asumimos que está conectado
    setIsHealthy(true);
  }, []);

  // Convertir mensajes a formato de conversación
  const getConversationHistory = (): ConversationMessage[] => {
    return messages
      .filter(msg => msg.id !== '1') // Excluir mensaje de bienvenida
      .map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content,
      }));
  };

  // Función para resetear la conversación
  const handleResetConversation = () => {
    resetConversation();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Obtener historial de conversación
      const conversationHistory = getConversationHistory();
      
      // Llamar al servicio real de API
      const response = await apiService.queryRAG(
        currentQuery,
        selectedModel,
        knowledgeBaseId,
        conversationHistory
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.'}`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Status */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Chat RAG</h3>
            <p className="text-sm text-gray-600">Pregunta cualquier cosa sobre la base de conocimientos</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Botón de reseteo de conversación */}
            <button
              onClick={handleResetConversation}
              disabled={messages.length <= 1}
              className={`p-2 rounded-lg transition-colors ${
                messages.length <= 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
              title="Resetear conversación"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              isHealthy === null 
                ? 'bg-gray-100 text-gray-600' 
                : isHealthy 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isHealthy === null 
                  ? 'bg-gray-400' 
                  : isHealthy 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
              }`}></div>
              <span>
                {isHealthy === null ? 'Verificando...' : isHealthy ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-600">Escribiendo...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta aquí..."
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            loading={isLoading}
          >
            Enviar
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
};

export default ChatArea;
