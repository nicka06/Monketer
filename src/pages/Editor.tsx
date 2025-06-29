import { useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ChatInterface } from '@/components/ChatInterface';
import { EmailElement } from '@/shared/types';
import { ManualEditPanel } from '@/components/ManualEditPanel';
import { useLoading } from '@/contexts/LoadingContext'; // Import global loading context
import { ProjectProvider, useProject } from '@/features/contexts/providers/ProjectProvider';
import { UIStateProvider, useUIState } from '@/features/contexts/providers/UIStateProvider';
import { AIProvider, useAI } from '@/features/contexts/providers/AIProvider';
import { ChangesProvider } from '@/features/contexts/providers/ChangesProvider';
import { ManualEditProvider, useManualEdit } from '@/features/contexts/providers/ManualEditProvider';

// Import our extracted components
import EditorHeader from '@/components/editor/EditorHeader';
import EmailPreviewPanel from '@/components/editor/EmailPreviewPanel';
import InitialPromptScreen from '@/components/editor/InitialPromptScreen';
import LoadingScreen from '@/components/editor/LoadingScreen';

/**
 * Email Editor Component
 * 
 * This is the main entry point for the editor. The component has been refactored for better maintainability:
 * 1. Core state and logic is now in EditorContext
 * 2. UI is broken down into modular components
 * 3. Main component only handles composition and routing between UI states
 */
const Editor = () => {
  // The Editor component now just sets up the context provider
  // All the complex logic has been moved to EditorContext
  return (
    <ProjectProvider>
      <UIStateProvider>
        <AIProvider>
          <ChangesProvider>
            <ManualEditProvider>
              <EditorContent />
            </ManualEditProvider>
          </ChangesProvider>
        </AIProvider>
      </UIStateProvider>
    </ProjectProvider>
  );
};

/**
 * Editor Content Component
 * 
 * Handles the composition of all editor components and conditional rendering
 * based on the application state from EditorContext.
 */
const EditorContent = () => {
  const { projectData, actualProjectId } = useProject();
  const { 
    isLoadingProject, 
    isLoading, 
    selectedMode,
    handleModeChange
  } = useUIState();
  const {
    isClarifying,
    chatMessages,
    hasFirstDraft,
    isCreatingFirstEmail,
    clarificationConversation,
    handleSendMessage,
    handleSuggestionSelected,
  } = useAI();
  const { selectedElementId } = useUIState();

  const { hideLoading } = useLoading(); // Get hideLoading from global context
  const hideLoadingCalledRef = useRef(false); // Ref to prevent multiple calls

  // Effect to hide global loading screen once project loading is done
  useEffect(() => {
    if (!isLoadingProject && !hideLoadingCalledRef.current) {
      console.log('[EditorContent] isLoadingProject is false, calling hideLoading()');
      hideLoading();
      hideLoadingCalledRef.current = true;
    }
  }, [isLoadingProject, hideLoading]);

  // Find the selected element to edit
  const elementToEdit: EmailElement | undefined = selectedElementId && projectData?.email_content_structured ?
    projectData.email_content_structured.sections
      .flatMap(section => section.rows.flatMap(row => row.columns.flatMap(col => col.elements)))
      .find(element => element.id === selectedElementId)
    : undefined;

  // Initial loading state
  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading Your Email Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header with title editing */}
      <EditorHeader />
        
      {/* Main content with conditional rendering based on state */}
      {isLoadingProject ? (
        <LoadingScreen type="loading" />
      ) : !actualProjectId ? (
        // Show InitialPromptScreen if no project ID is set and not loading
        <InitialPromptScreen />
      ) : (
        // Main Editor UI with resizable panels
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Panel: Email Preview or Loading Screen */}
          <ResizablePanel 
            defaultSize={75}
            minSize={40}
            className="overflow-hidden relative"
          >
            {/* Show loading screen during generation, otherwise show the preview */}
            {(isLoading || isCreatingFirstEmail || (isClarifying && !projectData?.email_content_structured) || 
              (!projectData?.email_content_structured && !isClarifying && chatMessages.length > 0)) ? (
              <LoadingScreen type={isClarifying ? 'clarifying' : 'generating'} />
            ) : (
              <EmailPreviewPanel fileInputRef={null} />
            )}
          </ResizablePanel>
          
          {/* Resizable handle between panels */}
          <ResizableHandle withHandle />
          
          {/* Right Panel: Chat Interface */}
          <ResizablePanel 
            defaultSize={25} 
            minSize={20}
            className="border-l border-gray-200 bg-gray-50 h-full overflow-hidden flex flex-col"
          >
            {elementToEdit ? (
              <ManualEditPanel selectedElement={elementToEdit} />
            ) : (
              <div className="h-full">
                <ChatInterface
                  messages={chatMessages}
                  clarificationMessages={clarificationConversation}
                  isClarifying={isClarifying}
                  onSendMessage={handleSendMessage}
                  onSuggestionClick={handleSuggestionSelected}
                  isLoading={isLoading}
                  initialInputValue={null} // Now handled by InitialPromptScreen
                  selectedMode={selectedMode}
                  onModeChange={handleModeChange}
                  modesAvailable={{
                    minorEdit: hasFirstDraft,
                    justAsk: hasFirstDraft,
                  }}
                />
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default Editor;
