import React from 'react';
import { EmailElement, SpacerElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface SpacerElementComponentProps {
  element: EmailElement & { type: 'spacer' };
}

const SpacerElementComponent: React.FC<SpacerElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as SpacerElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const style: React.CSSProperties = {
    height: properties.spacer.height,
    lineHeight: properties.spacer.height,
    fontSize: properties.spacer.height,
    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(128, 128, 128, 0.1)',
    width: '100%',
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
        'cursor-pointer transition-colors'
      )}
    >
      &nbsp;
    </div>
  );
};

export default SpacerElementComponent;