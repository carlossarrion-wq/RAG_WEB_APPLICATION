import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1" style={{ color: '#2d3748' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full shadow-sm placeholder-gray-400
          focus:outline-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        style={{
          padding: '1rem 1.25rem',
          border: error ? '2px solid #e53e3e' : '2px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          fontSize: '1rem',
          fontFamily: 'inherit',
          transition: 'all 0.3s ease',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(5px)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#319795';
          e.target.style.boxShadow = '0 0 0 3px rgba(49, 151, 149, 0.1)';
          e.target.style.background = 'rgba(255, 255, 255, 0.95)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#e53e3e' : 'rgba(0, 0, 0, 0.1)';
          e.target.style.boxShadow = 'none';
          e.target.style.background = 'rgba(255, 255, 255, 0.8)';
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm" style={{ color: '#a0aec0' }}>{helperText}</p>
      )}
    </div>
  );
};
