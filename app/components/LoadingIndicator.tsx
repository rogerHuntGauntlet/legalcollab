'use client';

import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium',
  message = 'Loading...'
}) => {
  const sizeClass = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }[size];
  
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClass} border-2 border-t-2 border-gray-200 rounded-full border-t-indigo-500 animate-spin mr-2`}></div>
      <p className="text-gray-700 text-sm">{message}</p>
    </div>
  );
};

export default LoadingIndicator; 