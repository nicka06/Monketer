import React from 'react';
import { RowElement } from '@/shared/types';
import ColumnComponent from './ColumnComponent';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import PendingChangeIndicator from './PendingChangeIndicator';

interface RowComponentProps {
  row: RowElement;
  sectionId: string;
}

const RowComponent: React.FC<RowComponentProps> = ({ row, sectionId }) => {
  const { selectedManualEditElementId, pendingChanges } = useEditor();

  // Find if there is a pending change specifically for this row
  const rowChange = pendingChanges.find(
    (change) => change.target_id === row.id && change.status === 'pending'
  );

  const isRowSelected = row.columns.some(col => 
    col.elements.some(el => el.id === selectedManualEditElementId)
  );

  const rowStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const content = (
    <div className={cn('my-1', isRowSelected ? 'outline outline-1 outline-neutral-400 dark:outline-neutral-600' : '')}>
      <table style={rowStyle}>
        <tbody>
          <tr>
            {row.columns.map(column => (
              <ColumnComponent key={column.id} column={column} rowId={row.id} sectionId={sectionId} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  if (rowChange) {
    return (
      <PendingChangeIndicator change={rowChange}>
        {content}
      </PendingChangeIndicator>
    );
  }

  return content;
};

export default RowComponent;