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
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        backgroundColor: '#5a6c7d',
        margin: 0,
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          border: '4px solid white',
          boxSizing: 'border-box'
        }}
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Autenticación
          </h2>
          <p className="text-sm text-gray-600">
            Ingresa tus respectivas credenciales
          </p>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Región AWS
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 text-sm">
              Europe (Ireland) - eu-west-1
            </div>
            <p className="text-xs text-gray-500 mt-1">Región configurada para este proyecto</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={loading || !accessKeyId.trim() || !secretAccessKey.trim()}
            style={{
              backgroundColor: '#27ae60',
              color: 'white',
              borderRadius: '25px',
              padding: '12px 24px',
              border: 'none',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
