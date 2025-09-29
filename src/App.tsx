import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ChatProvider } from './contexts/ChatContext';
import LoginForm from './components/Auth/LoginForm';
import MainLayout from './components/Layout/MainLayout';
import { validateConfig, createLogger } from './config';
import './App.css';

const logger = createLogger('App');

// Componente principal de la aplicación
const AppContent: React.FC = () => {
  const { authState } = useAuth();

  // Validar configuración al iniciar
  React.useEffect(() => {
    const isConfigValid = validateConfig();
    if (!isConfigValid) {
      logger.warn('Configuración incompleta detectada');
    } else {
      logger.info('Aplicación inicializada correctamente');
    }
  }, []);

  // Mostrar pantalla de login si no está autenticado
  if (!authState.isAuthenticated) {
    return <LoginForm />;
  }

  // Mostrar layout principal si está autenticado
  return <MainLayout />;
};

// Componente raíz con providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <ConfigProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;
