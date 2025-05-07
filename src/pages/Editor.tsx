import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Mail, Sun, Moon, Smartphone, Monitor, Check, X, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreview } from '@/components/EmailPreview';
import { ChatInterface } from '@/components/ChatInterface';
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';
import { EmailTemplate as EmailTemplateV2, EmailElement as EmailElementTypeV2 } from '../../supabase/functions/_shared/types/v2';
import { ClarificationMessage, ClarificationApiResponse, QuestionResponse, CompleteResponse } from '@/types/ai';
import { 
  getProject, 
  saveChatMessage, 
  getPendingChanges,
  createProject, 
  getProjectByNameAndUsername, 
  savePendingChange,
  exportEmailAsHtmlV2,
  updateProject,
} from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/uuid';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { HtmlGeneratorV2 } from '@/services/v2/htmlGenerator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Define InteractionMode type locally or import if shared
type InteractionMode = 'ask' | 'edit' | 'major';

// Sample empty template for new projects // Removed: No longer used
// const emptyTemplate: EmailTemplate = { ... }; // Removed

const Editor = () => {
  const { projectId, username, projectName } = useParams<{ projectId?: string; username?: string; projectName?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null); // (+) Ref for hidden file input
  
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null); // Store the resolved project ID
  const [projectTitle, setProjectTitle] = useState('Untitled Document');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasCode, setHasCode] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [initialInputValue, setInitialInputValue] = useState<string | null>(null); // New state for initial input
  
  // State for preview controls
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isMobileView, setIsMobileView] = useState(false); // State for mobile switch
  
  // Add state for selected mode and set initial value to 'major'
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('major'); 
  
  // (+) State to track which placeholder is being edited
  const [editingPlaceholder, setEditingPlaceholder] = useState<{elementId: string, path: string, type: 'image' | 'link' | 'text'} | null>(null);
  
  // (+) State for the live preview HTML
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);
  
  // (+) State for link input modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  
  // (+) Memoized instance of the generator
  const htmlGenerator = useMemo(() => new HtmlGeneratorV2(), []);
  
  // State for clarification flow (Added state variables)
  const [clarificationConversation, setClarificationConversation] = useState<ClarificationMessage[]>([]);
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [clarificationContext, setClarificationContext] = useState<any>(null);
  const [hasFirstDraft, setHasFirstDraft] = useState<boolean>(false);
  const [isCreatingFirstEmail, setIsCreatingFirstEmail] = useState<boolean>(false); // New state
  
  // (+) Callback passed to EmailPreview's overlay click handler
  const handlePlaceholderActivation = useCallback((context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => {
    console.log("[Editor] handlePlaceholderActivation called with context:", context);
    setEditingPlaceholder(context); // Store context for handleFileSelected or handleSaveLink

    if (context.type === 'image') {
      if (fileInputRef.current) {
        console.log("[Editor] Directly triggering file input click for image.");
        fileInputRef.current.click(); // Trigger hidden file input *directly*
      } else {
         console.error("[Editor] Cannot trigger file input: fileInputRef is not available.");
      }
    } else if (context.type === 'link') {
      console.log("[Editor] Opening link modal.");
      setLinkInputValue('https://'); // Pre-fill
      setIsLinkModalOpen(true); // Open modal for links
    } else {
        console.warn("[Editor] Placeholder activation received for unhandled type:", context.type);
    }
    // No need to reset editingPlaceholder here immediately, 
    // handleFileSelected/handleSaveLink will do it after processing.
  }, []); // Empty dependency array, only uses setters and refs
  
  // Load username for current user
  useEffect(() => {
    if (user?.email) {
      setCurrentUsername(user.email);
    } else if (user?.id) {
      console.warn("User email not found, using fallback for username.");
      setCurrentUsername('user'); // Or handle differently
    }
  }, [user]);

  // Function to load pending changes separately
  const loadPendingChanges = useCallback(async (projId: string) => {
    if (!projId) return;
    try {
      const changes = await getPendingChanges(projId);
      setPendingChanges(changes || []);
    } catch (error) {
      console.error('Error loading pending changes:', error);
      toast({ title: 'Warning', description: 'Could not load pending changes.' });
      setPendingChanges([]); // Reset on error
    }
  }, [toast]);

  // Function to load chat history separately
  const loadChatHistory = useCallback(async (projId: string) => {
    if (!projId) return;
    try {
      console.log("Chat history loading not implemented yet.");
      setChatMessages([]); // Placeholder
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast({ title: 'Warning', description: 'Could not load chat history.' });
      setChatMessages([]); // Reset on error
    }
  }, [toast]);

  // Function to fetch and set project data (used by useEffect and accept/reject handlers)
  const fetchAndSetProject = useCallback(async (id: string) => {
    try {
      const fetchedResult = await getProject(id);
      if (fetchedResult && fetchedResult.project) {
        // --- Add Logging for Initial Load --- 
        console.log("[fetchAndSetProject] Fetched Project HTML (first 500 chars):", fetchedResult.project.current_html?.substring(0, 500));
        console.log("[fetchAndSetProject] Fetched Pending Changes:", JSON.stringify(fetchedResult.pendingChanges || [], null, 2));
        // --- End Logging --- 

        setProjectData(fetchedResult.project);
        setProjectTitle(fetchedResult.project.name);
        setActualProjectId(fetchedResult.project.id);
        setHasCode(!!fetchedResult.project.current_html);
        setChatMessages(fetchedResult.chatMessages || []);
        setPendingChanges(fetchedResult.pendingChanges || []);
        // (+) Initialize livePreviewHtml with fetched HTML
        setLivePreviewHtml(fetchedResult.project.current_html || null);
        setHasFirstDraft(false);
        return fetchedResult.project;
      } else {
        toast({ title: 'Error', description: 'Project not found.', variant: 'destructive' });
        navigate('/dashboard');
        return null;
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({ title: 'Error', description: 'Failed to load project data.', variant: 'destructive' });
      navigate('/dashboard');
      return null;
    }
  }, [navigate, toast]);

  // Combined useEffect for project loading
  useEffect(() => {
    if (!user) return;
    const loadProjectDataInternal = async () => {
      setIsLoadingProject(true);
      setProjectData(null);
      setChatMessages([]);
      setPendingChanges([]);
      setHasCode(false);
      setActualProjectId(null);
      setSelectedMode('major');
      setLivePreviewHtml(null);
      setClarificationConversation([]);
      setIsClarifying(false);
      setHasFirstDraft(false);

      try {
        // Case 1: Using the /editor/:projectId route
        if (projectId) {
          console.log(`Loading project by ID: ${projectId}`);
          await fetchAndSetProject(projectId);
        }
        // Case 2: Using the /editor/:username/:projectName route (DEPRECATED)
        else if (username && projectName) {
          console.log(`Loading project by name: ${projectName} for user ${username}`);
          try {
            const projectInfo = await getProjectByNameAndUsername(decodeURIComponent(projectName), username);
            if (projectInfo && projectInfo.id) {
              await fetchAndSetProject(projectInfo.id);
            } else {
              toast({ title: 'Error', description: 'Project not found by name.', variant: 'destructive' });
              navigate('/dashboard');
            }
          } catch (error) {
            console.error('Error loading project by name:', error);
            toast({ title: 'Error', description: 'Project not found or error loading by name.', variant: 'destructive' });
            navigate('/dashboard');
          }
        } 
        // Case 3: No specific project, potentially new project flow (handled by UI now)
        else {
          // This case might be where a user lands on /editor without a projectId
          // We will rely on the UI to show the initial prompt screen if projectData.semantic_email_v2 is null
          console.log("Navigated to editor without specific project ID or name. UI will handle initial state.");
          // Initialize with minimal state for a new project prompt
          setProjectData(null); // Explicitly null to trigger initial UI
          setProjectTitle('New Email');
          setActualProjectId(null); 
          setHasCode(false);
          setLivePreviewHtml(null);
          // No need to create a project here; user will initiate via prompt.
        }
      } catch (err) {
        console.error('Error in project loading useEffect:', err);
        toast({ title: 'Error', description: 'An unexpected error occurred while loading.', variant: 'destructive' });
        // navigate('/dashboard'); // Consider if navigation is always right here
      } finally {
        setIsLoadingProject(false);
      }
    };
    loadProjectDataInternal();
  }, [projectId, username, projectName, user, fetchAndSetProject, navigate, toast]);

  // Simulate progress for loading animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          const increment = Math.random() * 10;
          const newProgress = prevProgress + increment;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isLoading]);

  // (+) Add effect to listen for messages from the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // SECURITY: Check the origin of the message in a real application
      // if (event.origin !== 'expected_origin') return;
      
      const { type, payload } = event.data;

      if (type === 'placeholderClick') {
        console.log('Placeholder click received:', payload);
        // Payload: { id: string (elementId), path: string (propertyPath), type: 'image' | 'link' }
        const { id: elementId, path: propertyPath, type: placeholderType } = payload;
        
        if (!elementId || !propertyPath || !placeholderType) {
          console.error('Received incomplete placeholder click payload:', payload);
          toast({ title: 'Error', description: 'Could not process placeholder interaction.', variant: 'destructive' });
          return;
        }
        
        // Set the element being edited, including the path
        setEditingPlaceholder({ elementId, path: propertyPath, type: placeholderType });

        if (placeholderType === 'image') {
          // Trigger the hidden file input
          fileInputRef.current?.click(); 
        } else if (placeholderType === 'link') {
          // (+) Open the link input modal
          // editingPlaceholder is already set with id, path, type
          setLinkInputValue(''); // Clear previous input
          setIsLinkModalOpen(true); 
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [toast]); // Add dependencies if needed (e.g., functions called inside)

  // Handle title change and potentially update project name
  const handleTitleChange = async (newTitle: string) => {
    const originalTitle = projectData?.name || projectTitle;
    setProjectTitle(newTitle);
    
    if (actualProjectId) {
      try {
        const updatedProject = await updateProject(actualProjectId, { name: newTitle });
        
        if (!updatedProject) {
          throw new Error("Update failed to return project data.");
        }
        
        setProjectData(updatedProject);

        if (username && projectName && currentUsername) {
          console.warn("Updating deprecated username/projectname route");
          navigate(`/editor/${currentUsername}/${encodeURIComponent(newTitle)}`, { replace: true });
        } else if (actualProjectId) {
          if (window.location.pathname !== `/editor/${actualProjectId}`) {
            window.history.replaceState({}, '', `/editor/${actualProjectId}`);
          }
        }
        
        toast({ title: 'Success', description: 'Project name updated' });
      } catch (error) {
        console.error('Error updating project name:', error);
        toast({ title: 'Error', description: 'Failed to update project name', variant: 'destructive' });
        setProjectTitle(originalTitle);
      }
    } else {
      console.log("Project not yet created, updating title state only.");
    }
  };

  const processClarificationResponse = useCallback((result: ClarificationApiResponse) => {
    console.log('[Editor|processClarificationResponse] Received result:', JSON.stringify(result));
    setIsLoading(true); // Keep loading until generation is also done or clarification continues

    if (!result || !result.status) {
      console.error("[Editor|processClarificationResponse] Invalid result from clarification AI:", result);
      toast({ title: 'Error', description: 'Received an invalid response from the clarification AI.', variant: 'destructive' });
      setIsClarifying(false); 
      setClarificationConversation([]); 
      setIsLoading(false);
      return;
    }

    if (result.status === 'requires_clarification') {
      const questionResponse = result as QuestionResponse;
      console.log('[Editor|processClarificationResponse] Status: requires_clarification. AI Question ID:', questionResponse.question.id, 'Text:', questionResponse.question.text);
      const aiClarificationMessage: ClarificationMessage = {
        id: generateId(),
        sender: 'ai',
        text: questionResponse.question.text,
        suggestions: questionResponse.question.suggestions,
        isQuestion: true,
        timestamp: new Date().toISOString(),
      };
      setClarificationConversation(prev => {
        const newConvo = [...prev, aiClarificationMessage];
        console.log('[Editor|processClarificationResponse] Updating clarificationConversation to:', JSON.stringify(newConvo));
        return newConvo;
      });
      setClarificationContext(prevContext => {
        console.log('[Editor|processClarificationResponse] Updating clarificationContext from:', JSON.stringify(prevContext), 'to:', JSON.stringify(questionResponse.aiSummaryForNextTurn));
        return questionResponse.aiSummaryForNextTurn;
      });
      setIsClarifying(prevIsClarifying => {
        console.log('[Editor|processClarificationResponse] Updating isClarifying from:', prevIsClarifying, 'to: true');
        return true;
      });
      setIsLoading(false); // AI has responded, waiting for user
    } else if (result.status === 'complete') {
      console.log('[Editor|processClarificationResponse] Status: complete.');
      setIsClarifying(false);
      // The call to callGenerationAI will handle isLoading and setHasFirstDraft
      callGenerationAI(result as CompleteResponse);
    } else {
      // This case should ideally not be reached if types are correct, but good for safety
      const unknownResponse = result as any; // Cast to any to access status if it's an unexpected structure
      console.error("[Editor|processClarificationResponse] Unknown status from clarification AI:", unknownResponse);
      toast({ title: 'Error', description: `Received an unknown response type ('${(unknownResponse as any)?.status || 'unknown'}') from clarification AI.`, variant: 'destructive' });
      setIsClarifying(false); // Reset clarification state
      setClarificationConversation([]); // Clear conversation
      setIsLoading(false);
    }
  }, [toast, currentUsername, actualProjectId, projectData?.semantic_email_v2, chatMessages, clarificationContext]);

  const callGenerationAI = async (completionData: CompleteResponse) => {
    console.log('[Editor|callGenerationAI] Called with completion data.');
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project ID is missing.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const payload = {
        perfectPrompt: completionData.perfectPrompt,
        elementsToProcess: completionData.elementsToProcess,
        currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
        projectId: actualProjectId,
        newTemplateName: projectData?.name || 'Generated Email' // Or use a name from completionData if available
      };
      console.log('[Editor|callGenerationAI] Payload for generate-email-v2:', JSON.stringify(payload));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession() ? (await supabase.auth.getSession()).data.session?.access_token : ''}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('[Editor|callGenerationAI] Response status:', response.status);
      const responseText = await response.text();
      console.log('[Editor|callGenerationAI] Response text:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to generate email: ${response.status} ${responseText || response.statusText}`);
      }

      const newSemanticEmailV2 = JSON.parse(responseText) as EmailTemplateV2;
      console.log('[Editor|callGenerationAI] Successfully generated new EmailTemplateV2:', newSemanticEmailV2);

      setProjectData(prev => prev ? { ...prev, semantic_email_v2: newSemanticEmailV2, name: newSemanticEmailV2.name } : null);
      if (newSemanticEmailV2.name) setProjectTitle(newSemanticEmailV2.name);
      setHasCode(true); // Assuming this indicates HTML is generated/available
      setHasFirstDraft(true); // 3a. Set hasFirstDraft to true on success

      // Add AI message to main chat
      const aiMessageForMainChat: ChatMessage = {
        id: generateId(),
        project_id: actualProjectId,
        role: 'assistant',
        content: `Okay, I have all the details. Perfect prompt preview: "${completionData.perfectPrompt.substring(0, 100)}..."`, // Or a success message
        timestamp: new Date(), // 6. Corrected timestamp
      };
      setChatMessages(prev => [...prev, aiMessageForMainChat]);
      // Optionally save this to DB, or just display

      setIsCreatingFirstEmail(false); // Reset: First email created successfully
      toast({ title: 'Success', description: 'Email generated successfully!' });
    } catch (error: any) {
      console.error('[Editor|callGenerationAI] Error:', error);
      toast({ title: 'Error generating email', description: error.message || 'Unknown error', variant: 'destructive' });
      setHasFirstDraft(false); // 3b. Ensure it's false on error in catch block
      setIsCreatingFirstEmail(false); // Reset: Error during first email generation
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async (message: string, mode: InteractionMode /* mode might be deprecated or used differently now */) => {
    console.log("%%%% EDITOR: handleSendMessage CALLED %%%%"); // Simplest possible log
    setIsLoading(true);
    
    let currentProjectId = actualProjectId; // Initialize with actualProjectId from state

    const newUserMessageForMainChat: ChatMessage = {
      id: generateId(),
      project_id: currentProjectId || 'temp_project_id', // Use currentProjectId (which is actualProjectId or newly created one)
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    // Add to main chat history IF NOT ALREADY in clarification (to avoid duplicates if user typed a new line vs. prompt)
    if (!isClarifying) {
        setChatMessages(prev => [...prev, newUserMessageForMainChat]);
    }

    if (!currentProjectId) {
      console.log("No project ID found. Creating new project...");
      try {
        const newProject = await createProject(projectTitle || "Untitled Document"); 
        if (!newProject || !newProject.id) throw new Error('Failed to create project.');
        currentProjectId = newProject.id;
        setActualProjectId(currentProjectId);
        setProjectData(newProject); 
        newUserMessageForMainChat.project_id = currentProjectId; 
        window.history.pushState({}, '', `/editor/${currentProjectId}`);
      } catch (projError: any) {
        console.error("Error creating project:", projError);
        toast({ title: 'Project Error', description: `Failed to create project: ${projError.message}`, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }

    if (isClarifying) {
      // User typed a reply while in clarification mode
      console.log("[Editor|handleSendMessage] User typed reply during clarification. Sending to clarify-user-intent.");
      const userClarificationReply: ClarificationMessage = {
        id: generateId(),
        sender: 'user',
        text: message,
        timestamp: new Date().toISOString(),
      };
      setClarificationConversation(prev => [...prev, userClarificationReply]);
      
      const payload = {
        userMessage: message, 
        mainChatHistory: chatMessages.filter(m => m.id !== newUserMessageForMainChat.id), 
        currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
        ongoingClarificationContext: clarificationContext,
        projectId: currentProjectId!,
      };
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent' }));
          throw new Error(errorData.error || `Clarify intent failed: ${response.status}`);
        }
        const result = await response.json() as ClarificationApiResponse;
        processClarificationResponse(result);
      } catch (error: any) {
        console.error('[Editor|handleSendMessage-clarifying] Error calling clarify-user-intent:', error);
        toast({ title: 'Error', description: error.message || 'Could not process your reply.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
        setIsCreatingFirstEmail(false); // Reset: Error during clarification for the first email
      }
    } else {
      // This is a new prompt, initiate clarification flow
      console.log("[Editor|handleSendMessage] New prompt. Initiating clarification flow.");
      setClarificationContext(null); 
      const initialClarificationMessage: ClarificationMessage = {
        id: generateId(),
        sender: 'user',
        text: message,
        timestamp: new Date().toISOString()
      };
      setClarificationConversation([initialClarificationMessage]); 

      const payload = {
        userMessage: message,
        mainChatHistory: chatMessages.filter(m => m.id !== newUserMessageForMainChat.id), 
        currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
        ongoingClarificationContext: null, 
        projectId: currentProjectId!,
      };
      console.log('[Editor|handleSendMessage-new_clarify] Calling clarify-user-intent with payload:', JSON.stringify(payload)); // Log payload
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` },
          body: JSON.stringify(payload),
        });
        
        console.log('[Editor|handleSendMessage-new_clarify] Raw response status:', response.status); // Log status
        const responseText = await response.text(); // Get raw text
        console.log('[Editor|handleSendMessage-new_clarify] Raw response text:', responseText); // Log raw text

        if (!response.ok) {
          // Try to parse errorData from responseText if not ok
          let errorData = { error: `Clarify intent failed with status: ${response.status}` };
          try {
            errorData = JSON.parse(responseText); // Try to parse if it's JSON
          } catch (parseError) {
            console.warn('[Editor|handleSendMessage-new_clarify] Could not parse error response as JSON:', parseError);
            // errorData remains the generic status error
          }
          throw new Error(errorData.error || `Clarify intent failed: ${response.status}`);
        }
        const result = JSON.parse(responseText) as ClarificationApiResponse;
        console.log('[Editor|handleSendMessage-new_clarify] Parsed result:', result); // Log parsed result
        processClarificationResponse(result);
      } catch (error: any) {
        console.error('[Editor|handleSendMessage-new_clarify] Error calling clarify-user-intent or processing response:', error); // More generic log here
        toast({ title: 'Error', description: error.message || 'Could not start clarification.', variant: 'destructive' });
        setIsClarifying(false); 
        setClarificationConversation([]);
        setIsCreatingFirstEmail(false); // Reset: Error during clarification for the first email
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSuggestionSelected = async (suggestionValue: string) => {
    console.log('[Editor|handleSuggestionSelected] Suggestion selected:', suggestionValue);
    setIsLoading(true);
    
    const userClarificationReply: ClarificationMessage = {
      id: generateId(),
      sender: 'user',
      text: suggestionValue,
      timestamp: new Date().toISOString(),
    };
    setClarificationConversation(prev => [...prev, userClarificationReply]);

    const payload = {
      userMessage: suggestionValue,
      mainChatHistory: chatMessages, 
      currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
      ongoingClarificationContext: clarificationContext,
      projectId: actualProjectId!,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from clarify-user-intent' }));
        throw new Error(errorData.error || `Clarify intent failed with status: ${response.status}`);
      }
      const result = await response.json() as ClarificationApiResponse;
      processClarificationResponse(result);
    } catch (error: any) {
      console.error('[Editor|handleSuggestionSelected] Error calling clarify-user-intent:', error);
      toast({ title: 'Error', description: error.message || 'Could not process suggestion.', variant: 'destructive' });
      // If this error is during initial email creation, reset the flag
      if (isCreatingFirstEmail) {
        setIsCreatingFirstEmail(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to navigate to the send page (Updated for V2)
  const handleNavigateToSendPage = async () => {
    if (!projectData?.current_html) {
      toast({
        title: "Cannot Send",
        description: "Please generate an email template first.",
        variant: "destructive",
      });
      return;
    }
    
    // Use the V2 semantic template for export
    if (!projectData.semantic_email_v2) {
        toast({
            title: "Cannot Send",
            description: "Missing email structure data (V2). Please try generating again.",
            variant: "destructive",
        });
        return;
    }

    try {
      // Pass the V2 semantic email object
      const currentHtml = await exportEmailAsHtmlV2(projectData.semantic_email_v2); 
      
      sessionStorage.setItem('emailHtmlToSend', currentHtml);
      console.log("Stored current V2 email HTML in sessionStorage.");

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

  // Handle accepting all pending changes
  const handleAcceptAll = async () => {
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
    if (pendingChanges.length === 0) {
      toast({ title: 'Info', description: 'No pending changes to accept.' });
      return;
    }

    setIsLoading(true);
    setProgress(30);

    try {
      console.log(`Calling manage-pending-changes with action: accept for project ${actualProjectId}`);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          projectId: actualProjectId,
          action: 'accept',
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to accept changes');
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message || 'All pending changes accepted.',
      });

      await fetchAndSetProject(actualProjectId);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error accepting all changes:', error);
      toast({
        title: 'Error Accepting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Handle rejecting all pending changes
  const handleRejectAll = async () => {
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
     if (pendingChanges.length === 0) {
      toast({ title: 'Info', description: 'No pending changes to reject.' });
      return;
    }

    setIsLoading(true);
    setProgress(30);

    try {
      console.log(`Calling manage-pending-changes with action: reject for project ${actualProjectId}`);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-pending-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          projectId: actualProjectId,
          action: 'reject',
        }),
      });

       setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to reject changes');
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message || 'All pending changes rejected.',
      });

      await fetchAndSetProject(actualProjectId);

    } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error rejecting all changes:', error);
      toast({
        title: 'Error Rejecting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
       setProgress(100);
       setTimeout(() => setProgress(0), 500);
    }
  };

  // Sync previewMode with isDarkMode
  useEffect(() => {
    setPreviewMode(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync previewDevice with isMobileView
  useEffect(() => {
    setPreviewDevice(isMobileView ? 'mobile' : 'desktop');
  }, [isMobileView]);

  // (+) Add effect to generate live preview HTML when V2 data changes
  useEffect(() => {
    if (projectData?.semantic_email_v2) {
      try {
        console.log("Regenerating preview HTML from updated V2 data...");
        const generatedHtml = htmlGenerator.generate(projectData.semantic_email_v2);
        setLivePreviewHtml(generatedHtml);
        console.log("Live preview HTML updated.");
      } catch (error) {
        console.error("Error generating client-side preview HTML:", error);
        toast({ title: 'Preview Error', description: 'Could not update live preview.', variant: 'destructive' });
        // Optionally set livePreviewHtml to an error state or leave it stale
      }
    } else {
       // If there's no V2 data (e.g., initial load before generation), use the backend HTML or clear it
       setLivePreviewHtml(projectData?.current_html || null); 
    }
  // Depend on the V2 structure within projectData
  }, [projectData?.semantic_email_v2, htmlGenerator, toast]);

  // (+) Function to find and update a property within the V2 structure (More Robust)
  const updateElementProperty = (elementId: string, propertyPath: string, value: any) => {
    console.log(`[Editor|updateElementProperty] Attempting to update element ${elementId}, path ${propertyPath} with value:`, value);
    setProjectData(currentData => {
      if (!currentData?.semantic_email_v2) {
        console.error("[Editor|updateElementProperty] Error: semantic_email_v2 is missing.");
        return currentData;
      }

      // Deep copy to avoid mutation issues with nested state
      const newSemanticV2: EmailTemplateV2 = JSON.parse(JSON.stringify(currentData.semantic_email_v2));

      let elementFound = false;

      // Recursive function to find the element (Using V2 types)
      const findAndUpdateElement = (elements: EmailElementTypeV2[]) => { // Use V2 Element Type
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (element.id === elementId) {
            // Access properties safely, it exists on V2 types
            const currentProperties = element.properties || {}; 
            console.log(`[Editor|updateElementProperty] Found element ${elementId}. Current properties:`, JSON.parse(JSON.stringify(currentProperties)));
            try {
              // Use a helper to set nested property safely
              const pathParts = propertyPath.split('.');
              let currentLevel: any = currentProperties; 
            
              for (let j = 0; j < pathParts.length - 1; j++) {
                const part = pathParts[j];
                if (currentLevel[part] === undefined || currentLevel[part] === null) {
                  console.log(`[Editor|updateElementProperty] Creating intermediate object for path part: ${part}`);
                  currentLevel[part] = {}; 
                }
                currentLevel = currentLevel[part];
                if (typeof currentLevel !== 'object' || currentLevel === null) {
                    console.error(`[Editor|updateElementProperty] Error: Path part ${part} is not an object.`);
                    throw new Error(`Invalid path structure at ${part}`);
                }
              }

              const finalPart = pathParts[pathParts.length - 1];
              console.log(`[Editor|updateElementProperty] Setting final property: ${finalPart} =`, value);
              currentLevel[finalPart] = value;
              
              // Assign the modified properties back to the element
              element.properties = currentProperties; 
              
              elementFound = true;
              console.log(`[Editor|updateElementProperty] Element ${elementId} updated. New properties:`, JSON.parse(JSON.stringify(element.properties)));
              return true; // Element found and updated in this array
          } catch (error) {
              console.error(`[Editor|updateElementProperty] Error updating property ${propertyPath} for element ${elementId}:`, error);
              return true; 
            }
          }
          // Future: Add recursion for nested elements (like inside containers/boxes) if needed
        }
        return false; // Element not found in this array
      };

      // Iterate through sections and call the recursive function
      for (const section of newSemanticV2.sections) {
        if (findAndUpdateElement(section.elements)) { // Type matches now
          break; // Stop searching sections once found
        }
      }

      if (!elementFound) {
        console.error(`[Editor|updateElementProperty] Element with ID ${elementId} not found anywhere in semantic_email_v2`);
        return currentData; // Return original data if element not found
      }

      // Return the updated project data structure
      console.log("[Editor|updateElementProperty] Successfully updated. Returning new state object.");
      return {
        ...currentData,
        semantic_email_v2: newSemanticV2,
      };
    });
  };

  // (+) Effect to regenerate HTML preview when semantic template changes
  useEffect(() => {
    // Add a check to ensure semantic_email_v2 actually exists
    if (!projectData?.semantic_email_v2) {
      console.log("[Editor|useEffect V2->HTML] Skipping HTML regeneration: semantic_email_v2 is null.");
      return;
    }
    
    console.log("[Editor|useEffect V2->HTML] Detected change in semantic_email_v2. Regenerating HTML...");
    console.log("[Editor|useEffect V2->HTML] Current semantic_email_v2 (image src sample):", projectData.semantic_email_v2.sections[0]?.elements.find(el => el.type === 'image')?.properties?.image?.src);

    try {
      // Generate new HTML from semantic template
      const newHtml = htmlGenerator.generate(projectData.semantic_email_v2);
      console.log("[Editor|useEffect V2->HTML] Generated new HTML (first 500 chars):", newHtml.substring(0, 500));
      setLivePreviewHtml(newHtml);
      console.log("[Editor|useEffect V2->HTML] Updated livePreviewHtml state.");
    } catch (error) {
      console.error("[Editor|useEffect V2->HTML] Error regenerating HTML preview:", error);
      toast({ title: 'Warning', description: 'Could not update preview.', variant: 'default' });
    }
    // Make sure the dependency array correctly watches the object
  }, [projectData?.semantic_email_v2, htmlGenerator, toast]);

  // (+) Handler for when a file is selected for upload
  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingPlaceholder || editingPlaceholder.type !== 'image') return;
    
    const file = event.target.files?.[0];
    const elementId = editingPlaceholder.elementId;
    const imagePropertyPath = editingPlaceholder.path; // (+) Get path from state
    
    setEditingPlaceholder(null); // Reset editing state
    // Clear the file input value so the same file can be selected again if needed
    if(event.target) event.target.value = '';

    if (!file) {
      toast({ title: 'No file selected', variant: 'default' });
      return;
    }

    // Basic validation (example)
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit example
      toast({ title: 'File too large', description: 'Maximum image size is 5MB.', variant: 'destructive' });
      return;
    }

    setIsLoading(true); // Show loading indicator during upload
    setProgress(30);
    console.log(`Uploading image for element ${elementId}...`);

    try {
      // Construct file path (example: userId/projectId/timestamp-filename)
      const userId = user?.id || 'anonymous';
      const projId = actualProjectId || 'new_project';
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const filePath = `${userId}/${projId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('email_assets') // Ensure this bucket exists and has correct policies
        .upload(filePath, file);
       
      setProgress(70);

      if (uploadError) {
        throw new Error(`Supabase upload error: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('email_assets')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Could not get public URL after upload.');
      }
      
      const publicUrl = urlData.publicUrl;
      console.log(`Upload successful for ${elementId}. URL: ${publicUrl}`);

      // Update the semantic email state
      // Use the retrieved property path
      updateElementProperty(elementId, imagePropertyPath, publicUrl); 

      toast({ title: 'Image Uploaded', description: 'Preview will update shortly.' }); // Or instantly if client-side generation added

      // (+) Persist the change to the database
      setProjectData(currentData => {
        if (!currentData) return null;
        console.log(`[Editor|handleFileSelected] Persisting updated semantic_email_v2 for project ${actualProjectId}`);
        updateProject(actualProjectId!, { semantic_email_v2: currentData.semantic_email_v2 })
          .then(() => console.log(`[Editor|handleFileSelected] Project semantic_email_v2 saved successfully.`))
          .catch(err => {
            console.error("[Editor|handleFileSelected] Error saving project data:", err);
            toast({ title: 'Save Error', description: 'Could not save image change to server.', variant: 'destructive' });
            // TODO: Consider reverting the state update here? Or provide a retry?
          });
        return currentData; // Return currentData unmodified, state update happened via updateElementProperty
      });

    } catch (error: any) {
      console.error('Image upload failed:', error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not upload image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500); 
    }
  };

  // (+) Handler for saving the link from the modal
  const handleSaveLink = () => {
    if (!editingPlaceholder || editingPlaceholder.type !== 'link') return;

    const { elementId, path } = editingPlaceholder;
    const url = linkInputValue.trim();

    // Basic URL validation (example - can be more robust)
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#'))) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL (e.g., https://...)', variant: 'destructive' });
      return;
    }

    console.log(`Saving link for ${elementId} (${path}): ${url}`);
    updateElementProperty(elementId, path, url);
    toast({ title: 'Link Updated', description: 'Preview updated.' });

    // (+) Persist the change to the database
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
    setIsLinkModalOpen(false);
    setEditingPlaceholder(null);
    setLinkInputValue('');
  };

  const handleModeChange = (newMode: InteractionMode) => {
    if (newMode === 'major' || hasFirstDraft) {
      setSelectedMode(newMode);
      // If user re-selects 'major' after a draft exists, and they want to refine it,
      // we might need to re-initialize the clarification flow.
      if (newMode === 'major' && hasFirstDraft && !isClarifying) {
         console.log("[Editor|handleModeChange] Switched to Major Edit on existing draft. Ready for new clarification input.");
      }
    } else {
      toast({title: "Mode Unavailable", description: "Minor Edit and Just Ask modes are available after the first email draft is generated.", duration: 3000});
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading Your Email Workspace...</p>
        {/* <Progress value={progress} className="w-1/2 mt-2" /> */}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b sticky top-0 z-10 bg-background">
        {/* Left section: Back button, Title, Edit icon */}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-4" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to all projects</span>
          </Button>
        </div>
        
        <div className="flex-1 flex justify-center max-w-md">
          {isEditingTitle ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false);
                handleTitleChange(projectTitle);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitle(false);
                  handleTitleChange(projectTitle);
                }
              }}
              autoFocus
              className="text-lg font-medium text-center border-b border-gray-300 focus:border-primary focus:outline-none px-2"
            />
          ) : (
            <h1 
              className="text-lg font-medium cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {projectTitle}
            </h1>
          )}
        </div>
        
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </header>

      {/* Conditional UI Rendering Logic */}
      {isLoadingProject ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading Your Email Workspace...</p>
        </div>
      ) : (!projectData?.semantic_email_v2 && !isClarifying && !isCreatingFirstEmail) ? (
        // "Create Your First Email!" prompt screen
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Mail size={64} className="text-muted-foreground mb-6" />
          <h2 className="text-3xl font-semibold mb-3">Create Your First Email!</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            {actualProjectId ? 
              "You don't have an email drafted for this project yet." : 
              "Welcome! Let's start your first email."}
            {' '}
            Describe what you want to build, and let our AI craft it for you.
          </p>
          <div className="w-full max-w-lg space-y-4">
            <Input
              placeholder="e.g., A welcome email for new subscribers, highlighting key features..."
              value={initialInputValue || ''}
              onChange={(e) => setInitialInputValue(e.target.value)}
              className="text-base p-4"
            />
            <Button
              onClick={() => {
                if (initialInputValue) { 
                  console.log('Initial Email Generation. Prompt:', initialInputValue, 'Project ID (current):', actualProjectId);
                  setIsCreatingFirstEmail(true); 
                  handleSendMessage(initialInputValue, 'major'); 
                  setInitialInputValue(''); 
                } else {
                  toast({ title: 'Prompt is empty', description: 'Please describe the email you want to create.', variant: 'default'});
                }
              }}
              disabled={isLoading || !initialInputValue}
              className="w-full text-lg py-6"
              size="lg"
            >
              {isLoading ? 'Generating...' : 'Generate Email with AI'}
            </Button>
          </div>
        </div>
      ) : (
        // Main Editor UI with chat interface
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Panel: Email Preview */}
          <ResizablePanel 
            defaultSize={75}
            minSize={40}
            className="bg-neutral-100 dark:bg-neutral-950 overflow-hidden relative"
          >
            {/* Preview Controls Header - Only show when we have an email */}
            {projectData?.semantic_email_v2 && !isLoading && (
              <div className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-950 py-2 px-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div></div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Sun className={cn("h-4 w-4", isDarkMode ? "text-gray-500" : "text-yellow-500")} />
                    <Switch
                      id="dark-mode-switch"
                      checked={isDarkMode}
                      onCheckedChange={setIsDarkMode}
                      aria-label="Toggle Dark Mode"
                      disabled={isLoading}
                    />
                    <Moon className={cn("h-4 w-4", isDarkMode ? "text-blue-400" : "text-gray-500")} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Monitor className={cn("h-4 w-4", isMobileView ? "text-gray-500" : "text-primary")} />
                    <Switch
                      id="mobile-view-switch"
                      checked={isMobileView}
                      onCheckedChange={setIsMobileView}
                      aria-label="Toggle Mobile View"
                      disabled={isLoading}
                    />
                    <Smartphone className={cn("h-4 w-4", isMobileView ? "text-primary" : "text-gray-500")} />
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={cn(
              "relative",
              projectData?.semantic_email_v2 && !isLoading ? "h-[calc(100%-50px)]" : "h-full"
            )}>
              {/* Show loading UI when:
                  1. Explicitly loading (isLoading)
                  2. Creating first email (isCreatingFirstEmail)
                  3. In clarification but no content yet
                  4. Have no content but not in initial state */}
              {(isLoading || isCreatingFirstEmail || (isClarifying && !projectData?.semantic_email_v2) || (!projectData?.semantic_email_v2 && !isClarifying && chatMessages.length > 0)) ? (
                // Generation in Progress UI
                <div className="h-full bg-background flex flex-col">
                  {/* Top Section with Animation */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="relative mb-8">
                      <div className="relative">
                        <Mail className="h-20 w-20 text-primary animate-pulse" />
                        <div className="absolute -right-3 -top-3">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        </div>
                      </div>
                    </div>
                    <h2 className="text-3xl font-semibold mb-3 text-center">
                      {isClarifying ? "Understanding Your Needs..." : "Crafting Your Perfect Email"}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-12 text-center max-w-md">
                      {isClarifying 
                        ? "Our AI is gathering details to create exactly what you need"
                        : "Our AI is carefully generating your email based on our conversation"}
                    </p>
                  </div>
                  
                  {/* Bottom Section with Progress */}
                  <div className="border-t bg-muted/30 p-8">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {isClarifying ? "Understanding Progress" : "Generation Progress"}
                          </span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {isClarifying 
                          ? "We'll start generating once we have all the details"
                          : "This usually takes less than a minute"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (!projectData?.semantic_email_v2 && !isClarifying && chatMessages.length === 0) ? (
                // Initial Welcome Screen - only show when we have no messages and no content
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <Mail size={64} className="text-muted-foreground mb-6 mx-auto" />
                    <h2 className="text-2xl font-semibold mb-3">Create Your First Email!</h2>
                    <p className="text-muted-foreground mb-8">
                      {actualProjectId ? 
                        "You don't have an email drafted for this project yet." : 
                        "Welcome! Let's start your first email."}
                      {' '}
                      Describe what you want to build, and let our AI craft it for you.
                    </p>
                    <div className="space-y-4">
                      <Input
                        placeholder="e.g., A welcome email for new subscribers..."
                        value={initialInputValue || ''}
                        onChange={(e) => setInitialInputValue(e.target.value)}
                        className="text-base p-4"
                      />
                      <Button
                        onClick={() => {
                          if (initialInputValue) {
                            setIsCreatingFirstEmail(true);
                            handleSendMessage(initialInputValue, 'major');
                            setInitialInputValue('');
                          } else {
                            toast({ title: 'Prompt is empty', description: 'Please describe the email you want to create.', variant: 'default'});
                          }
                        }}
                        disabled={isLoading || !initialInputValue}
                        className="w-full text-lg py-6"
                        size="lg"
                      >
                        {isLoading ? 'Generating...' : 'Generate Email with AI'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : projectData?.semantic_email_v2 && !isLoading ? (
                // Email Preview - Only render when we have actual content and not loading
                <div className="h-full overflow-auto">
                  <EmailPreview
                    key={actualProjectId || 'preview-container'}
                    currentHtml={livePreviewHtml || projectData.current_html || ''}
                    pendingChanges={pendingChanges}
                    previewMode={isDarkMode ? 'dark' : 'light'}
                    previewDevice={isMobileView ? 'mobile' : 'desktop'}
                    semanticTemplate={projectData.semantic_email_v2}
                    onPlaceholderActivate={handlePlaceholderActivation}
                  />
                </div>
              ) : null}

              {/* Floating Accept/Reject Bar - Only show when we have changes */}
              {pendingChanges && pendingChanges.length > 0 && projectData?.semantic_email_v2 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-xl p-3 flex items-center gap-3">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleRejectAll} 
                    disabled={isLoading}
                    className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700 px-3 py-1.5"
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Reject All
                  </Button>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={handleAcceptAll} 
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5"
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Accept All
                  </Button>
                </div>
              )}
            </div>
          </ResizablePanel>
          
          {/* Resizable handle */}
          <ResizableHandle withHandle />
          
          {/* Chat interface panel */}
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
                initialInputValue={initialInputValue} 
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

      {/* Link Input Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Link URL</DialogTitle>
            <DialogDescription>
              Enter the destination URL for the element "({editingPlaceholder?.elementId})" targeting property "{editingPlaceholder?.path}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-url" className="text-right">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkInputValue}
                onChange={(e) => setLinkInputValue(e.target.value)}
                className="col-span-3"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveLink}>
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Editor;
