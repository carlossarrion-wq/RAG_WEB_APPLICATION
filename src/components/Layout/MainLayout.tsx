import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import ChatArea from '../Chat/ChatArea';
import SettingsArea from '../Settings/SettingsArea';
import DocumentsArea from '../Documents/DocumentsArea';

const MainLayout: React.FC = () => {
  const { logout, authState } = useAuth();
  const [activeSection, setActiveSection] = useState('chat');

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                RAG Chat Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Bienvenido, {authState.user?.userArn?.split('/').pop() || authState.user?.accessKeyId?.substring(0, 8) + '...' || 'Usuario'}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveSection('chat')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'chat'
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('documents')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'documents'
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documentos
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'settings'
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
