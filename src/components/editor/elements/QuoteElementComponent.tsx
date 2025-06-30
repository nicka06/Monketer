import React from 'react';
import { EmailElement, QuoteElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface QuoteElementComponentProps {
  element: EmailElement & { type: 'quote' };
}

const QuoteElementComponent: React.FC<QuoteElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as QuoteElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const blockquoteStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '15px',
    borderLeft: `${properties.border?.width || '4px'} ${properties.border?.style || 'solid'} ${properties.border?.color || '#dddddd'}`,
    backgroundColor: properties.backgroundColor,
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize,
    fontStyle: properties.typography?.fontStyle || 'italic',
    color: properties.typography?.color,
    lineHeight: properties.typography?.lineHeight,
  };

  const citationStyle: React.CSSProperties = {
    marginTop: '10px',
    fontSize: '0.9em',
    color: properties.typography?.color || '#6c757d',
    textAlign: properties.typography?.textAlign,
  };
  
  const containerStyle: React.CSSProperties = {
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElementForManualEdit(element.id);
  };

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      <blockquote style={blockquoteStyle}>
        <p style={{ margin: 0 }}>{element.content}</p>
        {properties.citation && (
          <footer style={citationStyle}>— {properties.citation}</footer>
        )}
      </blockquote>
    </div>
  );
};

export default QuoteElementComponent;