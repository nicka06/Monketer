import React from 'react';
import { EmailElement, ListElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface ListElementComponentProps {
  element: EmailElement & { type: 'list' };
}

const ListElementComponent: React.FC<ListElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as ListElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const ListTag = properties.listType === 'ordered' ? 'ol' : 'ul';

  // Style for the <ul> or <ol> tag
  const listTagStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '25px', // Standard indentation
    color: properties.markerStyle?.color,
  };

  // Style for the outer container div
  const containerStyle: React.CSSProperties = {
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  }

  const itemStyle: React.CSSProperties = {
    fontFamily: properties.typography?.fontFamily,
    fontSize: properties.typography?.fontSize,
    fontWeight: properties.typography?.fontWeight,
    fontStyle: properties.typography?.fontStyle,
    color: properties.typography?.color,
    lineHeight: properties.typography?.lineHeight,
    paddingBottom: '5px', // Space between items
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
      <ListTag style={listTagStyle}>
        {properties.items.map((item, index) => (
          <li key={index} style={itemStyle}>
            {item}
          </li>
        ))}
      </ListTag>
    </div>
  );
};

export default ListElementComponent;