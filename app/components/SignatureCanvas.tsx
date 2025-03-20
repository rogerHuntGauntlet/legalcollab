'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  initialSignature?: string;
  width?: number;
  height?: number;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  initialSignature,
  width = 500,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);

  // Initialize canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        setContext(ctx);
        
        // Load initial signature if provided
        if (initialSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = initialSignature;
        }
      }
    }
  }, [initialSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    // Handle both mouse and touch events
    const { offsetX, offsetY } = getCoordinates(e);
    
    context.beginPath();
    context.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    
    e.preventDefault(); // Prevent scrolling on touch devices
    
    const { offsetX, offsetY } = getCoordinates(e);
    
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const endDrawing = () => {
    if (!context) return;
    
    setIsDrawing(false);
    context.closePath();
  };

  // Handle touch and mouse events consistently
  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) {
      return { offsetX: 0, offsetY: 0 };
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in event) {
      // Touch event
      const touch = event.touches[0];
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        offsetX: event.nativeEvent.offsetX,
        offsetY: event.nativeEvent.offsetY
      };
    }
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
    }
  };

  const saveSignature = () => {
    if (canvasRef.current && hasSignature) {
      const signatureData = canvasRef.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  return (
    <div className="signature-canvas-container">
      <div className="canvas-wrapper border-2 border-gray-300 rounded-md mb-3">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="bg-white cursor-crosshair touch-none"
        />
      </div>
      <div className="flex justify-between items-center">
        <div>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3 py-1 mr-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        <button
          type="button"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Signature
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Draw your signature in the box above using your mouse or touch screen.
      </p>
    </div>
  );
};

export default SignatureCanvas; 