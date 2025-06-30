import React from 'react';
import { EmailElement, SocialElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface SocialElementComponentProps {
  element: EmailElement & { type: 'social' };
}

const SocialElementComponent: React.FC<SocialElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as SocialElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const containerStyle: React.CSSProperties = {
    textAlign: properties.layout?.align || 'left',
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  };

  const linkStyle: React.CSSProperties = {
    textDecoration: 'none',
    display: 'inline-block',
    padding: `0 ${properties.layout?.spacing || '5px'}`,
  };

  const iconStyle: React.CSSProperties = {
    width: properties.iconStyle?.width || '32px',
    height: properties.iconStyle?.height || '32px',
    borderRadius: properties.iconStyle?.borderRadius,
    display: 'block',
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
      <p style={{ margin: 0 }}>
        {properties.links?.map((link, index) => (
          <a
            key={index}
            href={link.href}
            target="_blank"
            style={linkStyle}
            onClick={(e) => e.preventDefault()}
          >
            <img
              src={link.iconSrc || `https://via.placeholder.com/32?text=${link.platform.charAt(0)}`}
              alt={link.alt || link.platform}
              style={iconStyle}
            />
          </a>
        ))}
      </p>
    </div>
  );
};

export default SocialElementComponent;