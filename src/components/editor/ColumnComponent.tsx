import React from 'react';
import { ColumnElement } from '@/shared/types';
import ElementRenderer from './elements/ElementRenderer';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableElement from './elements/DraggableElement';

interface ColumnComponentProps {
  column: ColumnElement;
  rowId: string;
  sectionId: string;
}

const ColumnComponent: React.FC<ColumnComponentProps> = ({ column, rowId, sectionId }) => {
  const { selectedManualEditElementId } = useEditor();
  const elementIds = (column.elements || []).map(el => el.id);

  const isColumnSelected = (column.elements || []).some(el => el.id === selectedManualEditElementId);

  // Calculate the percentage width based on the 12-column grid system
  const widthPercentage = (column.width / 12) * 100;

  const columnStyle: React.CSSProperties = {
    width: `${widthPercentage}%`,
    verticalAlign: 'top', // Default vertical alignment
    border: '1px dashed #ccc', // A light, dotted border to show column boundaries in the editor
    padding: '10px', // Some default padding for visual spacing
  };

  return (
    <td style={columnStyle}>
      <div 
        className={cn(
          'h-full',
          isColumnSelected ? 'bg-blue-50' : '' // Highlight column if an element inside is selected
        )}
      >
        <SortableContext
          items={elementIds}
          strategy={verticalListSortingStrategy}
        >
          {column.elements.map(element => (
            <DraggableElement key={element.id} element={element} />
          ))}
        </SortableContext>
      </div>
    </td>
  );
};

export default ColumnComponent;