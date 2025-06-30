import React from 'react';
import { EmailElement, HeaderElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface HeaderElementComponentProps {
  element: EmailElement & { type: 'header' };
}

const HeaderElementComponent: React.FC<HeaderElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as HeaderElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const HeadingTag = properties.level || 'h2';

  const style: React.CSSProperties = {
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize,
    fontWeight: properties.typography?.fontWeight,
    fontStyle: properties.typography?.fontStyle,
    color: properties.typography?.color,
    textAlign: properties.typography?.textAlign,
    lineHeight: properties.typography?.lineHeight,
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
    margin: 0,
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
      <HeadingTag style={style}>
        {element.content}
      </HeadingTag>
    </div>
  );
};

export default HeaderElementComponent;