import React from 'react';
import { EmailElement, DividerElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';

interface DividerElementComponentProps {
  element: EmailElement & { type: 'divider' };
}

const DividerElementComponent: React.FC<DividerElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const properties = element.properties as DividerElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const style: React.CSSProperties = {
    border: 'none',
    borderTop: `${properties.divider?.height || '1px'} solid ${properties.divider?.color || '#cccccc'}`,
    width: properties.divider?.width || '100%',
    margin: '10px 0',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElementForManualEdit(element.id);
  };
  
  return (
    <div
      onClick={handleClick}
      className={cn(
        'cursor-pointer py-2',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-0' : ''
      )}
    >
      <hr style={style} />
    </div>
  );
};

export default DividerElementComponent;