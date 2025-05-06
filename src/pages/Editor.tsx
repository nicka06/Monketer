import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Mail, Sun, Moon, Smartphone, Monitor, Check, X, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreview } from '@/components/EmailPreview';
import { ChatInterface } from '@/components/ChatInterface';
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';
import { EmailTemplate as EmailTemplateV2, EmailElement as EmailElementTypeV2 } from '@/types/v2';
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

// Sample empty template for new projects
const emptyTemplate: EmailTemplate = {
  id: generateId(),
  name: 'New Email',
  sections: [
    {
      id: generateId(),
      elements: [
        {
          id: generateId(),
          type: 'header',
          content: 'Welcome to your new email',
          styles: { fontSize: '24px', fontWeight: 'bold', color: '#333' },
        },
        {
          id: generateId(),
          type: 'text',
          content: 'This is a starter template. Use the AI to help you create amazing emails.',
          styles: { fontSize: '16px', color: '#555' },
        },
      ],
      styles: { padding: '20px' },
    },
  ],
  styles: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' },
  version: 1,
};

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

  // Handle projectId or username/projectName route
  useEffect(() => {
    if (!user) return;
    
    const loadProjectData = async () => {
        setIsLoadingProject(true);
      setProjectData(null);
      setChatMessages([]);
      setPendingChanges([]);
      setHasCode(false);
      setActualProjectId(null);
      setSelectedMode('major'); // Reset mode to major when loading new project
      // (+) Reset live preview on project load
      setLivePreviewHtml(null); 
        
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
        // Case 3: Creating a new project at /editor route
        else {
          console.log("No project ID or name provided, preparing for new project.");
          setProjectTitle('Untitled Document');
          setActualProjectId(null);

          // Check localStorage for saved content and set as initial input value
          const savedContent = localStorage.getItem('savedEmailContent');
          if (savedContent) {
            console.log("Found saved content in localStorage:", savedContent);
            setInitialInputValue(savedContent);
            localStorage.removeItem('savedEmailContent');
            console.log("Cleared savedEmailContent from localStorage");
        } else {
            setInitialInputValue(null);
          }
          // (+) Set initial preview for new projects (maybe empty or based on a default)
          setLivePreviewHtml('<p>Start by typing a request to the AI!</p>'); // Or generate from an empty V2 struct
      }
    } catch (error) {
        console.error('Error in loadProjectData wrapper:', error);
    } finally {
      setIsLoadingProject(false);
    }
  };
    
    loadProjectData();
  }, [projectId, username, projectName, user, navigate, toast, fetchAndSetProject]);

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

  // handleSendMessage now matches ChatInterface prop expectations
  const handleSendMessage = async (message: string, mode: InteractionMode) => {
      setIsLoading(true);
    setProgress(0);
    let response;
    let currentProjectId = actualProjectId;
    const newUserMessage: ChatMessage = {
      id: generateId(),
      project_id: currentProjectId || 'unknown',
      role: 'user',
        content: message,
        timestamp: new Date(),
    };

    // --- Add User Message to State Immediately --- 
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      // --- Ensure Project Exists --- 
      if (!currentProjectId) {
        console.log("No project ID found. Creating new project before sending message...");
        const titleForNewProject = projectTitle || "Untitled Document"; 
        
        const newProject = await createProject(titleForNewProject);
        if (!newProject || !newProject.id) { 
          throw new Error('Failed to create project or project ID is missing.');
        }
        currentProjectId = newProject.id;
        setActualProjectId(currentProjectId);
        setProjectData(newProject);
        newUserMessage.project_id = currentProjectId;

        window.history.pushState({}, '', `/editor/${currentProjectId}`); 
        
        console.log("New project created with ID:", currentProjectId);
        setHasCode(!!newProject.current_html);
        setPendingChanges([]);
        
        // Force the first message to be a major edit
        mode = 'major';
      }
      
      if (!currentProjectId) {
        throw new Error("Project ID is still missing after creation check.");
      }
      
      setProgress(50);
        
      // --- Prepare Payload for Edge Function --- 
      const payload = {
        prompt: message,
        chatHistory: chatMessages.filter(m => m.id !== newUserMessage.id), 
        mode: mode,
        projectId: currentProjectId 
      };
      console.log("Sending payload to generate-email-changes:", payload);
        
      // --- Call Edge Function --- 
      response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`, 
        },
        body: JSON.stringify(payload),
      });
      setProgress(80);
      console.log(`[handleSendMessage] Fetch response status: ${response.status}`);

      if (!response.ok) {
        let errorData = { error: 'Unknown backend error', message: 'Response not OK', problematicJson: null };
        try {
          const errorJson = await response.json();
          console.error("[handleSendMessage] Backend error response body:", errorJson);
          errorData.error = errorJson.error || errorData.error;
          errorData.message = errorJson.message || errorData.message;
          errorData.problematicJson = errorJson.problematicJson || null;
        } catch (parseError) {
          console.error("[handleSendMessage] Failed to parse error response body:", parseError);
          const errorText = await response.text();
          console.error("[handleSendMessage] Backend error response text:", errorText);
          errorData.message = errorText.substring(0, 200) || 'Failed to process request';
        }
         throw { message: errorData.error, details: errorData.message, problematicJson: errorData.problematicJson };
      }
      
      // --- Process Successful Response --- 
      const result = await response.json();
      console.log("[handleSendMessage] Success response body:", JSON.stringify(result)); // Log the full result

      // Expect backend to return V2 template
      const { message: aiResponseMessage, newSemanticEmail: newSemanticEmailV2, newHtml, newPendingChanges } = result;

      // --- Add detailed logging --- 
      console.log("[handleSendMessage] Received newHtml (first 500 chars):", newHtml?.substring(0, 500));
      console.log("[handleSendMessage] Received newPendingChanges:", JSON.stringify(newPendingChanges, null, 2));
      // --- End detailed logging ---

      if (!newSemanticEmailV2 || !newHtml) {
        throw new Error("Backend response missing newSemanticEmailV2 or newHtml.");
      }
      
      setPendingChanges(newPendingChanges || []);
      console.log("[handleSendMessage] Pending changes set from direct response.");
      
      // --- Update Project Data State with V2 structure ---
      setProjectData(prevData => {
        const baseData = prevData ?? {
            id: currentProjectId!, 
            name: projectTitle || "Untitled Document", 
            createdAt: new Date(),
            isArchived: false, 
            // Add default version if creating baseData inline
            version: 2 
        };
        return {
          ...baseData,
          semantic_email: null, // Nullify V1 field
          semantic_email_v2: newSemanticEmailV2, // Store V2 template
          current_html: newHtml,
          lastEditedAt: new Date(),
          // Safely access prevData version, fallback to V2 template version or default
          version: newSemanticEmailV2.version || prevData?.version || 2, 
        };
      });
        setHasCode(true);
      console.log("[handleSendMessage] Project data and related states updated with V2 structure.");

      const assistantMessage: ChatMessage = {
            id: generateId(),
        project_id: currentProjectId,
        role: 'assistant',
        content: aiResponseMessage || 'Email updated.',
            timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      try {
        await saveChatMessage(newUserMessage);
        await saveChatMessage(assistantMessage);
        console.log("[handleSendMessage] Chat messages saved successfully.");
      } catch(saveError) {
        console.error("Error saving chat messages:", saveError);
        toast({ title: 'Warning', description: 'Could not save chat history.', variant: 'default' });
      }

    } catch (error: any) {
      console.error("[handleSendMessage] Error processing message:", error);
      
      let displayError = "An unexpected error occurred.";
      let problematicJson = null;
      if (typeof error === 'object' && error !== null) {
        displayError = error.message || displayError;
        problematicJson = error.problematicJson || null;
      } else if (typeof error === 'string') {
        displayError = error;
      }

      const errorId = generateId();
      const errorMessageObject: ChatMessage = {
        id: errorId,
        project_id: currentProjectId || 'unknown',
        role: 'assistant',
        content: `Error: ${displayError}${problematicJson ? `\n\nProblematic JSON:\n\`\`\`json\n${problematicJson}\n\`\`\`\`` : ''}`,
            timestamp: new Date(),
        isError: true,
      };
      setChatMessages(prev => [...prev.filter(m => m.id !== newUserMessage.id), errorMessageObject]);
      toast({ title: 'Error', description: displayError.substring(0, 100), variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setProgress(100);
      console.log("[handleSendMessage] Finished.");
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

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* (+) Add hidden file input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*" 
        style={{ display: 'none' }} 
      />
      
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
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
        </div>
        
        {/* Absolutely positioned Send Preview button */}
        <Button 
          variant="outline" 
          onClick={handleNavigateToSendPage} 
          disabled={!hasCode || isLoadingProject} 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded px-4 border mr-2"
        >
          <Mail className="mr-2 h-4 w-4" />
          Send Preview
        </Button>
      </header>

      {/* Main content with resizable panels - set to flex-grow to take remaining height */}
      <div className="flex-grow flex overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="w-full h-full"
        >
          {/* Email preview panel */}
          <ResizablePanel 
            defaultSize={75}
            minSize={40}
            className="bg-neutral-100 dark:bg-neutral-950 overflow-auto"
          >
            {/* Preview Controls Header */}
            <div className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-950 py-2 px-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              {/* Left side (Placeholder or future use) */}
              <div>
                {/* Conditionally render Accept/Reject buttons - REMOVED FROM HERE */}
                {/* 
                {pendingChanges && pendingChanges.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAcceptAll}
                      disabled={isLoading}
                      className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept All ({pendingChanges.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRejectAll}
                      disabled={isLoading}
                      className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject All
                    </Button>
                  </div>
                )}
                 */}
              </div>

              {/* Right-aligned controls wrapper */}
              <div className="flex items-center space-x-6">
                {/* Light/Dark Mode Switch */}
                <div className="flex items-center space-x-2">
                  <Sun className={cn("h-4 w-4", isDarkMode ? "text-gray-500" : "text-yellow-500")} />
                  <Switch
                    id="dark-mode-switch"
                    checked={isDarkMode}
                    onCheckedChange={setIsDarkMode}
                    aria-label="Toggle Dark Mode"
                    disabled={isLoading} // Disable switches during loading
                  />
                  <Moon className={cn("h-4 w-4", isDarkMode ? "text-blue-400" : "text-gray-500")} />
                </div>

                {/* Desktop/Mobile Switch */}
                <div className="flex items-center space-x-2">
                  <Monitor className={cn("h-4 w-4", isMobileView ? "text-gray-500" : "text-primary")} />
                  <Switch
                    id="mobile-view-switch"
                    checked={isMobileView}
                    onCheckedChange={setIsMobileView}
                    aria-label="Toggle Mobile View"
                    disabled={isLoading} // Disable switches during loading
                  />
                  <Smartphone className={cn("h-4 w-4", isMobileView ? "text-primary" : "text-gray-500")} />
                </div>
              </div>
            </div>
            
            {/* Preview Content Area */}
            <div className="min-h-[calc(100%-50px)] max-h-screen overflow-y-auto">
              {!hasCode && !projectData?.current_html ? (
                <div className="bg-white m-6 p-8 rounded-lg shadow-sm border border-gray-100 text-center h-full flex flex-col justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  <div>
                  <h2 className="text-2xl font-medium mb-4">Start Creating Your Email</h2>
                  <p className="text-gray-500 mb-6">
                    Send a message to the AI assistant to start generating your email template.
                  </p>
                  </div>
                  {isLoading && (
                    <div className="space-y-3 mt-6">
                      <p className="text-sm text-gray-500">Generating email template...</p>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {/* Revert to passing original props */}
                    <EmailPreview
                    key={actualProjectId || 'preview-container'}
                    currentHtml={livePreviewHtml || projectData?.current_html || ''}
                    pendingChanges={pendingChanges}
                    previewMode={isDarkMode ? 'dark' : 'light'}
                    previewDevice={isMobileView ? 'mobile' : 'desktop'}
                    semanticTemplate={projectData?.semantic_email_v2 || null}
                    onPlaceholderActivate={handlePlaceholderActivation}
                  />
                   {isLoading && ( // Show progress overlay during any loading state
                     <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
                        <div className="bg-white p-4 rounded-lg shadow-md text-center">
                            <p className="text-sm text-gray-500 mb-2">Processing...</p>
                            <Progress value={progress} className="h-2 w-32" />
                        </div>
                     </div>
                  )}
                </div>
              )}
            </div>

            {/* --- Floating Accept/Reject Bar (Inside Preview Panel) --- */}
            {pendingChanges && pendingChanges.length > 0 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-xl p-3 flex items-center gap-3">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll} 
                  disabled={isLoading}
                  className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700 px-3 py-1.5" // Adjusted padding
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Reject All
                </Button>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleAcceptAll} 
                  disabled={isLoading}
                   className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5" // Adjusted padding and colors
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  Accept All
                </Button>
              </div>
            )}
            {/* --- End Floating Bar --- */}
            
          </ResizablePanel>
          
          {/* Resizable handle */}
          <ResizableHandle withHandle />
          
          {/* Chat interface panel - fixed height with internal scrolling */}
          <ResizablePanel 
            defaultSize={25} 
            minSize={20}
            className="border-l border-gray-200 bg-gray-50 h-full overflow-hidden"
          >
            <div className="h-full">
              <ChatInterface
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                initialInputValue={initialInputValue} 
                selectedMode={selectedMode}
                onModeChange={(mode) => {
                  // Only allow mode changes if there are messages
                  if (chatMessages.length > 0 && !isLoading) {
                    setSelectedMode(mode);
                  }
                }}
                isModeLocked={chatMessages.length === 0}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* (+) Link Input Modal */}
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
