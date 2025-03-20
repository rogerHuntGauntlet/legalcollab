'use client';

import React, { useState } from 'react';

interface DownloadButtonProps {
  documentId: string;
  className?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  documentId,
  className = ''
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      // Create a hidden anchor element
      const link = document.createElement('a');
      link.href = `/api/download-document?id=${documentId}`;
      link.download = ''; // Let the server set the filename
      link.target = '_blank';
      
      // Append to the document and trigger the download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      // Reset downloading state after a short delay
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
      setIsDownloading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 ${className}`}
        aria-label="Download document"
      >
        <svg 
          className="w-4 h-4 mr-2" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth="1.5" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" 
          />
        </svg>
        {isDownloading ? 'Preparing Download...' : 'Download Document'}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default DownloadButton; 