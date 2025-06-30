import React from 'react';
import { EmailElement, SubtextElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface SubtextElementComponentProps {
  element: EmailElement & { type: 'subtext' };
}

const SubtextElementComponent: React.FC<SubtextElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as SubtextElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const style: React.CSSProperties = {
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize || '12px', // Default smaller size
    fontWeight: properties.typography?.fontWeight,
    fontStyle: properties.typography?.fontStyle,
    color: properties.typography?.color || '#6c757d', // Default lighter color
    textAlign: properties.typography?.textAlign,
    lineHeight: properties.typography?.lineHeight,
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
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      <p style={style}>
        {element.content}
      </p>
    </div>
  );
};

export default SubtextElementComponent;