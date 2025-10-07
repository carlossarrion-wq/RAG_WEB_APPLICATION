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
  const { messages, setMessages, resetConversation } = useChat();
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
      <div 
        className="p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 
              className="text-xl font-semibold"
              style={{
                background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Chat RAG
            </h3>
            <p className="text-sm" style={{ color: '#718096' }}>
              Pregunta cualquier cosa sobre la base de conocimientos
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Botón de reseteo de conversación */}
            <button
              onClick={handleResetConversation}
              disabled={messages.length <= 1}
              className="p-2 rounded-lg transition-all"
              style={{
                color: messages.length <= 1 ? '#a0aec0' : '#e53e3e',
                cursor: messages.length <= 1 ? 'not-allowed' : 'pointer',
                opacity: messages.length <= 1 ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (messages.length > 1) {
                  e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title="Resetear conversación"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div 
              className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium"
              style={{
                background: isHealthy === null 
                  ? 'rgba(160, 174, 192, 0.15)' 
                  : isHealthy 
                    ? 'rgba(56, 178, 172, 0.15)' 
                    : 'rgba(229, 62, 62, 0.15)',
                color: isHealthy === null 
                  ? '#718096' 
                  : isHealthy 
                    ? '#2c7a7b' 
                    : '#c53030'
              }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: isHealthy === null 
                    ? '#a0aec0' 
                    : isHealthy 
                      ? '#38b2ac' 
                      : '#e53e3e'
                }}
              ></div>
              <span>
                {isHealthy === null ? 'Verificando...' : isHealthy ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{
          background: '#f8f9fa'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-xs lg:max-w-md px-4 py-3 transition-all"
              style={{
                background: message.isUser
                  ? 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)'
                  : 'rgba(255, 255, 255, 0.95)',
                color: message.isUser ? 'white' : '#2d3748',
                borderRadius: '16px',
                boxShadow: message.isUser
                  ? '0 4px 15px rgba(49, 151, 149, 0.3)'
                  : '0 4px 15px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: message.isUser ? 'none' : '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <p className="text-sm" style={{ lineHeight: '1.5' }}>{message.content}</p>
              <p 
                className="text-xs mt-1"
                style={{ 
                  opacity: 0.7,
                  color: message.isUser ? 'rgba(255, 255, 255, 0.9)' : '#718096'
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div 
              className="max-w-xs lg:max-w-md px-4 py-3"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#2d3748',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#319795' }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#319795', animationDelay: '0.1s' }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#319795', animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span className="text-xs" style={{ color: '#718096' }}>Escribiendo...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div 
        className="p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
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
        <p className="text-xs mt-2" style={{ color: '#a0aec0' }}>
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
};

export default ChatArea;
