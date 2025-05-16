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
 * Floating action bar for accepting or rejecting pending email changes.
 * Only renders when there are actual pending changes to manage.
 * Positioned at the bottom center of the preview panel.
 */
const PendingChangesBar = () => {
  const {
    pendingChanges, // This is GranularPendingChange[] from the context
    currentBatchId,
    isLoading,
    handleAcceptCurrentBatch, 
    handleRejectCurrentBatch, 
    handleAcceptOneChange,
    handleRejectOneChange,
  } = useEditor();

  // >>>>>>>>>> ADD LOGGING HERE <<<<<<<<<<
  console.log("[PendingChangesBar] Rendering. currentBatchId from context:", currentBatchId, "Number of pendingChanges from context:", pendingChanges.length);
  // >>>>>>>>>> END LOGGING <<<<<<<<<<

  // Filter for display: only changes in the current batch that are still pending
  const displayablePendingChanges = pendingChanges.filter(
    change => change.batch_id === currentBatchId && change.status === 'pending'
  );
  // >>>>>>>>>> ADD LOGGING HERE <<<<<<<<<<
  console.log(`[PendingChangesBar] currentBatchId: ${currentBatchId}, Total pendingChanges in context: ${pendingChanges.length}, Filtered displayablePendingChanges count: ${displayablePendingChanges.length}`);
  // >>>>>>>>>> END LOGGING <<<<<<<<<<

  const pendingCount = displayablePendingChanges.length;

  if (pendingCount === 0 && !isLoading) { // Don't hide if loading, as changes might appear
    return null;
  }

  // Get a summary of all changes in the batch for the batch action buttons
  const totalBatchChangesCount = pendingChanges.filter(c => c.batch_id === currentBatchId).length;

  return (
    <div 
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-xl p-3 w-full max-w-2xl flex flex-col gap-3"
      role="region"
      aria-label={`${pendingCount} pending change${pendingCount !== 1 ? 's' : ''} to review`}
    >
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-semibold">
          {isLoading ? 'Loading suggestions...' : `${pendingCount} Pending Suggestion${pendingCount !== 1 ? 's' : ''}`}
        </h3>
        {totalBatchChangesCount > 0 && pendingCount > 0 && (
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
              Reject Batch ({pendingCount})
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
              Accept Batch ({pendingCount})
            </Button>
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <ScrollArea className="max-h-60 w-full pr-2">
          <div className="space-y-2">
            {displayablePendingChanges.map((change) => (
              <div 
                key={change.id} 
                className="flex items-center justify-between p-2 border border-muted rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-col text-xs">
                  <span className="font-medium">
                    {changeTypeLabels[change.change_type] || change.change_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground text-xxs truncate max-w-[200px]" title={change.target_id ? `Target ID: ${change.target_id}` : 'New item'}>
                     Target: {change.target_id || (change.new_content as any)?.type || 'N/A'} 
                     {change.ai_rationale && <span className="italic ml-1" title={change.ai_rationale}> (hover for rationale)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRejectOneChange(change.id)} 
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 h-auto w-auto"
                    aria-label={`Reject change for ${change.target_id}`}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleAcceptOneChange(change.id)} 
        disabled={isLoading}
                    className="text-green-600 hover:text-green-700 hover:bg-green-100 p-1 h-auto w-auto"
                    aria-label={`Accept change for ${change.target_id}`}
      >
                    <CheckCircle className="h-4 w-4" />
      </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {pendingCount === 0 && !isLoading && totalBatchChangesCount > 0 && (
         <p className="text-xs text-center text-muted-foreground py-2">All suggestions in this batch have been reviewed.</p>
      )}
    </div>
  );
};

export default PendingChangesBar; 