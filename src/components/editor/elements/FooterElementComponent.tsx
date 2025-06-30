import React from 'react';
import { EmailElement, FooterElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface FooterElementComponentProps {
  element: EmailElement & { type: 'footer' };
}

const FooterElementComponent: React.FC<FooterElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as FooterElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const style: React.CSSProperties = {
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize || '12px',
    fontWeight: properties.typography?.fontWeight,
    color: properties.typography?.color || '#6c757d',
    textAlign: properties.typography?.textAlign || 'center',
    lineHeight: properties.typography?.lineHeight,
    paddingTop: element.layout?.padding?.top || '20px',
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
      style={style}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
      dangerouslySetInnerHTML={{ __html: element.content }}
    />
  );
};

export default FooterElementComponent;