import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary',
    ghost: 'text-primary'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg'
  };
  
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
          borderRadius: '50px',
          boxShadow: '0 4px 15px rgba(49, 151, 149, 0.3)',
          transition: 'all 0.3s ease',
          border: 'none'
        };
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
          borderRadius: '50px',
          boxShadow: '0 4px 15px rgba(66, 153, 225, 0.3)',
          transition: 'all 0.3s ease',
          border: 'none'
        };
      case 'outline':
        return {
          background: 'rgba(49, 151, 149, 0.1)',
          color: '#319795',
          border: '2px solid rgba(49, 151, 149, 0.2)',
          borderRadius: '50px',
          transition: 'all 0.3s ease'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: '#319795',
          border: 'none',
          borderRadius: '50px',
          transition: 'all 0.3s ease'
        };
      default:
        return {};
    }
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      style={getVariantStyles(variant)}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          if (variant === 'primary' || variant === 'secondary') {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = variant === 'primary' 
              ? '0 6px 20px rgba(49, 151, 149, 0.4)'
              : '0 6px 20px rgba(66, 153, 225, 0.4)';
          } else if (variant === 'outline') {
            e.currentTarget.style.background = 'rgba(49, 151, 149, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          } else if (variant === 'ghost') {
            e.currentTarget.style.background = 'rgba(49, 151, 149, 0.1)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          if (variant === 'primary' || variant === 'secondary') {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = variant === 'primary'
              ? '0 4px 15px rgba(49, 151, 149, 0.3)'
              : '0 4px 15px rgba(66, 153, 225, 0.3)';
          } else if (variant === 'outline') {
            e.currentTarget.style.background = 'rgba(49, 151, 149, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          } else if (variant === 'ghost') {
            e.currentTarget.style.background = 'transparent';
          }
        }
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
