import React from 'react';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import { PendingChange } from '@/features/types/editor';

interface PendingChangeIndicatorProps {
  change: PendingChange;
  children: React.ReactNode;
}

const PendingChangeIndicator: React.FC<PendingChangeIndicatorProps> = ({ change, children }) => {
  const { handleAcceptOneChange, handleRejectOneChange, isLoading } = useEditor();

  if (change.status !== 'pending') {
    return <>{children}</>;
  }

  const isAdd = change.change_type.endsWith('_add');
  const isEdit = change.change_type.endsWith('_edit');

  const borderColorClass = isAdd ? 'border-green-500' : isEdit ? 'border-yellow-500' : 'border-transparent';
  const bgColorClass = isAdd ? 'bg-green-500/10' : isEdit ? 'bg-yellow-500/10' : 'bg-transparent';

  const onAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleAcceptOneChange(change.id);
  };

  const onReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleRejectOneChange(change.id);
  };

  return (
    <div className={cn('relative border-2 rounded-md', borderColorClass, bgColorClass)}>
      {children}
      <div className="absolute top-1 right-1 flex gap-1 z-10">
        <button
          onClick={onAccept}
          disabled={isLoading}
          title="Accept Change"
          className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
        >
          ✓
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          title="Reject Change"
          className="flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
        >
          ✗
        </button>
      </div>
    </div>
  );
};

export default PendingChangeIndicator;