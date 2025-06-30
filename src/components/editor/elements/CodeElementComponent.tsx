import React from 'react';
import { EmailElement, CodeElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface CodeElementComponentProps {
  element: EmailElement & { type: 'code' };
}

const CodeElementComponent: React.FC<CodeElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as CodeElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const preStyle: React.CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    backgroundColor: properties.backgroundColor || '#f8f9fa',
    borderRadius: properties.borderRadius || '4px',
    padding: properties.padding || '15px',
    fontFamily: properties.typography?.fontFamily || 'monospace',
    fontSize: properties.typography?.fontSize,
    color: properties.typography?.color,
    lineHeight: properties.typography?.lineHeight,
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElementForManualEdit(element.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      <pre style={preStyle}>
        <code>{properties.code}</code>
      </pre>
    </div>
  );
};

export default CodeElementComponent;