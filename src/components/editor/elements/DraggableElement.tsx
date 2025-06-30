import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailElement } from '@/shared/types';
import ElementRenderer from './ElementRenderer';
import { GripVertical } from 'lucide-react';

interface DraggableElementProps {
  element: EmailElement;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ element }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative group">
        {/* Drag Handle */}
        <div 
          {...listeners}
          className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity"
        >
          <GripVertical size={18} />
        </div>
        
        <ElementRenderer element={element} />
      </div>
    </div>
  );
};

export default DraggableElement;