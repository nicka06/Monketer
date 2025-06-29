import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from '@/lib/uuid';
import { createProject, saveChatMessage, updateProject, getPendingChanges } from '@/features/services/projectService';
import type { InteractionMode, TargetMessageType } from './types';
import type { Project, ExtendedChatMessage, SimpleClarificationMessage, PendingChange } from '@/features/types/editor';

/**
 * Props for the useChatActions hook.
 * Defines all the state and setters the hook needs.
 */
export interface UseChatActionsProps {
  actualProjectId: string | null;
  setActualProjectId: (id: string | null) => void;
  projectData: Project | null;
  setProjectData: (data: Project | null) => void;
  projectTitle: string;
  isCreatingFirstEmail: boolean;
  setIsCreatingFirstEmail: (isCreating: boolean) => void;
  chatMessages: ExtendedChatMessage[]; 
  setChatMessages: Dispatch<SetStateAction<ExtendedChatMessage[]>>;
  isClarifying: boolean;
  setIsClarifying: (isClarifying: boolean) => void;
  clarificationContext: any;
  setClarificationContext: (context: any) => void;
  clarificationConversation: SimpleClarificationMessage[];
  setClarificationConversation: Dispatch<SetStateAction<SimpleClarificationMessage[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
  pendingChanges: PendingChange[];
  setPendingChanges: Dispatch<SetStateAction<PendingChange[]>>;
  currentBatchId: string | null;
  setCurrentBatchId: (id: string | null) => void;
  livePreviewHtml: string | null;
  setLivePreviewHtml: (html: string | null) => void;
  hasCode: boolean;
  setHasCode: (has: boolean) => void;
  hasFirstDraft: boolean;
  setHasFirstDraft: (has: boolean) => void;
  selectedMode: InteractionMode;
}

/**
 * Custom hook to manage all chat-related actions and AI interactions.
 */
export const useChatActions = (props: UseChatActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSendMessage = useCallback(async (message: string, mode: InteractionMode) => {
    const {
        actualProjectId,
        setActualProjectId,
        projectData,
        setProjectData,
        projectTitle,
        isCreatingFirstEmail,
        setIsCreatingFirstEmail,
        chatMessages,
        setChatMessages,
        isClarifying,
        setIsClarifying,
        clarificationContext,
        setClarificationContext,
        setClarificationConversation,
        setIsLoading,
        setProgress,
        setPendingChanges,
        setCurrentBatchId,
        setLivePreviewHtml,
        setHasCode,
        setHasFirstDraft,
        selectedMode,
    } = props;

    if (!message.trim()) {
      toast({ title: 'Error', description: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setProgress(10);

    let currentEffectiveProjectId = actualProjectId;

    try {
      const newUserMessage: ExtendedChatMessage = {
        id: generateId(),
        content: message,
        role: 'user',
        timestamp: new Date(),
        type: mode === 'ask' ? 'question' : 'edit_request',
        is_error: false,
      };
      setChatMessages(prev => [...prev, newUserMessage]);

      if (isCreatingFirstEmail && !currentEffectiveProjectId) {
        console.log("Attempting to establish project ID for first email flow before saving user message...");
        try {
          const newProject = await createProject(projectTitle);
          if (!newProject?.id) {
            throw new Error("Failed to create project for first email flow (handleSendMessage pre-save).");
          }
          setActualProjectId(newProject.id);
          setProjectData(newProject);
          currentEffectiveProjectId = newProject.id;
          window.history.replaceState({}, '', `/editor/${newProject.id}`);
          console.log("Created new project with ID for saving user message:", newProject.id);
        } catch (projectCreationError) {
          console.error("Error creating project before saving user message:", projectCreationError);
        }
      }
      
      if (currentEffectiveProjectId && user) {
        try {
          console.log(`[EditorContext|handleSendMessage] Saving user message for project ${currentEffectiveProjectId}:`, newUserMessage);
          await saveChatMessage({
            id: newUserMessage.id,
            project_id: currentEffectiveProjectId,
            user_id: user.id,
            role: newUserMessage.role,
            content: newUserMessage.content,
            timestamp: newUserMessage.timestamp,
            is_clarifying_chat: isClarifying,
            is_error: false,
            message_type: newUserMessage.type,
          });
        } catch (saveError) {
          console.error("Failed to save user chat message to DB:", saveError);
        }
      } else {
        console.warn("[EditorContext|handleSendMessage] Could not save user message: Missing project ID or user session.");
      }

      if (isCreatingFirstEmail) {
        setProgress(20);
        
        if (!currentEffectiveProjectId) {
          console.log("Creating a new project for first email flow (main block)...");
          setProgress(30);
          try {
            const newProject = await createProject(projectTitle); 
            if (!newProject?.id) {
              throw new Error("Failed to create project for first email flow");
            }
            setActualProjectId(newProject.id);
            setProjectData(newProject);
            currentEffectiveProjectId = newProject.id; 
            window.history.replaceState({}, '', `/editor/${newProject.id}`);
            console.log("Created new project with ID:", newProject.id);
          } catch (error) {
            console.error("Error creating project in first email flow:", error);
            const errMessage: ExtendedChatMessage = {
              id: generateId(), content: 'Failed to create a new project. Please try again.', role: 'assistant', timestamp: new Date(), type: 'error', is_error: true,
            };
            setChatMessages(prev => [...prev, errMessage]);
            setIsLoading(false); setProgress(0); return;
          }
        }
        
        if (!currentEffectiveProjectId) {
          toast({ title: 'Error', description: 'Project ID missing after creation attempt.', variant: 'destructive' });
          setIsLoading(false); return;
        }

        setProgress(40);
        console.log(`[EditorContext] Initiating 'clarify-user-intent' for project ${currentEffectiveProjectId}`);

        const clarifyPayload = { 
          userMessage: message,
          mainChatHistory: chatMessages.slice(-5).map(m => ({role: m.role, content: m.content })),
          currentSemanticEmailV2: null,
          ongoingClarificationContext: clarificationContext, 
          projectId: currentEffectiveProjectId,
          mode: 'major', 
        };

        const clarifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
          body: JSON.stringify(clarifyPayload),
        });
        setProgress(60);

        if (!clarifyResponse.ok) {
          const errorData = await clarifyResponse.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent' }));
          throw new Error(errorData.error || errorData.message || `Failed to clarify intent (status ${clarifyResponse.status})`);
        }
        const clarifyData = await clarifyResponse.json();

        if (clarifyData.status === 'requires_clarification') {
          console.log("[EditorContext] 'clarify-user-intent' requires clarification.");
          setIsClarifying(true); 
          setClarificationContext(clarifyData.updatedClarificationContext);
          if (currentEffectiveProjectId && clarifyData.updatedClarificationContext) {
            try {
              await updateProject(currentEffectiveProjectId, { current_clarification_context: clarifyData.updatedClarificationContext });
              console.log("Persisted updated clarificationContext (requires_clarification) to DB for project:", currentEffectiveProjectId);
            } catch (contextSaveError) { console.error("Failed to save clarificationContext (requires_clarification):", contextSaveError); }
          }
          
          const questionMessage: ExtendedChatMessage = {
            id: generateId(), content: clarifyData.question.text, role: 'assistant', timestamp: new Date(), type: 'clarification', suggestions: clarifyData.question.suggestions?.map(s => s.text) || [], is_error: false,
          };
          setChatMessages(prev => [...prev, questionMessage]);
          setClarificationConversation(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: clarifyData.question.text }]);
          if (currentEffectiveProjectId) {
            try {
              await saveChatMessage({
                id: questionMessage.id, project_id: currentEffectiveProjectId, role: questionMessage.role, content: questionMessage.content, timestamp: questionMessage.timestamp,
                is_clarifying_chat: true, is_error: false, message_type: 'clarification',
              });
            } catch (saveError) { console.error("Failed to save AI clarification question to DB:", saveError); }
          }

        } else if (clarifyData.status === 'complete') {
          console.log("[EditorContext] 'clarify-user-intent' complete. Proceeding to 'generate-email-changes'.");
          setProgress(70);
          setIsClarifying(false); 
          setClarificationContext(null); 
          if (currentEffectiveProjectId) {
            try {
              await updateProject(currentEffectiveProjectId, { current_clarification_context: null });
              console.log("Cleared clarificationContext (complete) in DB for project:", currentEffectiveProjectId);
            } catch (contextClearError) { console.error("Failed to clear clarificationContext (complete):", contextClearError); }
          }

          const generatePayload = { 
            projectId: currentEffectiveProjectId, mode: 'major', perfectPrompt: clarifyData.perfectPrompt,
            elementsToProcess: clarifyData.elementsToProcess, currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
          };
          
          const generateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
            body: JSON.stringify(generatePayload),
          });
          setProgress(90);

          if (!generateResponse.ok) {
            const errorData = await generateResponse.json().catch(() => ({ error: 'Failed to parse error from generate-email-changes' }));
            throw new Error(errorData.error || errorData.message || `Failed to generate email (status ${generateResponse.status})`);
          }
          const generateData = await generateResponse.json(); 

          let assistantMessageContent = "An unexpected error occurred while generating your email.";
          let assistantMessageType: ExtendedChatMessage['type'] = 'error';
          setPendingChanges([]);

          if (generateData.newHtml && generateData.newSemanticEmail && generateData.pending_batch_id && currentEffectiveProjectId) {
            const updatedProjectResult = await updateProject(currentEffectiveProjectId, {
              current_html: generateData.newHtml,
              semantic_email_v2: generateData.newSemanticEmail,
              name: generateData.newSemanticEmail.name || projectTitle, 
            });

            if (updatedProjectResult) {
              setProjectData(updatedProjectResult);
              setLivePreviewHtml(generateData.newHtml);
            }
            
            setCurrentBatchId(generateData.pending_batch_id);

            try {
              const allProjectPendingChanges = await getPendingChanges(currentEffectiveProjectId);
              const currentBatchSpecificChanges = (allProjectPendingChanges || []).filter(
                change => change.batch_id === generateData.pending_batch_id && change.status === 'pending'
              );

              if (currentBatchSpecificChanges.length > 0) {
                setPendingChanges(currentBatchSpecificChanges);
                assistantMessageContent = generateData.ai_rationale || "I've drafted your first email! Please review the proposed additions.";
                assistantMessageType = 'edit_response';
              } else {
                console.warn(`[EditorContext] HTML/Semantic data present, batch ID ${generateData.pending_batch_id} received, but no 'pending' changes found for this batch in DB.`);
                setPendingChanges([]);
                assistantMessageContent = generateData.ai_rationale || "I've created your email. It seems there are no specific items marked for initial review, but the content is ready.";
                assistantMessageType = 'success';
              }
            } catch (fetchError) {
              console.error("[EditorContext] Error fetching pending changes from DB:", fetchError);
              setPendingChanges([]);
              assistantMessageContent = "Your email was created, but there was an issue retrieving reviewable changes. Please check the content.";
            }

            setHasCode(true);
            setHasFirstDraft(true);
            setIsCreatingFirstEmail(false); 
            setIsClarifying(false); 

          } else {
            console.warn("[EditorContext] generate-email-changes (first email) did not return all expected fields (newHtml, newSemanticEmail, pending_batch_id). Data:", generateData);
            setPendingChanges([]);
            setCurrentBatchId(null);
            setIsCreatingFirstEmail(false);
            setIsClarifying(false);
            assistantMessageContent = generateData.ai_rationale || "I tried to create your email, but something went wrong with the initial setup. Please try again or contact support if the issue persists.";
            assistantMessageType = 'error'; 
            setHasCode(false);
            setHasFirstDraft(false);
          }
          
          const assistantFinalMessage: ExtendedChatMessage = {
            id: generateId(), content: assistantMessageContent, role: 'assistant', timestamp: new Date(), type: assistantMessageType, is_error: false,
          };
          setChatMessages(prev => [...prev, assistantFinalMessage]);
          if (currentEffectiveProjectId) {
            try {
              await saveChatMessage({
                id: assistantFinalMessage.id, project_id: currentEffectiveProjectId, role: assistantFinalMessage.role, content: assistantFinalMessage.content, timestamp: assistantFinalMessage.timestamp,
                is_clarifying_chat: false, is_error: false, message_type: assistantFinalMessage.type,
              });
            } catch (saveError) { console.error("Failed to save AI final message to DB:", saveError); }
          }
        } else {
          throw new Error(`Unknown status from clarification: ${clarifyData.status}`);
        }
      } 
      else { 
        if (isClarifying) {
          console.log(`[EditorContext] Continuing clarification for project ${actualProjectId} with message: "${message}"`);
          setClarificationConversation(prev => [...prev, { role: 'user', content: message }]);

          const clarifyPayload = {
            userMessage: message, mainChatHistory: [],
            currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
            ongoingClarificationContext: clarificationContext, projectId: actualProjectId!, mode: selectedMode,
          };
          const clarifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
            body: JSON.stringify(clarifyPayload),
          });
          setProgress(60);
          if (!clarifyResponse.ok) {
            const errorData = await clarifyResponse.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent (continue)' }));
            throw new Error(errorData.error || errorData.message || `Failed to continue clarification (status ${clarifyResponse.status})`);
          }
          const clarifyData = await clarifyResponse.json();

          if (clarifyData.status === 'requires_clarification') {
            setClarificationContext(clarifyData.updatedClarificationContext);
            if (actualProjectId && clarifyData.updatedClarificationContext) {
              try {
                await updateProject(actualProjectId, { current_clarification_context: clarifyData.updatedClarificationContext });
              } catch (contextSaveError) { console.error("Failed to save clarificationContext (still requires):", contextSaveError); }
            }
            const nextQuestionMessage: ExtendedChatMessage = {
              id: generateId(), content: clarifyData.question.text, role: 'assistant', timestamp: new Date(), type: 'clarification', suggestions: clarifyData.question.suggestions?.map(s => s.text) || [], is_error: false,
            };
            setChatMessages(prev => [...prev, nextQuestionMessage]);
            setClarificationConversation(prev => [...prev, { role: 'assistant', content: clarifyData.question.text }]);
            if (actualProjectId) {
              try {
                await saveChatMessage({
                  id: nextQuestionMessage.id, project_id: actualProjectId, role: nextQuestionMessage.role, content: nextQuestionMessage.content, timestamp: nextQuestionMessage.timestamp,
                  is_clarifying_chat: true, is_error: false, message_type: 'clarification',
                });
              } catch (saveError) { console.error("Failed to save AI next clarification question to DB:", saveError); }
            }
          } else if (clarifyData.status === 'complete') {
            console.log("[EditorContext] Clarification complete (during ongoing). Proceeding to 'generate-email-changes'.");
            setProgress(70); setIsClarifying(false); setClarificationContext(null);
             if (actualProjectId) {
              try {
                await updateProject(actualProjectId, { current_clarification_context: null });
              } catch (contextClearError) { console.error("Failed to clear clarificationContext (ongoing complete):", contextClearError); }
            }
            
            const generatePayload = { 
              projectId: actualProjectId!, mode: selectedMode, perfectPrompt: clarifyData.perfectPrompt,
              elementsToProcess: clarifyData.elementsToProcess, currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
            };
            const generateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
              body: JSON.stringify(generatePayload),
            });
            setProgress(90);
            if (!generateResponse.ok) {
              const errorData = await generateResponse.json().catch(() => ({ error: 'Failed to parse error from generate-email-changes (cont)' }));
              throw new Error(errorData.error || errorData.message || `Failed to generate changes (cont) (status ${generateResponse.status})`);
            }
            const generateData = await generateResponse.json();
            setCurrentBatchId(generateData.pending_batch_id || null);
            
            const newChangesFromThisBatch = generateData.pending_changes || [];
            setPendingChanges(prevPendingChanges => {
              const otherBatchOrResolvedChanges = prevPendingChanges.filter(
                pc => pc.batch_id !== generateData.pending_batch_id || pc.status !== 'pending'
              );
              const currentBatchEnsuredPending = newChangesFromThisBatch.map(c => ({...c, status: 'pending'}));
              return [...otherBatchOrResolvedChanges, ...currentBatchEnsuredPending];
            });

            let assistantMessageContent = generateData.ai_rationale || "Changes processed.";
            let assistantMessageType: ExtendedChatMessage['type'] = 'edit_response';

            if (generateData.newHtml && generateData.newSemanticEmail) {
              const updatedProject = await updateProject(actualProjectId!, { current_html: generateData.newHtml, semantic_email_v2: generateData.newSemanticEmail });
              if (updatedProject) { setProjectData(updatedProject); setLivePreviewHtml(generateData.newHtml); }
              assistantMessageContent = generateData.ai_rationale || clarifyData.finalSummary || "I've updated your email as requested.";
              assistantMessageType = 'success';
            } else if (generateData.pending_changes && generateData.pending_changes.length > 0) {
               assistantMessageContent = generateData.ai_rationale || "I have some new suggestions for your email. Please review them.";
            } else {
               assistantMessageContent = generateData.ai_rationale || "I reviewed your request, but no specific changes were generated this time.";
               assistantMessageType = 'answer';
            }
            const assistantFinalMessage: ExtendedChatMessage = {
              id: generateId(), content: assistantMessageContent, role: 'assistant', timestamp: new Date(), type: assistantMessageType, is_error: false,
            };
            setChatMessages(prev => [...prev, assistantFinalMessage]);
            if (actualProjectId) {
              try {
                await saveChatMessage({
                  id: assistantFinalMessage.id, project_id: actualProjectId, role: assistantFinalMessage.role, content: assistantFinalMessage.content, timestamp: assistantFinalMessage.timestamp,
                  is_clarifying_chat: false, is_error: false, message_type: assistantFinalMessage.type,
                });
              } catch (saveError) { console.error("Failed to save AI final message (clarif complete) to DB:", saveError); }
            }
          } else {
             throw new Error(`Unknown status from continued clarification: ${clarifyData.status}`);
          }
        } else { 
          if (mode === 'edit' || mode === 'major') {
            const clarifyPayload = {
              userMessage: message, mainChatHistory: chatMessages.slice(-5).map(m => ({role: m.role, content: m.content })),
              currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
              ongoingClarificationContext: null,
              projectId: actualProjectId!, mode: mode,
            };
            const clarifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
              body: JSON.stringify(clarifyPayload),
            });
            setProgress(60);
            if (!clarifyResponse.ok) {
              const errorData = await clarifyResponse.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent (direct)' }));
              throw new Error(errorData.error || errorData.message || `Failed to clarify intent (direct ${mode}, status ${clarifyResponse.status})`);
            }
            const clarifyData = await clarifyResponse.json();

            if (clarifyData.status === 'requires_clarification') {
              setIsClarifying(true); setClarificationContext(clarifyData.updatedClarificationContext);
              if (actualProjectId && clarifyData.updatedClarificationContext) {
                try {
                  await updateProject(actualProjectId, { current_clarification_context: clarifyData.updatedClarificationContext });
                } catch (contextSaveError) { console.error("Failed to save clarificationContext (direct requires):", contextSaveError); }
              }
              const questionMessage: ExtendedChatMessage = {
                id: generateId(), content: clarifyData.question.text, role: 'assistant', timestamp: new Date(), type: 'clarification', suggestions: clarifyData.question.suggestions?.map(s => s.text) || [], is_error: false,
              };
              setChatMessages(prev => [...prev, questionMessage]);
              setClarificationConversation(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: clarifyData.question.text }]);
              if (actualProjectId) {
                try {
                  await saveChatMessage({
                    id: questionMessage.id, project_id: actualProjectId, role: questionMessage.role, content: questionMessage.content, timestamp: questionMessage.timestamp,
                    is_clarifying_chat: true, is_error: false, message_type: 'clarification',
                  });
                } catch (saveError) { console.error("Failed to save AI question (direct edit) to DB:", saveError); }
              }
            } else if (clarifyData.status === 'complete') {
              setIsClarifying(false); setClarificationContext(null);
               if (actualProjectId) {
                try { await updateProject(actualProjectId, { current_clarification_context: null }); } catch (e) { /* ignore */ }
              }
              const generatePayload = { 
                projectId: actualProjectId!, mode: mode, perfectPrompt: clarifyData.perfectPrompt,
                elementsToProcess: clarifyData.elementsToProcess, currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
              };
              const generateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
                body: JSON.stringify(generatePayload),
              });
              setProgress(90);
              if (!generateResponse.ok) {
                const errorData = await generateResponse.json().catch(() => ({ error: 'Failed to parse error from generate-email-changes (direct)' }));
                throw new Error(errorData.error || errorData.message || `Failed to generate changes (direct ${mode}, status ${generateResponse.status})`);
              }
              const generateData = await generateResponse.json(); 
              setCurrentBatchId(generateData.pending_batch_id || null);
              
              const newChangesFromThisBatch = generateData.pending_changes || [];
              setPendingChanges(prevPendingChanges => {
                const otherBatchOrResolvedChanges = prevPendingChanges.filter(
                  pc => (pc.batch_id !== generateData.pending_batch_id || pc.status !== 'pending')
                );
                const currentBatchEnsuredPending = newChangesFromThisBatch.map(c => ({...c, status: 'pending'}));
                return [...otherBatchOrResolvedChanges, ...currentBatchEnsuredPending];
              });

              let assistantMessageContent = generateData.ai_rationale || "Changes processed.";
              let assistantMessageType: ExtendedChatMessage['type'] = 'edit_response';

              if (generateData.newHtml && generateData.newSemanticEmail) {
                const updatedProject = await updateProject(actualProjectId!, { current_html: generateData.newHtml, semantic_email_v2: generateData.newSemanticEmail });
                if (updatedProject) { setProjectData(updatedProject); setLivePreviewHtml(generateData.newHtml); }
                assistantMessageContent = generateData.ai_rationale || clarifyData.finalSummary || "I've updated the email based on your request.";
                assistantMessageType = 'success';
              } else if (generateData.pending_changes && generateData.pending_changes.length > 0) {
                setHasCode(true); 
                if (projectData?.current_html) setLivePreviewHtml(projectData.current_html); 
                assistantMessageContent = generateData.ai_rationale || "I have some new suggestions for your email. Please review them.";
              } else {
                 assistantMessageContent = generateData.ai_rationale || "I reviewed your request, but no specific changes were generated this time.";
                 assistantMessageType = 'answer';
              }
              const assistantFinalMessage: ExtendedChatMessage = {
                id: generateId(), content: assistantMessageContent, role: 'assistant', timestamp: new Date(), type: assistantMessageType, is_error: false,
              };
              setChatMessages(prev => [...prev, assistantFinalMessage]);
              if (actualProjectId) {
                try {
                  await saveChatMessage({
                    id: assistantFinalMessage.id, project_id: actualProjectId, role: assistantFinalMessage.role, content: assistantFinalMessage.content, timestamp: assistantFinalMessage.timestamp,
                    is_clarifying_chat: false, is_error: false, message_type: assistantFinalMessage.type,
                  });
                } catch (saveError) { console.error("Failed to save AI final message (direct mode) to DB:", saveError); }
              }
            } else {
              throw new Error(`Unknown status from direct ${mode} clarification: ${clarifyData.status}`);
            }
          } else if (mode === 'ask') {
            const endpoint = 'email-question';
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`},
              body: JSON.stringify({ projectId: actualProjectId, message, mode }),
            });
            setProgress(75);
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from email-question' }));
              throw new Error(errorData.error || errorData.message || `Failed to process question (status ${response.status})`);
            }
            const data = await response.json();
            const aiResponse: ExtendedChatMessage = {
              id: generateId(), content: data.message || "Here's your answer", role: 'assistant', timestamp: new Date(), type: 'answer', is_error: false,
            };
            setChatMessages(prev => [...prev, aiResponse]);
            if (actualProjectId) {
              try {
                await saveChatMessage({
                  id: aiResponse.id, project_id: actualProjectId, role: aiResponse.role, content: aiResponse.content, timestamp: aiResponse.timestamp,
                  is_clarifying_chat: false, is_error: false, message_type: 'answer',
                });
              } catch (saveError) { console.error("Failed to save AI 'ask' response to DB:", saveError); }
            }
          }
        }
      }
    } catch (error) {
      console.error("Unhandled error in message handling:", error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred. Please check the console.';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive'});
      
      const aiErrorMessage: ExtendedChatMessage = {
        id: generateId(), content: `Sorry, I encountered an error: ${errorMsg}`, role: 'assistant', timestamp: new Date(), type: 'error', is_error: true,
      };
      setChatMessages(prev => [...prev, aiErrorMessage]);
      if (currentEffectiveProjectId) {
        try {
          await saveChatMessage({
            id: aiErrorMessage.id, project_id: currentEffectiveProjectId, role: aiErrorMessage.role, content: aiErrorMessage.content, timestamp: aiErrorMessage.timestamp,
            is_clarifying_chat: isClarifying,
            is_error: true, message_type: 'error',
          });
        } catch (saveError) { console.error("Failed to save AI error message to DB:", saveError); }
      }
    } finally {
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500); 
    }
  }, [user, toast, props]);

  return { handleSendMessage };
};