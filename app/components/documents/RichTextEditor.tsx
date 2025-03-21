import React, { useState, useRef, useEffect, useCallback } from 'react';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

interface RichTextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onTextSelection?: (selectedText: string, range: { start: number; end: number } | null) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent,
  onChange,
  onTextSelection,
  onSave,
  onCancel
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  
  // Initialize editor content
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (!onTextSelection) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      onTextSelection('', null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    const start = range.startOffset;
    const end = range.endOffset;
    
    onTextSelection(selectedText, { start, end });
  }, [onTextSelection]);

  // Format commands
  const execFormatCommand = useCallback((command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleContentChange();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [handleContentChange]);

  const formatBold = useCallback(() => execFormatCommand('bold'), [execFormatCommand]);
  const formatItalic = useCallback(() => execFormatCommand('italic'), [execFormatCommand]);
  const formatUnderline = useCallback(() => execFormatCommand('underline'), [execFormatCommand]);
  const formatHeading = useCallback((level: number) => {
    execFormatCommand('formatBlock', `h${level}`);
  }, [execFormatCommand]);
  const formatParagraph = useCallback(() => execFormatCommand('formatBlock', 'p'), [execFormatCommand]);
  const formatList = useCallback((type: 'ordered' | 'unordered') => {
    execFormatCommand(type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList');
  }, [execFormatCommand]);
  const formatUndo = useCallback(() => execFormatCommand('undo'), [execFormatCommand]);
  const formatRedo = useCallback(() => execFormatCommand('redo'), [execFormatCommand]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    save: onSave,
    cancel: onCancel,
    bold: formatBold,
    italic: formatItalic,
    underline: formatUnderline,
    undo: formatUndo,
    redo: formatRedo,
    heading1: () => formatHeading(1),
    heading2: () => formatHeading(2),
    heading3: () => formatHeading(3)
  });

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Formatting toolbar */}
      {showToolbar && (
        <div className="border-b border-gray-300 bg-gray-50 p-2">
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              title="Bold (Ctrl+B)"
              onClick={formatBold}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </button>
            <button
              title="Italic (Ctrl+I)"
              onClick={formatItalic}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </button>
            <button
              title="Underline (Ctrl+U)"
              onClick={formatUnderline}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </button>
            
            <div className="h-5 border-l border-gray-300 mx-1"></div>
            
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'p') {
                  formatParagraph();
                } else if (value.startsWith('h')) {
                  formatHeading(parseInt(value.substring(1)));
                }
                e.target.value = 'default';
              }}
              className="text-sm p-1 rounded border border-gray-300"
              defaultValue="default"
              title="Format (Ctrl+1/2/3 for headings)"
            >
              <option value="default" disabled>Format</option>
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1 (Ctrl+1)</option>
              <option value="h2">Heading 2 (Ctrl+2)</option>
              <option value="h3">Heading 3 (Ctrl+3)</option>
            </select>
            
            <div className="h-5 border-l border-gray-300 mx-1"></div>
            
            <button
              title="Ordered List"
              onClick={() => formatList('ordered')}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
            <button
              title="Unordered List"
              onClick={() => formatList('unordered')}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
              </svg>
            </button>
            
            <div className="h-5 border-l border-gray-300 mx-1"></div>
            
            <button
              title="Undo (Ctrl+Z)"
              onClick={formatUndo}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              onClick={formatRedo}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
            
            <div className="ml-auto">
              <button
                onClick={() => setShowShortcutHelp(!showShortcutHelp)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 flex items-center"
                type="button"
              >
                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                Shortcuts
              </button>
            </div>
          </div>
          
          {/* Keyboard shortcuts help */}
          {showShortcutHelp && (
            <div className="bg-white border border-gray-200 rounded p-2 mb-2 text-xs">
              <h4 className="font-medium mb-1">Keyboard Shortcuts</h4>
              <ul className="grid grid-cols-2 gap-y-1">
                <li><span className="inline-block w-20 font-medium">Ctrl+B</span> Bold</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+I</span> Italic</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+U</span> Underline</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+Z</span> Undo</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+Y</span> Redo</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+1</span> Heading 1</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+2</span> Heading 2</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+3</span> Heading 3</li>
                <li><span className="inline-block w-20 font-medium">Ctrl+S</span> Save</li>
                <li><span className="inline-block w-20 font-medium">Escape</span> Cancel</li>
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Editor content area */}
      <div
        ref={editorRef}
        className="p-4 min-h-[400px] focus:outline-none"
        contentEditable={true}
        onInput={handleContentChange}
        onSelect={handleTextSelection}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
      />
    </div>
  );
};

export default RichTextEditor; 