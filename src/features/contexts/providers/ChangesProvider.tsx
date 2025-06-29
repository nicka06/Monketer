import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useProject } from './ProjectProvider';
import { useUIState } from './UIStateProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PendingChange } from '@/features/types/editor';

interface ChangesContextType {
  pendingChanges: PendingChange[];
  setPendingChanges: React.Dispatch<React.SetStateAction<PendingChange[]>>;
  currentBatchId: string | null;
  setCurrentBatchId: React.Dispatch<React.SetStateAction<string | null>>;
  handleAcceptCurrentBatch: () => Promise<void>;
  handleRejectCurrentBatch: () => Promise<void>;
  handleAcceptOneChange: (changeId: string) => Promise<void>;
  handleRejectOneChange: (changeId: string) => Promise<void>;
}

const ChangesContext = createContext<ChangesContextType | undefined>(undefined);

export const ChangesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { actualProjectId, fetchAndSetProject } = useProject();
  const { setIsLoading, setProgress } = useUIState();
  const { toast } = useToast();

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  const manageBatchOperation = async (operation: 'accept_batch' | 'reject_batch' | 'accept_one' | 'reject_one', change_id?: string) => {
    if (!actualProjectId || (!currentBatchId && (operation === 'accept_batch' || operation === 'reject_batch'))) {
      toast({ title: 'Error', description: 'Project or Batch ID is missing.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setProgress(30);
    try {
      const payload: any = { projectId: actualProjectId, operation };
      if (operation.endsWith('_batch')) {
        payload.batch_id = currentBatchId;
      }
      if (change_id) {
        payload.change_id = change_id;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${operation}`);
      }

      const result = await response.json();
      toast({ title: 'Success', description: result.message || 'Operation successful.' });
      await fetchAndSetProject(actualProjectId); // Refresh project data

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleAcceptCurrentBatch = () => manageBatchOperation('accept_batch');
  const handleRejectCurrentBatch = () => manageBatchOperation('reject_batch');
  const handleAcceptOneChange = (changeId: string) => manageBatchOperation('accept_one', changeId);
  const handleRejectOneChange = (changeId: string) => manageBatchOperation('reject_one', changeId);

  const value = {
    pendingChanges,
    setPendingChanges,
    currentBatchId,
    setCurrentBatchId,
    handleAcceptCurrentBatch,
    handleRejectCurrentBatch,
    handleAcceptOneChange,
    handleRejectOneChange,
  };

  return <ChangesContext.Provider value={value}>{children}</ChangesContext.Provider>;
};

export const useChanges = () => {
  const context = useContext(ChangesContext);
  if (context === undefined) {
    throw new Error('useChanges must be used within a ChangesProvider');
  }
  return context;
};
