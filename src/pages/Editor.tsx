import { useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ChatInterface } from '@/components/ChatInterface';
import { EditorProvider, useEditor } from '@/contexts/EditorContext';

// Import our extracted components
import EditorHeader from '@/components/editor/EditorHeader';
import EmailPreviewPanel from '@/components/editor/EmailPreviewPanel';
import InitialPromptScreen from '@/components/editor/InitialPromptScreen';
import LoadingScreen from '@/components/editor/LoadingScreen';
import PlaceholderEditModal from '@/components/editor/PlaceholderEditModal';

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
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
};

/**
 * Editor Content Component
 * 
 * Handles the composition of all editor components and conditional rendering
 * based on the application state from EditorContext.
 */
const EditorContent = () => {
  const { 
    isLoadingProject, 
    projectData, 
    isLoading, 
    isClarifying,
    isCreatingFirstEmail,
    chatMessages,
    hasFirstDraft,
    clarificationConversation,
    selectedMode,
    handleModeChange,
    handleSendMessage,
    handleSuggestionSelected,
    handleFileSelected
  } = useEditor();

  // Reference to file input for image uploads from placeholders
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Connect file input change events to the context handler
  useEffect(() => {
    // Process file selection and pass to context
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelected(e);
      }
    };
    
    const fileInput = fileInputRef.current;
    if (fileInput) {
      fileInput.addEventListener('change', handleFileInputChange as any);
      
      return () => {
        fileInput.removeEventListener('change', handleFileInputChange as any);
      };
    }
  }, [handleFileSelected]);

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
      ) : (!projectData?.semantic_email_v2 && !isClarifying && !isCreatingFirstEmail) ? (
        // Initial prompt for creating the first email
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
            {(isLoading || isCreatingFirstEmail || (isClarifying && !projectData?.semantic_email_v2) || 
              (!projectData?.semantic_email_v2 && !isClarifying && chatMessages.length > 0)) ? (
              <LoadingScreen type={isClarifying ? 'clarifying' : 'generating'} />
            ) : (
              <EmailPreviewPanel fileInputRef={fileInputRef} />
            )}

            {/* Hidden file input for image uploads */}
            <input 
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
            />
          </ResizablePanel>
          
          {/* Resizable handle between panels */}
          <ResizableHandle withHandle />
          
          {/* Right Panel: Chat Interface */}
          <ResizablePanel 
            defaultSize={25} 
            minSize={20}
            className="border-l border-gray-200 bg-gray-50 h-full overflow-hidden"
          >
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
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Modal for editing link placeholders */}
      <PlaceholderEditModal />
    </div>
  );
};

export default Editor;
