import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useProject } from './ProjectProvider';
import { useUIState } from './UIStateProvider';
import { useToast } from '@/hooks/use-toast';
import { updateProjectContent } from '@/features/services/projectService';
import { EmailElement } from '@/shared/types';

interface ManualEditContextType {
  updateElementProperties: (elementId: string, newProperties: Partial<EmailElement['properties']>) => void;
  saveManualChanges: () => Promise<void>;
}

const ManualEditContext = createContext<ManualEditContextType | undefined>(undefined);

export const ManualEditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { projectData, actualProjectId, setProjectData } = useProject();
  const { setIsLoading } = useUIState();
  const { toast } = useToast();

  const updateElementProperties = useCallback((elementId: string, newProperties: Partial<EmailElement['properties']>) => {
    setProjectData(currentData => {
      if (!currentData?.email_content_structured) return currentData;

      const newSections = currentData.email_content_structured.sections.map(section => ({
        ...section,
        rows: section.rows.map(row => ({
          ...row,
          columns: row.columns.map(column => ({
            ...column,
            elements: column.elements.map(element => {
              if (element.id === elementId) {
                return {
                  ...element,
                  properties: {
                    ...element.properties,
                    ...newProperties,
                  },
                };
              }
              return element;
            }),
          })),
        })),
      }));

      return {
        ...currentData,
        email_content_structured: {
          ...currentData.email_content_structured,
          sections: newSections,
        },
      };
    });
  }, [setProjectData]);


  const saveManualChanges = useCallback(async () => {
    if (!projectData?.email_content_structured || !actualProjectId) {
      toast({ title: 'Error', description: 'Cannot save, project data or ID missing.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await updateProjectContent(actualProjectId, projectData.email_content_structured, true);
      toast({ title: 'Success', description: 'Manual changes saved.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Error', description: `Failed to save manual changes: ${errorMessage}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [actualProjectId, projectData, toast, setIsLoading]);

  const value = {
    updateElementProperties,
    saveManualChanges,
  };

  return (
    <ManualEditContext.Provider value={value}>
      {children}
    </ManualEditContext.Provider>
  );
};

export const useManualEdit = () => {
  const context = useContext(ManualEditContext);
  if (context === undefined) {
    throw new Error('useManualEdit must be used within a ManualEditProvider');
  }
  return context;
};
