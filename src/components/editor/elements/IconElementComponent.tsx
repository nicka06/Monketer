import React from 'react';
import { EmailElement, IconElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface IconElementComponentProps {
  element: EmailElement & { type: 'icon' };
}

const IconElementComponent: React.FC<IconElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as IconElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const icon = properties.icon;

  const containerStyle: React.CSSProperties = {
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
    textAlign: element.layout?.align || 'left',
  };

  const iconStyle: React.CSSProperties = {
    width: icon.width || '24px',
    height: icon.height || '24px',
    display: 'inline-block',
    verticalAlign: 'middle',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElementForManualEdit(element.id);
  };

  const iconTag = (
    <img
      src={icon.src || 'https://via.placeholder.com/24'}
      alt={icon.alt || 'icon'}
      style={iconStyle}
    />
  );

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      {icon.linkHref ? (
        <a href={icon.linkHref} target={icon.linkTarget || '_blank'} onClick={(e) => e.preventDefault()}>
          {iconTag}
        </a>
      ) : (
        iconTag
      )}
    </div>
  );
};

export default IconElementComponent;