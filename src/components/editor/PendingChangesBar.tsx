import { Check, X, CheckCircle, XCircle, CheckCheck, XSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/features/contexts/EditorContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GranularPendingChange } from '../../shared/types/pendingChangeTypes'; // Corrected path

/**
 * User-friendly labels for change types.
 */
const changeTypeLabels: Record<GranularPendingChange['change_type'], string> = {
  element_add: 'Add Element',
  element_edit: 'Edit Element',
  element_delete: 'Delete Element',
  section_add: 'Add Section',
  section_edit: 'Edit Section',
  section_delete: 'Delete Section',
};

/**
 * PendingChangesBar Component
 * 
 * Floating action bar for accepting or rejecting all pending email changes.
 * Only renders when there are actual pending changes to manage.
 * Positioned at the bottom center of the preview panel.
 */
const PendingChangesBar = () => {
  const {
    pendingChanges,
    currentBatchId,
    isLoading,
    handleAcceptCurrentBatch,
    handleRejectCurrentBatch,
  } = useEditor();

  // Filter for display: only changes in the current batch that are still pending
  const displayablePendingChanges = pendingChanges.filter(
    change => change.batch_id === currentBatchId && change.status === 'pending'
  );

  const pendingCount = displayablePendingChanges.length;

  if (pendingCount === 0 && !isLoading) {
    return null;
  }

  return (
    <div 
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-xl p-2"
      role="region"
      aria-label={`${pendingCount} pending change${pendingCount !== 1 ? 's' : ''} to review`}
    >
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={handleRejectCurrentBatch}
          disabled={isLoading || pendingCount === 0}
          className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700 px-2 py-1 text-xs"
          aria-label={`Reject all ${pendingCount} remaining pending changes in this batch`}
        >
          <XSquare className="mr-1 h-3 w-3" />
          Reject All ({pendingCount})
        </Button>
        <Button 
          variant="default"
          size="sm"
          onClick={handleAcceptCurrentBatch}
          disabled={isLoading || pendingCount === 0}
          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
          aria-label={`Accept all ${pendingCount} remaining pending changes in this batch`}
        >
          <CheckCheck className="mr-1 h-3 w-3" />
          Accept All ({pendingCount})
        </Button>
      </div>
    </div>
  );
};

export default PendingChangesBar; 