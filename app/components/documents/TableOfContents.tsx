import React, { useMemo } from 'react';

interface TableOfContentsProps {
  content: string;
  onNavigate: (position: number) => void;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
  position: number;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content, onNavigate }) => {
  // Extract headings from content using regex
  const tocItems = useMemo(() => {
    if (!content) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    
    // Use exec in a loop instead of matchAll to avoid downlevelIteration issues
    while ((match = headingRegex.exec(content)) !== null) {
      const hashes = match[1];
      const headingText = match[2].trim();
      
      items.push({
        id: `heading-${items.length}`,
        text: headingText,
        level: hashes.length,
        position: match.index
      });
    }
    
    return items;
  }, [content]);

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        Table of Contents
      </h3>
      
      <ul className="space-y-1 max-h-60 overflow-y-auto">
        {tocItems.map((item) => (
          <li 
            key={item.id}
            className="hover:bg-gray-50 rounded"
            style={{ marginLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => onNavigate(item.position)}
              className="text-left w-full px-2 py-1 text-sm text-gray-700 hover:text-indigo-600 truncate"
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TableOfContents; 