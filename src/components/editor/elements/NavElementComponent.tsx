import React from 'react';
import { EmailElement, NavElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface NavElementComponentProps {
  element: EmailElement & { type: 'nav' };
}

const NavElementComponent: React.FC<NavElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as NavElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const containerStyle: React.CSSProperties = {
    textAlign: properties.layout?.align || 'center',
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  };

  const getLinkStyle = (linkTypography: any): React.CSSProperties => ({
    fontFamily: linkTypography?.fontFamily || properties.typography?.fontFamily,
    fontSize: linkTypography?.fontSize || properties.typography?.fontSize,
    fontWeight: linkTypography?.fontWeight || properties.typography?.fontWeight,
    fontStyle: linkTypography?.fontStyle || properties.typography?.fontStyle,
    color: linkTypography?.color || properties.typography?.color || '#007bff',
    textDecoration: 'none',
    padding: `0 ${properties.layout?.spacing || '10px'}`,
  });

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
      <p style={{ margin: 0 }}>
        {properties.links?.map((link, index) => (
          <a
            key={index}
            href={link.href}
            target={link.target || '_blank'}
            style={getLinkStyle(link.typography)}
            onClick={(e) => e.preventDefault()}
          >
            {link.text}
          </a>
        ))}
      </p>
    </div>
  );
};

export default NavElementComponent;