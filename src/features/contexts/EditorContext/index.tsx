/**
 * EditorContext.tsx
 * 
 * This file implements a comprehensive context provider for the email editor functionality.
 * It centralizes all editor state, operations, and business logic in one place, allowing
 * components to easily access editor functionality through a React context.
 */

// Core React imports for context creation and hooks
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
// Router functionality for navigation and route parameters
import { useParams, useNavigate } from 'react-router-dom';
// Custom toast hook for notifications
import { useToast } from '@/hooks/use-toast';
// Authentication hook for user data and auth operations
import { useAuth } from '@/features/auth/useAuth';
// Project-related service functions for database operations
import { 
  getProject, 
  createProject, 
  getProjectByNameAndUsername, 
  updateProject,
  getPendingChanges,
  exportEmailAsHtmlV2,
  saveChatMessage,
  getChatMessages,
  updateProjectContent
} from '@/features/services/projectService';
// Type definitions for core data structures
import type { Project, PendingChange, ExtendedChatMessage, SimpleClarificationMessage } from '@/features/types/editor';
// Import for email template type definition from the Supabase functions shared types
import type { EmailTemplate as EmailTemplateV2, EmailElement, EmailSection } from '../../../shared/types';
// UUID generation utility
import { generateId } from '@/lib/uuid';
// Supabase client for direct database operations
import { supabase } from '@/integrations/supabase/client';
// HTML generator for rendering email templates
import { HtmlGeneratorV2 } from '@/features/services/htmlGenerator';
import { EditorContextType, InteractionMode, TargetMessageType } from './types';
import { useEditorState } from './useEditorState';
import { useProjectManagement } from './useProjectManagement';
import { useChatActions } from './useChatActions';

// Helper for message type validation
const VALID_TARGET_MESSAGE_TYPES: ReadonlyArray<TargetMessageType> = [
  "error", "question", "clarification", "edit_request", "success", "answer", "edit_response"
];

function isValidTargetMessageType(type: any): type is TargetMessageType {
  return VALID_TARGET_MESSAGE_TYPES.includes(type);
}

/**
 * Create the context with undefined default value.
 */
const EditorContext = createContext<EditorContextType | undefined>(undefined);

/**
 * EditorProvider Component
 * 
 * This provider component wraps the editor interface and supplies all state,
 * data, and functionality needed for the email editor to function.
 */
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Extract route parameters for project identification
  const { projectId, username, projectName } = useParams<{ projectId?: string; username?: string; projectName?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // All state is now managed by our custom hook
  const state = useEditorState();
  const {
    projectData, setProjectData,
    actualProjectId,
    chatMessages,
    pendingChanges,
    hasFirstDraft,
    isClarifying,
    clarificationContext,
  } = state;
  
  // HTML Generator - Instantiate once and reuse for all HTML generation
  const htmlGenerator = useMemo(() => new HtmlGeneratorV2(), []);
  
  // Moved from below to resolve 'used before declaration' errors
  const handleEditorError = useCallback((error: unknown, context: string, severity: 'warning' | 'error' = 'error') => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console[severity === 'error' ? 'error' : 'warn'](`[Editor|${context}] ${errorMessage}`, error);
    if (severity === 'error') {
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    return errorMessage;
  }, [toast]);
  
  // Project loading and initialization is now managed by its own hook
  const { fetchAndSetProject, handleRefreshProject } = useProjectManagement({
    ...state,
    htmlGenerator,
    handleEditorError,
  });

  const { handleSendMessage } = useChatActions(state);
  
  const selectElementForManualEdit = useCallback((elementId: string | null) => {
    console.log(`[EditorContext|selectElementForManualEdit] Selecting element: ${elementId}`);
    state.setSelectedManualEditElementId(elementId);
  }, [state.setSelectedManualEditElementId]);

  const commitManualEditsToDatabase = useCallback(async () => {
    if (!projectData || !projectData.semantic_email_v2 || !actualProjectId) {
      toast({ title: 'Error', description: 'Cannot save, project data or ID missing.', variant: 'destructive' });
      return;
    }
    console.log(`[EditorContext|commitManualEditsToDatabase] Committing changes for project: ${actualProjectId}`);
    state.setIsLoading(true);
    try {
      // true for createVersion, can be changed if versioning control is added to UI
      await updateProjectContent(actualProjectId, projectData.semantic_email_v2, true);
      toast({ title: 'Success', description: 'Manual changes saved to database.' });
      // Optionally, refresh pending changes or other related data if needed
      // await fetchAndSetProject(actualProjectId); // Could re-fetch all, or just update specific parts
    } catch (error) {
      handleEditorError(error, 'commitManualEditsToDatabase');
    } finally {
      state.setIsLoading(false);
    }
  }, [actualProjectId, projectData, toast, handleEditorError, updateProjectContent, state.setIsLoading]);
  
  /**
   * Update HTML preview when semantic data changes
   * 
   * This effect monitors changes to the semantic email structure and
   * regenerates the HTML preview whenever the structure changes.
   * It also persists the HTML to the database if it's different from
   * the current stored version.
   */
  useEffect(() => {
    const updateSemanticEmail = async () => {
      // Only proceed if we have semantic data and a project ID
      if (!projectData?.semantic_email_v2 || !actualProjectId) return;
      
      try {
        // Generate HTML from the semantic structure
        const generatedHtml = await htmlGenerator.generate(projectData.semantic_email_v2);
        
        // If the HTML is different from the current version, update the preview
        if (generatedHtml && generatedHtml !== projectData.current_html) {
          console.log('[Editor] Semantic email changed, updating HTML preview');
          state.setLivePreviewHtml(generatedHtml);
          
          // Persist HTML changes to database if significant update
          if (projectData.current_html && generatedHtml !== projectData.current_html) {
            await updateProject(actualProjectId, { 
              current_html: generatedHtml 
            });
          }
        }
      } catch (error) {
        console.error('Error updating HTML from semantic email:', error);
      }
    };
    
    updateSemanticEmail();
  }, [projectData?.semantic_email_v2, actualProjectId, htmlGenerator]);
  
  /**
   * Update hasFirstDraft state when HTML content exists
   * 
   * This effect ensures that the hasFirstDraft flag is properly set
   * whenever we have email content, which affects what modes and
   * operations are available in the UI.
   */
  useEffect(() => {
    if (projectData?.current_html && !hasFirstDraft) {
      state.setHasFirstDraft(true);
    }
  }, [projectData?.current_html, hasFirstDraft, state]);
  
  /**
   * handleSendMessage - Core function for sending user messages to the AI
   * 
   * This function handles all communication with the AI, managing several different flows:
   * 1. First-time email creation with potential clarification
   * 2. Ongoing clarification conversation for gathering requirements
   * 3. Normal messaging for questions and edits once a draft exists
   * 
   * It manages state transitions, API calls, and error handling for all message types.
   * 
   * @param message - The user's message content
   * @param mode - The interaction mode (ask/edit/major)
   */

  /**
   * handleFinalEmailGeneration - Generate email after gathering requirements
   * 
   * After completing the clarification flow, this function takes the
   * gathered context and sends it to the API to generate the final email.
   * It then updates the project with the generated content.
   * 
   * @param context - The gathered context from the clarification flow
   */
  const handleFinalEmailGeneration = async (context: any) => {
    // Ensure we have a project ID
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project ID missing', variant: 'destructive' });
      return;
    }
    
    // Set loading state and initial progress
    state.setIsLoading(true);
    state.setProgress(20);
    
    try {
      // Call the final email generation endpoint with the gathered context
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-generation-final-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          projectId: actualProjectId,
          context,
        }),
      });
      
      state.setProgress(70);
      
      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to generate email');
      }
      
      // Process the response data
      const data = await response.json() as { 
        emailData?: { html: string; semantic: any };
        message?: string;
      };
      
      // Update project with the generated email content
      if (data.emailData) {
        const updatedProject = await updateProject(actualProjectId, {
          current_html: data.emailData.html,
          semantic_email_v2: data.emailData.semantic,
          current_clarification_context: null // Clear clarification context on final generation
        });
        console.log("Cleared clarificationContext (final generation) in DB for project:", actualProjectId);
        
        if (updatedProject) {
          // Update local state with the generated content
          state.setLivePreviewHtml(data.emailData.html);
          setProjectData(updatedProject);
          state.setHasCode(true);
          state.setHasFirstDraft(true);
          
          // Add success message to chat
          const successMessage: ExtendedChatMessage = {
            id: generateId(),
            content: data.message || "I've created your email based on our discussion!",
            role: 'assistant',
            timestamp: new Date(),
            type: 'success',
            is_error: false,
          };
          state.setChatMessages(prev => [...prev, successMessage]);
          // Save success message
          try {
            console.log(`[EditorContext|handleFinalEmailGeneration] Saving success message for project ${actualProjectId}:`, successMessage);
            await saveChatMessage({
              id: successMessage.id, project_id: actualProjectId, role: successMessage.role, content: successMessage.content, timestamp: successMessage.timestamp,
              is_clarifying_chat: false, is_error: false, message_type: 'success',
            });
          } catch (saveError) { console.error("Failed to save success message (final gen) to DB:", saveError); }

        }
      } else {
        throw new Error("No email data received from generation");
      }
    } catch (error) {
      // Handle errors during email generation
      console.error("Error in final email generation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate email';
      
      toast({
        title: 'Generation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Add error message to chat
      const aiErrorMessage: ExtendedChatMessage = {
        id: generateId(),
        content: `Sorry, I couldn't create your email: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'error',
        is_error: true,
      };
      state.setChatMessages(prev => [...prev, aiErrorMessage]);
      // Save error message
      if (actualProjectId) {
        try {
          console.log(`[EditorContext|handleFinalEmailGeneration] Saving error message for project ${actualProjectId}:`, aiErrorMessage);
          await saveChatMessage({
            id: aiErrorMessage.id, project_id: actualProjectId, role: aiErrorMessage.role, content: aiErrorMessage.content, timestamp: aiErrorMessage.timestamp,
            is_clarifying_chat: false, // Error is for final generation, not a clarification step
            is_error: true, message_type: 'error',
          });
        } catch (saveError) { console.error("Failed to save error message (final gen) to DB:", saveError); }
      }
    } finally {
      // Clean up loading state
      state.setIsLoading(false);
      state.setProgress(100);
      state.setIsCreatingFirstEmail(false);
      setTimeout(() => state.setProgress(0), 500); // Reset progress after a delay
    }
  };

  /**
   * handleSuggestionSelected - Process when a user clicks on a suggestion
   * 
   * When the AI provides suggestion buttons and the user clicks one,
   * this function treats it as if the user had typed and sent that message.
   * 
   * @param suggestionValue - The text content of the selected suggestion
   */
  const handleSuggestionSelected = async (suggestionValue: string) => {
    // Ignore empty suggestions
    if (!suggestionValue.trim()) {
      return;
    }
    
    // When a user clicks a suggestion, treat it as if they typed it
    // and submitted it as a message in the current mode
    await handleSendMessage(suggestionValue, state.selectedMode);
  };
  
  /**
   * handleModeChange - Switch between different interaction modes
   * 
   * Changes the current interaction mode (ask/edit/major), with some
   * restrictions based on whether an email draft exists yet.
   * 
   * @param newMode - The interaction mode to switch to
   */
  const handleModeChange = (newMode: InteractionMode) => {
    // Only allow 'major' mode or any mode if a draft exists
    if (newMode === 'major' || hasFirstDraft) {
      state.setSelectedMode(newMode);
      
      // Log when switching to major edit mode on an existing draft
      if (newMode === 'major' && hasFirstDraft && !isClarifying) {
         console.log("[Editor|handleModeChange] Switched to Major Edit on existing draft. Ready for new clarification input.");
      }
    } else {
      // Notify user that some modes are only available after draft creation
      toast({
        title: "Mode Unavailable", 
        description: "Minor Edit and Just Ask modes are available after the first email draft is generated.", 
        duration: 3000
      });
    }
  };
  
  /**
   * handleNavigateToSendPage - Prepare email for sending and navigate to send page
   * 
   * Exports the current email as HTML and stores it in session storage,
   * then navigates to the send email page.
   */
  const handleNavigateToSendPage = async () => {
    // Ensure we have email content to send
    if (!projectData?.current_html) {
      toast({
        title: "Cannot Send",
        description: "Please generate an email template first.",
        variant: "destructive",
      });
      return;
    }
    
    
    // Ensure we have the semantic structure (required for V2)
    if (!projectData.semantic_email_v2) {
        toast({
            title: "Cannot Send",
            description: "Missing email structure data (V2). Please try generating again.",
            variant: "destructive",
        });
        return;
    }

    try {
      // Generate the final HTML from the semantic template
      const currentHtml = await exportEmailAsHtmlV2(projectData.semantic_email_v2); 
      
      // Store in session storage for the send page to access
      sessionStorage.setItem('emailHtmlToSend', currentHtml);
      console.log("Stored current V2 email HTML in sessionStorage.");

      // Navigate to the send email page
      navigate('/send-email');

    } catch (error) {
      console.error("Error preparing V2 email for sending:", error);
      toast({
        title: "Error",
        description: "Could not prepare email content for sending.",
        variant: "destructive",
      });
    }
  };
  
  /**
   * handleAcceptCurrentBatch - Accept all pending changes to the email
   * 
   * Calls the API to apply all pending changes to the email,
   * then refreshes the project data to show the updated content.
   */
  const handleAcceptCurrentBatch = async () => {
    if (!actualProjectId || !state.currentBatchId) {  
      toast({ title: 'Error', description: 'Project or Batch ID is missing.', variant: 'destructive' });
      return;
    }

    console.log(`[EditorContext|handleAcceptCurrentBatch] Initiated for project ${actualProjectId}, batch ${state.currentBatchId}`); // <<< ADDED
    state.setIsLoading(true);
    state.setProgress(30);

    try {
      const payload = {
        projectId: actualProjectId,
        operation: 'accept_batch',
        batch_id: state.currentBatchId,
      };
      console.log('[EditorContext|handleAcceptCurrentBatch] Calling manage-pending-changes with payload:', payload); // <<< ADDED
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify(payload),
      });

      state.setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from manage-pending-changes (accept_batch)' })); // <<< ADDED .catch
        console.error('[EditorContext|handleAcceptCurrentBatch] API call failed:', response.status, errorData); // <<< ADDED
        throw new Error(errorData.error || errorData.message || 'Failed to accept batch of changes');
      }

      const result = await response.json();
      console.log('[EditorContext|handleAcceptCurrentBatch] API call successful, result:', result); // <<< ADDED
      toast({
        title: 'Success',
        description: result.message || 'All pending changes in the batch accepted.',
      });

      // Update local state for all accepted changes in the batch
      state.setPendingChanges(prevChanges =>
        prevChanges.map(change =>
          change.batch_id === state.currentBatchId && change.status === 'pending' 
            ? { ...change, status: 'accepted' } 
            : change
        )
      );

      // PREFER to use HTML and template directly from API response
      if (result.newHtml && result.updatedTemplate) {
        console.log('[EditorContext|handleAcceptCurrentBatch] Using newHtml and updatedTemplate from API response.');
        state.setLivePreviewHtml(result.newHtml);
        setProjectData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            current_html: result.newHtml,
            semantic_email_v2: result.updatedTemplate,
            // Potentially update other projectData fields if the API returns them e.g. last_edited_at
          };
        });
        // Optionally, still call fetchAndSetProject if other non-template data needs refresh
        // For now, let's assume the direct update is sufficient for the email content.
        // If other parts of projectData (not in updatedTemplate) need refresh, uncomment below:
        // console.log('[EditorContext|handleAcceptCurrentBatch] API provided HTML/Template. Optionally fetching full project for other data.');
        // await fetchAndSetProject(actualProjectId); 
      } else {
        // Fallback to full fetch if API didn't provide the content (should not happen for accept_batch)
        console.warn('[EditorContext|handleAcceptCurrentBatch] API did not return newHtml/updatedTemplate. Falling back to fetchAndSetProject.');
        await fetchAndSetProject(actualProjectId);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error accepting batch:', error);
      toast({
        title: 'Error Accepting Batch',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      state.setIsLoading(false);
      state.setProgress(100);
      setTimeout(() => state.setProgress(0), 500);
    }
  };
  
  /**
   * handleRejectCurrentBatch - Reject all pending changes to the email
   * 
   * Calls the API to discard all pending changes to the email,
   * then refreshes the project data to restore the original content.
   */
  const handleRejectCurrentBatch = async () => {
    if (!actualProjectId || !state.currentBatchId) {
      toast({ title: 'Error', description: 'Project or Batch ID is missing.', variant: 'destructive' });
      return;
    }

    console.log(`[EditorContext|handleRejectCurrentBatch] Initiated for project ${actualProjectId}, batch ${state.currentBatchId}`); // <<< ADDED
    state.setIsLoading(true);
    state.setProgress(30);

    try {
      const payload = {
        projectId: actualProjectId,
        operation: 'reject_batch',
        batch_id: state.currentBatchId,
      };
      console.log('[EditorContext|handleRejectCurrentBatch] Calling manage-pending-changes with payload:', payload); // <<< ADDED

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify(payload),
      });

      state.setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from manage-pending-changes (reject_batch)' })); // <<< ADDED .catch
        console.error('[EditorContext|handleRejectCurrentBatch] API call failed:', response.status, errorData); // <<< ADDED
        throw new Error(errorData.error || errorData.message || 'Failed to reject batch of changes');
      }

      const result = await response.json();
      console.log('[EditorContext|handleRejectCurrentBatch] API call successful, result:', result); // <<< ADDED
      toast({
        title: 'Success',
        description: result.message || 'All pending changes in the batch rejected.',
      });

      // Update local state for all rejected changes in the batch
      state.setPendingChanges(prevChanges =>
        prevChanges.map(change =>
          change.batch_id === state.currentBatchId && change.status === 'pending' 
            ? { ...change, status: 'rejected' } 
            : change
        )
      );
      // No need to fetch full project data for a batch reject.
      // We just update the local state.
      console.log('[EditorContext|handleRejectCurrentBatch] Successfully rejected batch locally.'); // <<< ADDED
      // PREFER to use HTML and template directly from API response IF AVAILABLE
      if (result.newHtml && result.updatedTemplate) {
        console.log('[EditorContext|handleRejectCurrentBatch] Using newHtml and updatedTemplate from API response for rejection.');
        state.setLivePreviewHtml(result.newHtml);
        setProjectData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            current_html: result.newHtml,
            semantic_email_v2: result.updatedTemplate,
          };
        });
      } else {
        // Fallback to full fetch if API didn't provide the content (current expectation for reject)
        console.log('[EditorContext|handleRejectCurrentBatch] API did not return newHtml/updatedTemplate for rejection. Falling back to fetchAndSetProject.');
        await fetchAndSetProject(actualProjectId);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error rejecting batch:', error);
      toast({
        title: 'Error Rejecting Batch',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      state.setIsLoading(false);
      state.setProgress(100);
      setTimeout(() => state.setProgress(0), 500);
    }
  };
  
  /**
   * handleAcceptOneChange - Accept a single pending change to the email
   * 
   * Calls the API to accept a single pending change to the email,
   * then refreshes the project data to show the updated content.
   * 
   * @param changeId - The ID of the pending change to accept
   */
  const handleAcceptOneChange = async (changeId: string) => {
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
    
    console.log(`[EditorContext|handleAcceptOneChange] Initiated for project ${actualProjectId}, changeId ${changeId}`); // <<< ADDED
    state.setIsLoading(true);
    state.setProgress(30);

    try {
      const payload = {
        projectId: actualProjectId,
        operation: 'accept_one',
        change_id: changeId,
      };
      console.log('[EditorContext|handleAcceptOneChange] Raw changeId param:', changeId); // <<< ADDED
      console.log('[EditorContext|handleAcceptOneChange] Payload just before fetch:', payload); // <<< ADDED
      console.log('[EditorContext|handleAcceptOneChange] Calling manage-pending-changes with payload:', payload); 
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify(payload),
      });

      state.setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from manage-pending-changes (accept_one)' })); // <<< ADDED .catch
        console.error('[EditorContext|handleAcceptOneChange] API call failed:', response.status, errorData); // <<< ADDED
        throw new Error(errorData.error || errorData.message || 'Failed to accept change');
      }

      const result = await response.json();
      console.log('[EditorContext|handleAcceptOneChange] API call successful, result:', result); // <<< ADDED
      toast({
        title: 'Success',
        description: result.message || 'Selected change accepted.',
      });

      state.setPendingChanges(prevChanges => 
        prevChanges.map(change => 
          change.id === changeId ? { ...change, status: 'accepted' } : change
        )
      );

      // PREFER to use HTML and template directly from API response
      if (result.newHtml && result.updatedTemplate) {
        console.log('[EditorContext|handleAcceptOneChange] Using newHtml and updatedTemplate from API response.');
        state.setLivePreviewHtml(result.newHtml);
        setProjectData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            current_html: result.newHtml,
            semantic_email_v2: result.updatedTemplate,
            // Potentially update other projectData fields if the API returns them e.g. last_edited_at
          };
        });
        // Optionally, still call fetchAndSetProject if other non-template data needs refresh
        // For now, let's assume the direct update is sufficient for the email content.
        // If other parts of projectData (not in updatedTemplate) need refresh, uncomment below:
        // console.log('[EditorContext|handleAcceptOneChange] API provided HTML/Template. Optionally fetching full project for other data.');
        // await fetchAndSetProject(actualProjectId);
      } else {
        // Fallback to full fetch if API didn't provide the content (should not happen for accept_one)
        console.warn('[EditorContext|handleAcceptOneChange] API did not return newHtml/updatedTemplate. Falling back to fetchAndSetProject.');
        await fetchAndSetProject(actualProjectId);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error accepting change:', error);
      toast({
        title: 'Error Accepting Change',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      state.setIsLoading(false);
      state.setProgress(100);
      setTimeout(() => state.setProgress(0), 500);
    }
  };
  
  /**
   * handleRejectOneChange - Reject a single pending change to the email
   * 
   * Calls the API to reject a single pending change to the email,
   * then refreshes the project data to restore the original content.
   * 
   * @param changeId - The ID of the pending change to reject
   */
  const handleRejectOneChange = async (changeId: string) => {
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
    
    console.log(`[EditorContext|handleRejectOneChange] Initiated for project ${actualProjectId}, changeId ${changeId}`); // <<< ADDED
    state.setIsLoading(true);
    state.setProgress(30);

    try {
      const payload = {
        projectId: actualProjectId,
        operation: 'reject_one',
        change_id: changeId,
      };
      console.log('[EditorContext|handleRejectOneChange] Raw changeId param:', changeId); // <<< ADDED
      console.log('[EditorContext|handleRejectOneChange] Payload just before fetch:', payload); // <<< ADDED
      console.log('[EditorContext|handleRejectOneChange] Calling manage-pending-changes with payload:', payload); 
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify(payload),
      });

      state.setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from manage-pending-changes (reject_one)' })); // <<< ADDED .catch
        console.error('[EditorContext|handleRejectOneChange] API call failed:', response.status, errorData); // <<< ADDED
        throw new Error(errorData.error || errorData.message || 'Failed to reject change');
      }

      const result = await response.json();
      console.log('[EditorContext|handleRejectOneChange] API call successful, result:', result); // <<< ADDED
      toast({
        title: 'Success',
        description: result.message || 'Selected change rejected.',
      });

      state.setPendingChanges(prevChanges => 
        prevChanges.map(change => 
          change.id === changeId ? { ...change, status: 'rejected' } : change
        )
      );
      console.log('[EditorContext|handleRejectOneChange] Calling fetchAndSetProject to refresh data.'); // <<< ADDED
      // PREFER to use HTML and template directly from API response IF AVAILABLE
      if (result.newHtml && result.updatedTemplate) {
        console.log('[EditorContext|handleRejectOneChange] Using newHtml and updatedTemplate from API response for rejection.');
        state.setLivePreviewHtml(result.newHtml);
        setProjectData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            current_html: result.newHtml,
            semantic_email_v2: result.updatedTemplate,
          };
        });
      } else {
        // Fallback to full fetch if API didn't provide the content (current expectation for reject)
        console.log('[EditorContext|handleRejectOneChange] API did not return newHtml/updatedTemplate for rejection. Falling back to fetchAndSetProject.');
        await fetchAndSetProject(actualProjectId);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error rejecting change:', error);
      toast({
        title: 'Error Rejecting Change',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      state.setIsLoading(false);
      state.setProgress(100);
      setTimeout(() => state.setProgress(0), 500);
    }
  };
  
  /**
   * updateElementProperty - Update a property in the semantic email structure
   * 
   * This function safely updates a specified property of an element in the
   * semantic email structure, handling nested properties and deep copying
   * to avoid state mutation issues.
   * 
   * @param elementId - ID of the element to update
   * @param propertyPath - Dot-separated path to the property (e.g., 'url.href')
   * @param value - New value to set for the property
   */
  const updateElementProperty = (elementId: string, propertyPath: string, value: any): EmailTemplateV2 | null => {
    console.log(`[EditorContext|updateElementProperty] Attempting to update element ${elementId}, path ${propertyPath} with value:`, value);
    
    let newSemanticV2: EmailTemplateV2 | null = null;

    setProjectData(currentData => {
      if (!currentData?.semantic_email_v2) {
        console.error("[EditorContext|updateElementProperty] Error: semantic_email_v2 is missing.");
        newSemanticV2 = null; 
        return currentData;
      }

      const workingSemanticV2: EmailTemplateV2 = JSON.parse(JSON.stringify(currentData.semantic_email_v2));
      let elementFound = false;

      const findAndUpdateElement = (elements: any[]) => { 
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i] as EmailElement; // Type assertion
          if (element.id === elementId) {
            elementFound = true; // Mark that the element was found
            try {
              const pathParts = propertyPath.split('.');
              let rootObjectToUpdate: any = null;
              let pathToUpdateInRoot: string[] = [];
              let updatePerformed = false;

              console.log(`[Editor|updateElementProperty] Found element ${elementId}. Attempting to update path '${propertyPath}' with value:`, value);
              // console.log("[Editor|updateElementProperty] Element before update:", JSON.parse(JSON.stringify(element)));

              if (propertyPath === 'content') {
                element.content = value;
                updatePerformed = true;
                console.log(`[Editor|updateElementProperty] Directly updated element.content for ${elementId}. New content:`, element.content);
              } else if (pathParts[0] === 'layout') {
                rootObjectToUpdate = element.layout || {};
                element.layout = rootObjectToUpdate; // Ensure layout object exists
                pathToUpdateInRoot = pathParts.slice(1);
                console.log(`[Editor|updateElementProperty] Updating layout for ${elementId}. Path in layout: ${pathToUpdateInRoot.join('.')}`);
              } else if (pathParts[0] === 'properties') {
                rootObjectToUpdate = element.properties || {};
                element.properties = rootObjectToUpdate; // Ensure properties object exists
                pathToUpdateInRoot = pathParts.slice(1);
                console.log(`[Editor|updateElementProperty] Updating properties for ${elementId}. Path in properties: ${pathToUpdateInRoot.join('.')}`);
              } else {
                // Default to properties if no prefix matches, or if propertyPath is like "button.href" (implicit properties)
                rootObjectToUpdate = element.properties || {};
                element.properties = rootObjectToUpdate;
                pathToUpdateInRoot = pathParts; // Use the full path
                console.log(`[Editor|updateElementProperty] Defaulting to update properties for ${elementId}. Full path: ${pathToUpdateInRoot.join('.')}`);
              }

              if (rootObjectToUpdate && pathToUpdateInRoot.length > 0) {
                let currentLevel = rootObjectToUpdate;
                for (let j = 0; j < pathToUpdateInRoot.length - 1; j++) {
                  const part = pathToUpdateInRoot[j];
                  if (currentLevel[part] === undefined || currentLevel[part] === null || typeof currentLevel[part] !== 'object') {
                    console.log(`[Editor|updateElementProperty] Creating intermediate object for path part: ${part} in ${pathParts[0]}`);
                    currentLevel[part] = {};
                  }
                  currentLevel = currentLevel[part];
                }
                const finalPart = pathToUpdateInRoot[pathToUpdateInRoot.length - 1];
                console.log(`[Editor|updateElementProperty] Setting final property '${finalPart}' in ${pathParts[0]} to:`, value);
                currentLevel[finalPart] = value;
                updatePerformed = true;
              }
              
              if (updatePerformed) {
                 console.log(`[Editor|updateElementProperty] Element ${elementId} updated. Path: ${propertyPath}. New element state:`, JSON.parse(JSON.stringify(element)));
              } else if (propertyPath !== 'content') { // Only log if it wasn't a direct content update that failed somehow
                console.warn(`[Editor|updateElementProperty] Update was not performed for path ${propertyPath} on element ${elementId}. This might be okay if path was empty after prefix.`);
              }

            } catch (error) {
              console.error(`[Editor|updateElementProperty] Error updating property ${propertyPath} for element ${elementId}:`, error);
              // Continue, but element might be partially updated or unchanged
            }
            return true; // Element found, attempt to update was made.
          }

          // Recursively search in nested elements if applicable (e.g., for container/box types)
          if (element.type === 'container' || element.type === 'box') {
            const containerProperties = element.properties as any; // Adjust type as needed
            if (containerProperties && Array.isArray(containerProperties.elements)) {
              if (findAndUpdateElement(containerProperties.elements)) {
                return true; // Element found in nested structure
              }
            }
          }

        }
        return false; 
      };

      for (const section of workingSemanticV2.sections) {
        if (findAndUpdateElement(section.elements)) {
          break; 
        }
      }

      if (!elementFound) {
        console.error(`[EditorContext|updateElementProperty] Element with ID ${elementId} not found.`);
        newSemanticV2 = workingSemanticV2; 
        return currentData; 
      }
      
      newSemanticV2 = workingSemanticV2;
      return {
        ...currentData,
        semantic_email_v2: newSemanticV2,
      };
    });
    return newSemanticV2;
  };
  
  /**
   * handlePlaceholderActivation - Process when a user clicks a placeholder in the email
   * 
   * Sets up the editing state for a placeholder element in the email,
   * preparing for follow-up actions based on the element type.
   * 
   * @param context - Object with information about the placeholder element
   */
  const handlePlaceholderActivation = useCallback((context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => {
    console.log("[Editor] handlePlaceholderActivation called with context:", context);
    // Store the context for later use by handleFileSelected or handleSaveLink
    state.setEditingPlaceholder(context);

    // Handle different placeholder types
    if (context.type === 'image') {
      // For images, a file input should be triggered (handled by parent component)
      console.log("[Editor] Image placeholder activated, file selection should be triggered")
      state.setImageUploadRequested(c => c + 1); // Trigger the effect in EditorContent
    } else if (context.type === 'link') {
      // For links, open the link editing modal
      console.log("[Editor] Opening link modal.");
      state.setLinkInputValue('https://'); // Pre-fill with https://
      state.setIsLinkModalOpen(true);
    } else {
      // Log for unhandled placeholder types
      console.warn("[Editor] Placeholder activation received for unhandled type:", context.type);
    }
  }, []);
  
  /**
   * handleFileSelected - Process when a user selects an image file for an image placeholder
   * 
   * Uploads the selected image to Supabase storage, gets the public URL,
   * and updates the element property with the image URL.
   * 
   * @param event - The file input change event containing the selected file
   */
  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure we have files and an active placeholder context
    if (!event.target.files || event.target.files.length === 0 || !state.editingPlaceholder) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Validate file type (must be an image)
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Image must be less than 5MB.', variant: 'destructive' });
      return;
    }
    
    // Set loading state while uploading
    state.setIsLoading(true);
    
    try {
      console.log(`[Editor|handleFileSelected] Selected image: ${file.name} (${Math.round(file.size / 1024)}KB)`);
      
      // Create a unique storage path based on project ID and filename
      const filePath = `projects/${actualProjectId}/images/${generateId()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('email_assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      
      if (error) {
        throw error;
      }
      
      if (!data?.path) {
        throw new Error('Upload succeeded but file path is missing');
      }
      
      // Get public URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from('email_assets') // <<< CHANGED 'email-assets' to 'email_assets'
        .getPublicUrl(data.path);
        
      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      const imageUrl = urlData.publicUrl;
      console.log(`[Editor|handleFileSelected] Image uploaded successfully: ${imageUrl}`);
      
      // Update the element property with the image URL
      const { elementId, path } = state.editingPlaceholder;
      console.log(`[EditorContext|handleFileSelected] Calling updateElementProperty for elementId: ${elementId}, path: ${path}, imageUrl: ${imageUrl}`); // <<< ADDED
      const updatedSemanticEmail = updateElementProperty(elementId, path, imageUrl);
      console.log("[EditorContext|handleFileSelected] updateElementProperty finished."); // <<< ADDED
      
      // Save updated semantic data to database
      if (updatedSemanticEmail && actualProjectId) {
        console.log("[EditorContext|handleFileSelected] Calling updateProject to save UPDATED semantic_email_v2.");
        await updateProject(actualProjectId, { 
          semantic_email_v2: updatedSemanticEmail 
        });
        console.log("[EditorContext|handleFileSelected] updateProject finished.");

        // Also regenerate and set livePreviewHtml immediately
        try {
          const newHtml = await htmlGenerator.generate(updatedSemanticEmail);
          state.setLivePreviewHtml(newHtml);
          // Optionally, also save this newHtml to the database if desired immediately
          // await updateProject(actualProjectId, { current_html: newHtml }); 
        } catch (htmlGenError) {
          console.error("[EditorContext|handleFileSelected] Error generating HTML after image upload:", htmlGenError);
        }

      } else {
        console.warn("[EditorContext|handleFileSelected] Skipped updateProject: updatedSemanticEmail is null or actualProjectId missing.");
      }
      
      // Show success message
      toast({ title: 'Image Updated', description: 'Your image has been uploaded and added to the email.' });
      
      // Reset placeholder state
      state.setEditingPlaceholder(null);
      
    } catch (error) {
      // Handle errors during image upload
      console.error('[Editor|handleFileSelected] Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({ 
        title: 'Upload Failed', 
        description: `Could not upload image: ${errorMessage}`, 
        variant: 'destructive'
      });
    } finally {
      // Clean up loading state
      state.setIsLoading(false);
      
      // Reset the input field to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  
  /**
   * handleEditorError - Standardized error handling for editor operations
   * 
   * Provides consistent error logging and user feedback for errors that
   * occur during editor operations.
   * 
   * @param error - The error object or message
   * @param context - String description of where the error occurred
   * @param severity - 'warning' or 'error' to control logging and notifications
   * @returns Formatted error message string
   */
  

  /**
   * handleSaveLink - Save a link URL for a link placeholder
   * 
   * Validates and saves the link URL for a link placeholder element,
   * updating both the UI and persisting to the database.
   */
  const handleSaveLink = () => {
    // Ensure we have an active link placeholder
    if (!state.editingPlaceholder || state.editingPlaceholder.type !== 'link') return;

    const { elementId, path } = state.editingPlaceholder;
    const url = state.linkInputValue.trim();

    // Basic URL validation
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#'))) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL (e.g., https://...)', variant: 'destructive' });
      return;
    }

    // Update the element property with the link URL
    console.log(`Saving link for ${elementId} (${path}): ${url}`);
    updateElementProperty(elementId, path, url);
    toast({ title: 'Link Updated', description: 'Preview updated.' });

    // Persist the change to the database
    setProjectData(currentData => {
      if (!currentData) return null;
      
      console.log(`[Editor|handleSaveLink] Persisting updated semantic_email_v2 for project ${actualProjectId}`);
      updateProject(actualProjectId!, { semantic_email_v2: currentData.semantic_email_v2 })
        .then(() => console.log(`[Editor|handleSaveLink] Project semantic_email_v2 saved successfully.`))
        .catch(err => {
          console.error("[Editor|handleSaveLink] Error saving project data:", err);
          toast({ title: 'Save Error', description: 'Could not save link change to server.', variant: 'destructive' });
        });
        
      return currentData; // Return currentData unmodified
    });

    // Close modal and reset state
    state.setIsLinkModalOpen(false);
    state.setEditingPlaceholder(null);
    state.setLinkInputValue('');
  };
  
  /**
   * handleTitleChange - Update the project title
   * 
   * Updates the project title both in the UI and in the database.
   * 
   * @param newTitle - The new title for the project
   */
  const handleTitleChange = async (newTitle: string) => {
    // Ensure we have a project ID
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project ID missing', variant: 'destructive' });
      return;
    }
    
    // Validate title isn't empty
    if (!newTitle.trim()) {
      toast({ title: 'Error', description: 'Title cannot be empty', variant: 'destructive' });
      return;
    }
    
    try {
      // Set loading state and update UI immediately
      state.setIsLoading(true);
      state.setProjectTitle(newTitle);
      
      // Update the project in the database
      const updatedProject = await updateProject(actualProjectId, { name: newTitle });
      
      if (updatedProject) {
        // Update project data with the response
        setProjectData(updatedProject);
        toast({ title: 'Success', description: 'Project title updated' });
      } else {
        throw new Error('Failed to update project title');
      }
    } catch (error) {
      // Handle errors during title update
      console.error('Error updating project title:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      toast({
        title: 'Error',
        description: `Failed to update project title: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // Revert to original title if there was an error
      if (projectData?.name) {
        state.setProjectTitle(projectData.name);
      }
    } finally {
      // Clean up loading state
      state.setIsLoading(false);
    }
  };
  
  // Value to be provided by the context
  const contextValue = {
    // Pass all state and setters from the state hook
    ...state,
    
    // Pass remaining functions and generators
    handleSendMessage,
    handleTitleChange,
    handleAcceptCurrentBatch,
    handleRejectCurrentBatch,
    handleAcceptOneChange,
    handleRejectOneChange,
    handleSuggestionSelected,
    handleNavigateToSendPage,
    handleModeChange,
    handlePlaceholderActivation,
    handleSaveLink,
    handleFileSelected,
    updateElementProperty,
    
    // Utils
    fetchAndSetProject,
    htmlGenerator,
    handleRefreshProject,
    handleFinalEmailGeneration,
    handleEditorError,
    // Manual Editing functions
    selectedManualEditElementId: state.selectedManualEditElementId,
    selectElementForManualEdit,
    commitManualEditsToDatabase,
  };
  
  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

/**
 * Custom hook to use the editor context
 * 
 * This hook provides a convenient way for components to access the editor context,
 * with proper error handling if used outside of an EditorProvider.
 * 
 * @returns The editor context value
 * @throws Error if used outside of an EditorProvider
 */
export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

export default EditorContext;
