import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/features/contexts/EditorContext';

/**
 * PendingChangesBar Component
 * 
 * Floating action bar for accepting or rejecting pending email changes.
 * Only renders when there are actual pending changes to manage.
 * Positioned at the bottom center of the preview panel.
 */
const PendingChangesBar = () => {
  const { pendingChanges, isLoading, handleAcceptAll, handleRejectAll } = useEditor();

  // Count of pending changes
  const changeCount = pendingChanges?.length || 0;
  
  // Only render if there are pending changes
  if (changeCount === 0) {
    return null;
  }

  return (
    <div 
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-xl p-3 flex items-center gap-3"
      role="region"
      aria-label={`${changeCount} pending change${changeCount > 1 ? 's' : ''} to review`}
    >
      {/* Reject all changes button */}
      <Button 
        variant="outline"
        size="sm"
        onClick={handleRejectAll} 
        disabled={isLoading}
        className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700 px-3 py-1.5"
        aria-label={`Reject all ${changeCount} changes`}
      >
        <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Reject All
      </Button>
      
      {/* Accept all changes button */}
      <Button 
        variant="default"
        size="sm"
        onClick={handleAcceptAll} 
        disabled={isLoading}
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5"
        aria-label={`Accept all ${changeCount} changes`}
      >
        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Accept All
      </Button>
    </div>
  );
};

export default PendingChangesBar; 