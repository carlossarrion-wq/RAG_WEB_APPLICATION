import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  resetConversation: () => void;
  addMessage: (message: Message) => void;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    content: '¡Hola! Soy tu asistente RAG. Puedo ayudarte a buscar información en la base de conocimientos. ¿En qué puedo ayudarte hoy?',
    isUser: false,
    timestamp: new Date(),
  },
];

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);

  // Cargar mensajes del localStorage al inicializar
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('chat-messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Convertir timestamps de string a Date
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('Error loading chat messages from localStorage:', error);
      setMessages(defaultMessages);
    }
  }, []);

  // Guardar mensajes en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages to localStorage:', error);
    }
  }, [messages]);

  const resetConversation = () => {
    setMessages(defaultMessages);
    localStorage.removeItem('chat-messages');
    console.log('Conversación reseteada - historial y mensajes borrados');
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const value = {
    messages,
    setMessages,
    resetConversation,
    addMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
