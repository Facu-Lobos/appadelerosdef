import React from 'react';

interface AppLogoProps {
  variant?: 'default' | 'small';
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ variant = 'default', className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/app-logo.PNG"
        alt="APPadeleros"
        className={`object-contain ${variant === 'small' ? 'h-12' : 'h-14'}`}
      />
    </div>
  );
};

export default AppLogo;
