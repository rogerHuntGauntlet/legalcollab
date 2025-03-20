'use client';

import React, { useState } from 'react';
import SignatureCanvas from './SignatureCanvas';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title?: string;
  initialSignature?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Add Your Signature',
  initialSignature
}) => {
  const [typedName, setTypedName] = useState('');
  const [useDrawnSignature, setUseDrawnSignature] = useState(true);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(initialSignature || null);
  
  if (!isOpen) return null;
  
  const handleSaveSignature = (signatureData: string) => {
    setDrawnSignature(signatureData);
  };
  
  const handleSignatureTypeToggle = (useDrawn: boolean) => {
    setUseDrawnSignature(useDrawn);
  };
  
  const handleTypedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedName(e.target.value);
  };
  
  const generateTypedSignature = () => {
    // Create a canvas to render the typed signature
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx && typedName) {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw signature with a cursive-like font
      ctx.font = '48px "Brush Script MT", cursive';
      ctx.fillStyle = '#000000';
      
      // Center the text
      const textWidth = ctx.measureText(typedName).width;
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2;
      
      ctx.fillText(typedName, x, y);
      
      return canvas.toDataURL('image/png');
    }
    
    return null;
  };
  
  const handleSave = () => {
    if (useDrawnSignature && drawnSignature) {
      onSave(drawnSignature);
    } else if (!useDrawnSignature && typedName) {
      const typedSignature = generateTypedSignature();
      if (typedSignature) {
        onSave(typedSignature);
      }
    }
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  {title}
                </h3>
                
                <div className="mt-4">
                  <div className="flex justify-center mb-4">
                    <div className="flex rounded-md shadow-sm" role="group">
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium rounded-l-md ${useDrawnSignature ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
                        onClick={() => handleSignatureTypeToggle(true)}
                      >
                        Draw Signature
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium rounded-r-md ${!useDrawnSignature ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
                        onClick={() => handleSignatureTypeToggle(false)}
                      >
                        Type Signature
                      </button>
                    </div>
                  </div>
                  
                  {useDrawnSignature ? (
                    <SignatureCanvas 
                      onSave={handleSaveSignature}
                      onCancel={onClose}
                      initialSignature={drawnSignature || undefined}
                      width={450}
                      height={150}
                    />
                  ) : (
                    <div className="typed-signature-container">
                      <input
                        type="text"
                        value={typedName}
                        onChange={handleTypedNameChange}
                        placeholder="Type your full name"
                        className="block w-full p-2 mb-4 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <div className="preview-area border-2 border-gray-300 rounded-md p-4 mb-4 h-[150px] flex items-center justify-center">
                        {typedName ? (
                          <p className="text-4xl font-signature text-center">{typedName}</p>
                        ) : (
                          <p className="text-gray-400 text-center">Your signature will appear here</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSave}
              disabled={(useDrawnSignature && !drawnSignature) || (!useDrawnSignature && !typedName)}
              className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Sign Document
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal; 