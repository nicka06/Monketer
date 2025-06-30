import React from 'react';
import { EmailElement, AppStoreBadgeElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface AppStoreBadgeElementComponentProps {
  element: EmailElement & { type: 'appStoreBadge' };
}

const AppStoreBadgeElementComponent: React.FC<AppStoreBadgeElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as AppStoreBadgeElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const badge = properties.badge;

  const containerStyle: React.CSSProperties = {
    textAlign: element.layout?.align || 'left',
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
  };

  const badgeStyle: React.CSSProperties = {
    width: badge.width || '135px',
    height: badge.height || 'auto',
    display: 'inline-block',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElementForManualEdit(element.id);
  };

  const badgeImageSrc = badge.platform === 'apple-app-store' 
    ? '/path/to/apple_badge.svg' // Replace with actual path
    : '/path/to/google_badge.svg'; // Replace with actual path

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      <a 
        href={badge.href} 
        target="_blank"
        onClick={(e) => e.preventDefault()}
      >
        <img
          src={badgeImageSrc} // NOTE: You will need to add actual badge images to your /public folder
          alt={badge.alt || `${badge.platform} badge`}
          style={badgeStyle}
        />
      </a>
    </div>
  );
};

export default AppStoreBadgeElementComponent;