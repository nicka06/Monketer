import React from 'react';
import { EmailElement, UnsubscribeElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface UnsubscribeElementComponentProps {
  element: EmailElement & { type: 'unsubscribe' };
}

const UnsubscribeElementComponent: React.FC<UnsubscribeElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as UnsubscribeElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const link = properties.link;

  const style: React.CSSProperties = {
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize || '12px',
    fontWeight: properties.typography?.fontWeight,
    fontStyle: properties.typography?.fontStyle,
    color: properties.typography?.color || '#6c757d',
    textAlign: properties.typography?.textAlign,
    lineHeight: properties.typography?.lineHeight,
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  };

  const linkStyle: React.CSSProperties = {
    color: 'inherit',
    textDecoration: 'underline',
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
      <p style={style}>
        <a 
          href={link.href} 
          target={link.target || '_blank'} 
          style={linkStyle}
          onClick={(e) => e.preventDefault()}
        >
          {link.text}
        </a>
      </p>
    </div>
  );
};

export default UnsubscribeElementComponent;