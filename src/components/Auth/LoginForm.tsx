import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const LoginForm: React.FC = () => {
  const [accountId] = useState('iberdrola-aws');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region] = useState('eu-west-1');
  const { signIn, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      return;
    }

    await signIn(
      accountId,
      accessKeyId.trim(),
      secretAccessKey.trim(),
      region
    );
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
        overflow: 'hidden',
        padding: '2rem',
        boxSizing: 'border-box'
      }}
    >
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '2rem',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            RAG Chat Assistant
          </h1>
          <p style={{ color: '#718096', fontSize: '1rem' }}>
            Acceso seguro a tu asistente de documentos
          </p>
        </div>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleSubmit}>
          <Input
            label="Access Key ID"
            type="text"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            placeholder="AKIA..."
            required
            helperText="Tu AWS Access Key ID"
          />
          
          <Input
            label="Secret Access Key"
            type="password"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            placeholder="••••••••••••••••••••••••••••••••••••••••"
            required
            helperText="Tu AWS Secret Access Key"
          />

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.25rem',
              color: '#2d3748' 
            }}>
              Región AWS
            </label>
            <div style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              border: '2px solid rgba(0, 0, 0, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              color: '#2d3748'
            }}>
              Europe (Ireland) - eu-west-1
            </div>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#718096' }}>
              Región configurada para este proyecto
            </p>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.875rem',
              background: 'rgba(229, 62, 62, 0.1)',
              color: '#c53030',
              borderLeft: '4px solid #e53e3e'
            }}>
              <strong>Error de autenticación:</strong> {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={loading || !accessKeyId.trim() || !secretAccessKey.trim()}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
              color: 'white',
              borderRadius: '50px',
              padding: '1rem 1.5rem',
              border: 'none',
              fontWeight: '500',
              fontSize: '1.1rem',
              boxShadow: '0 4px 15px rgba(49, 151, 149, 0.3)',
              transition: 'all 0.3s ease',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !accessKeyId.trim() || !secretAccessKey.trim() ? 0.6 : 1
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Validando credenciales...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Iniciar Sesión
              </span>
            )}
          </Button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          fontSize: '0.875rem',
          background: 'rgba(66, 153, 225, 0.1)',
          color: '#3182ce',
          borderLeft: '4px solid #4299e1',
          lineHeight: '1.4'
        }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>🔒 Aviso de Seguridad</strong>
          Tus credenciales se validan contra AWS y se almacenan de forma segura en tu sesión del navegador. Solo se utilizan para autenticación con servicios AWS.
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
