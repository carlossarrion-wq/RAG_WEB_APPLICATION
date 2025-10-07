import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import ChatArea from '../Chat/ChatArea';
import SettingsArea from '../Settings/SettingsArea';
import DocumentsArea from '../Documents/DocumentsArea';

const MainLayout: React.FC = () => {
  const { logout, authState } = useAuth();
  const [activeSection, setActiveSection] = useState('chat');

  // Log información del usuario para debugging
  React.useEffect(() => {
    if (authState.user) {
      console.log('👤 Información del usuario en MainLayout:', {
        userName: authState.user.userName,
        firstName: authState.user.firstName,
        lastName: authState.user.lastName,
        fullName: authState.user.fullName,
        displayName: authState.user.displayName,
        email: authState.user.email,
        userArn: authState.user.userArn
      });
    }
  }, [authState.user]);

  const getUserDisplayName = (): string => {
    if (!authState.user) return 'Usuario';
    
    // Prioridad: displayName > fullName > firstName lastName > userName > fallback
    if (authState.user.displayName) {
      console.log('🎭 Usando displayName:', authState.user.displayName);
      return authState.user.displayName;
    }
    
    if (authState.user.fullName) {
      console.log('📝 Usando fullName:', authState.user.fullName);
      return authState.user.fullName;
    }
    
    if (authState.user.firstName || authState.user.lastName) {
      const name = `${authState.user.firstName || ''} ${authState.user.lastName || ''}`.trim();
      console.log('👥 Usando firstName + lastName:', name);
      return name;
    }
    
    if (authState.user.userName) {
      console.log('🔤 Usando userName:', authState.user.userName);
      return authState.user.userName;
    }
    
    // Fallback: extraer del ARN o usar Access Key
    const fallback = authState.user.userArn?.split('/').pop() || 
                    authState.user.accessKeyId?.substring(0, 8) + '...' || 
                    'Usuario';
    console.log('🔄 Usando fallback:', fallback);
    return fallback;
  };

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'chat':
        return <ChatArea />;
      case 'documents':
        return <DocumentsArea />;
      case 'settings':
        return <SettingsArea />;
      default:
        return <ChatArea />;
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
        padding: '2rem',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Contenedor principal con bordes redondeados */}
      <div 
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '1920px',
          maxHeight: 'calc(100vh - 4rem)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <header 
          style={{
            background: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            borderBottom: '1px solid #e5e7eb',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px'
          }}
        >
          <div style={{ maxWidth: '100%', padding: '0 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h1 
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: 0
                  }}
                >
                  RAG Chat Assistant
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#718096' }}>
                  Bienvenido, <strong style={{ color: '#2d3748' }}>{getUserDisplayName()}</strong>
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <aside 
            style={{
              width: '16rem',
              background: 'white',
              borderRight: '1px solid #e5e7eb',
              overflow: 'auto'
            }}
          >
            <nav style={{ marginTop: '2rem', padding: '0 1rem' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <button
                    onClick={() => setActiveSection('chat')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      background: activeSection === 'chat' 
                        ? 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)'
                        : 'transparent',
                      color: activeSection === 'chat' ? 'white' : '#718096',
                      borderRadius: '12px',
                      boxShadow: activeSection === 'chat' 
                        ? '0 4px 15px rgba(49, 151, 149, 0.3)'
                        : 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== 'chat') {
                        e.currentTarget.style.background = 'rgba(49, 151, 149, 0.1)';
                        e.currentTarget.style.color = '#319795';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== 'chat') {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#718096';
                      }
                    }}
                  >
                    <svg style={{ marginRight: '0.75rem', height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('documents')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      background: activeSection === 'documents' 
                        ? 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)'
                        : 'transparent',
                      color: activeSection === 'documents' ? 'white' : '#718096',
                      borderRadius: '12px',
                      boxShadow: activeSection === 'documents' 
                        ? '0 4px 15px rgba(49, 151, 149, 0.3)'
                        : 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== 'documents') {
                        e.currentTarget.style.background = 'rgba(49, 151, 149, 0.1)';
                        e.currentTarget.style.color = '#319795';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== 'documents') {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#718096';
                      }
                    }}
                  >
                    <svg style={{ marginRight: '0.75rem', height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('settings')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      background: activeSection === 'settings' 
                        ? 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)'
                        : 'transparent',
                      color: activeSection === 'settings' ? 'white' : '#718096',
                      borderRadius: '12px',
                      boxShadow: activeSection === 'settings' 
                        ? '0 4px 15px rgba(49, 151, 149, 0.3)'
                        : 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== 'settings') {
                        e.currentTarget.style.background = 'rgba(49, 151, 149, 0.1)';
                        e.currentTarget.style.color = '#319795';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== 'settings') {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#718096';
                      }
                    }}
                  >
                    <svg style={{ marginRight: '0.75rem', height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuración
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main style={{ flex: 1, overflow: 'hidden', background: '#f8f9fa' }}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
