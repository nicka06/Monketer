import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getProject,
  getProjectByNameAndUsername,
  getChatMessages,
  updateProject,
} from '@/features/services/projectService';
import { HtmlGeneratorV2 } from '@/features/services/htmlGenerator';
import type { Project, ExtendedChatMessage, SimpleClarificationMessage, PendingChange } from '@/features/types/editor';
import { TargetMessageType } from './types';

// This helper function is also present in the main index.tsx.
// It's duplicated for now and can be moved to a shared utils file later.
function isValidTargetMessageType(type: any): type is TargetMessageType {
  const VALID_TARGET_MESSAGE_TYPES: ReadonlyArray<TargetMessageType> = [
    "error", "question", "clarification", "edit_request", "success", "answer", "edit_response"
  ];
  return VALID_TARGET_MESSAGE_TYPES.includes(type);
}

/**
 * Props for the useProjectManagement hook.
 * This defines all the state setters and dependencies needed from the main provider.
 */
interface UseProjectManagementProps {
  // State setters from useEditorState
  setProjectData: (data: Project | null) => void;
  setProjectTitle: (title: string) => void;
  setActualProjectId: (id: string | null) => void;
  setHasCode: (has: boolean) => void;
  setChatMessages: (updater: (msgs: ExtendedChatMessage[]) => ExtendedChatMessage[]) => void;
  setClarificationConversation: (updater: (msgs: SimpleClarificationMessage[]) => SimpleClarificationMessage[]) => void;
  setClarificationContext: (context: any) => void;
  setIsClarifying: (isClarifying: boolean) => void;
  setPendingChanges: (changes: PendingChange[]) => void;
  setCurrentBatchId: (id: string | null) => void;
  setLivePreviewHtml: (html: string | null) => void;
  setHasFirstDraft: (has: boolean) => void;
  setIsLoadingProject: (loading: boolean) => void;
  setIsCreatingFirstEmail: (isCreating: boolean) => void;
  setInitialInputValue: (value: string) => void;
  setCurrentUsername: (name: string | null) => void;
  
  // Dependencies from the parent EditorProvider
  htmlGenerator: HtmlGeneratorV2;
  actualProjectId: string | null;
  handleEditorError: (error: unknown, context: string, severity?: 'warning' | 'error') => string;
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
}

/**
 * Custom hook to manage project loading, initialization, and refreshing.
 * It encapsulates the logic related to fetching project data from the server
 * based on URL parameters.
 */
export const useProjectManagement = ({
  setProjectData,
  setProjectTitle,
  setActualProjectId,
  setHasCode,
  setChatMessages,
  setClarificationConversation,
  setClarificationContext,
  setIsClarifying,
  setPendingChanges,
  setCurrentBatchId,
  setLivePreviewHtml,
  setHasFirstDraft,
  setIsLoadingProject,
  setIsCreatingFirstEmail,
  setInitialInputValue,
  setCurrentUsername,
  htmlGenerator,
  actualProjectId,
  handleEditorError,
  setIsLoading,
  setProgress,
}: UseProjectManagementProps) => {
  const { projectId, username, projectName } = useParams<{ projectId?: string; username?: string; projectName?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAndSetProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      console.log(`[fetchAndSetProject] Fetching project with ID: ${id}`);
      const fetchedResult = await getProject(id);
      
      if (fetchedResult && fetchedResult.project) {
        setProjectData(fetchedResult.project);
        setProjectTitle(fetchedResult.project.name);
        setActualProjectId(fetchedResult.project.id);
        setHasCode(!!fetchedResult.project.current_html);
        
        const rawChatMessages = await getChatMessages(id);
        const clarificationMessagesHistory: SimpleClarificationMessage[] = [];
        const regularMessages: ExtendedChatMessage[] = [];

        rawChatMessages.forEach(msg => {
          const messageRole: 'user' | 'assistant' = (msg.role === 'user') ? 'user' : 'assistant';
          let messageType: TargetMessageType;
          if (msg.message_type && isValidTargetMessageType(msg.message_type)) {
            messageType = msg.message_type;
          } else {
            if (msg.is_error) {
              messageType = 'error';
            } else if (messageRole === 'user') {
              messageType = 'edit_request';
            } else {
              messageType = 'answer';
            }
          }

          const extendedMsg: ExtendedChatMessage = {
              id: msg.id, 
              role: messageRole, 
              content: msg.content,
              timestamp: new Date(msg.timestamp), 
              is_error: msg.is_error || false,
              type: messageType,
              suggestions: undefined,
          };
          if (msg.is_clarifying_chat) { 
            clarificationMessagesHistory.push({ role: extendedMsg.role, content: extendedMsg.content });
          }
          regularMessages.push(extendedMsg); 
        });

        setChatMessages(() => regularMessages); 
        setClarificationConversation(() => clarificationMessagesHistory);

        if (fetchedResult.project.current_clarification_context) {
          setClarificationContext(fetchedResult.project.current_clarification_context);
        } else {
          setClarificationContext(null);
          setIsClarifying(false);
        }
        
        setPendingChanges(fetchedResult.pendingChanges || []);
        setLivePreviewHtml(fetchedResult.project.current_html || null);
        
        if (fetchedResult.pendingChanges && fetchedResult.pendingChanges.length > 0) {
          const firstBatchId = fetchedResult.pendingChanges[0].batch_id;
          setCurrentBatchId(firstBatchId);
          console.log(`[fetchAndSetProject] Set currentBatchId from first pending change: ${firstBatchId}`);
        }
        
        const hasEmail = !!fetchedResult.project.current_html || 
                         !!fetchedResult.project.semantic_email_v2;
        setHasFirstDraft(hasEmail);
        
        if (fetchedResult.project.semantic_email_v2 && !fetchedResult.project.current_html) {
          console.log("[fetchAndSetProject] We have semantic data but no HTML, generating...");
          try {
            const generatedHtml = await htmlGenerator.generate(fetchedResult.project.semantic_email_v2);
            if (generatedHtml) {
              setLivePreviewHtml(generatedHtml);
              await updateProject(id, { current_html: generatedHtml });
            }
          } catch (error) {
            console.error("[fetchAndSetProject] Error generating HTML from semantic template:", error);
          }
        }
        
        return fetchedResult.project;
      } else {
        console.warn("[fetchAndSetProject] Project not found:", id);
        toast({ title: 'Error', description: 'Project not found.', variant: 'destructive' });
        navigate('/dashboard');
        return null;
      }
    } catch (error) {
      console.error('[fetchAndSetProject] Error fetching project:', error);
      toast({ title: 'Error', description: 'Failed to load project data.', variant: 'destructive' });
      navigate('/dashboard');
      return null;
    }
  }, [
    navigate, toast, htmlGenerator, 
    setProjectData, setProjectTitle, setActualProjectId, setHasCode, 
    setChatMessages, setClarificationConversation, setClarificationContext, 
    setIsClarifying, setPendingChanges, setCurrentBatchId, setLivePreviewHtml, 
    setHasFirstDraft
  ]);

  useEffect(() => {
    const initializeEditor = async () => {
      setIsLoadingProject(true);
      
      try {
        if (projectId) {
          console.log(`Loading project by ID: ${projectId}`);
          await fetchAndSetProject(projectId);
        } 
        else if (username && projectName) {
          console.log(`Loading project by username/name: ${username}/${projectName}`);
          const projectStub = await getProjectByNameAndUsername(decodeURIComponent(projectName), username);
          
          if (projectStub && projectStub.id) { 
            await fetchAndSetProject(projectStub.id);
            setCurrentUsername(username);
          } else {
            toast({ 
              title: 'Project Not Found', 
              description: `Could not find project stub for "${projectName}" for user "${username}".`,
              variant: 'destructive'
            });
            navigate('/dashboard');
          }
        } 
        else {
          console.log('No project identifiers in URL, starting fresh');
          setIsLoadingProject(false);
          setIsCreatingFirstEmail(true);
          
          const storedPrompt = localStorage.getItem('initialEmailPrompt');
          if (storedPrompt) {
            setInitialInputValue(storedPrompt);
            localStorage.removeItem('initialEmailPrompt');
          }
        }
      } catch (error) {
        console.error('Error initializing editor:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to initialize editor', 
          variant: 'destructive' 
        });
        navigate('/dashboard');
      } finally {
        setIsLoadingProject(false);
      }
    };

    initializeEditor();
  }, [
      projectId, username, projectName, navigate, toast, fetchAndSetProject, 
      setIsLoadingProject, setCurrentUsername, setIsCreatingFirstEmail, 
      setInitialInputValue
  ]);

  const handleRefreshProject = useCallback(async () => {
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'No project to refresh', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setProgress(30);
    
    try {
      await fetchAndSetProject(actualProjectId);
      toast({ title: 'Success', description: 'Project refreshed' });
    } catch (error) {
      handleEditorError(error, 'handleRefreshProject');
    } finally {
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [actualProjectId, fetchAndSetProject, handleEditorError, toast, setIsLoading, setProgress]);

  // The hook returns functions that need to be called from the provider.
  return { fetchAndSetProject, handleRefreshProject };
}; 