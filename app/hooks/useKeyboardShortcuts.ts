import { useEffect, useCallback } from 'react';

type ShortcutHandler = () => void;

interface KeyboardShortcuts {
  save?: ShortcutHandler;
  cancel?: ShortcutHandler;
  bold?: ShortcutHandler;
  italic?: ShortcutHandler;
  underline?: ShortcutHandler;
  undo?: ShortcutHandler;
  redo?: ShortcutHandler;
  heading1?: ShortcutHandler;
  heading2?: ShortcutHandler;
  heading3?: ShortcutHandler;
}

/**
 * Hook to handle keyboard shortcuts for document editing
 */
const useKeyboardShortcuts = ({
  save,
  cancel,
  bold,
  italic,
  underline,
  undo,
  redo,
  heading1,
  heading2,
  heading3
}: KeyboardShortcuts) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if Ctrl/Command key is pressed
    const isCtrlCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlCmd) {
      switch (event.key.toLowerCase()) {
        case 's':
          if (save) {
            event.preventDefault();
            save();
          }
          break;
          
        case 'b':
          if (bold) {
            event.preventDefault();
            bold();
          }
          break;
          
        case 'i':
          if (italic) {
            event.preventDefault();
            italic();
          }
          break;
          
        case 'u':
          if (underline) {
            event.preventDefault();
            underline();
          }
          break;
          
        case 'z':
          if (undo && !event.shiftKey) {
            event.preventDefault();
            undo();
          } else if (redo && event.shiftKey) {
            event.preventDefault();
            redo();
          }
          break;
          
        case 'y':
          if (redo) {
            event.preventDefault();
            redo();
          }
          break;
          
        case '1':
          if (heading1) {
            event.preventDefault();
            heading1();
          }
          break;
          
        case '2':
          if (heading2) {
            event.preventDefault();
            heading2();
          }
          break;
          
        case '3':
          if (heading3) {
            event.preventDefault();
            heading3();
          }
          break;
      }
    }
    
    // Check for Escape key (cancel)
    if (event.key === 'Escape' && cancel) {
      event.preventDefault();
      cancel();
    }
  }, [save, cancel, bold, italic, underline, undo, redo, heading1, heading2, heading3]);
  
  useEffect(() => {
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return null;
};

export default useKeyboardShortcuts; 