import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Mail, Sun, Moon, Smartphone, Monitor, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreview } from '@/components/EmailPreview';
import { ChatInterface } from '@/components/ChatInterface';
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';
import { 
  getProject, 
  saveChatMessage, 
  getPendingChanges,
  createProject, 
  getProjectByNameAndUsername, 
  getUsernameFromId,
  savePendingChange,
  exportEmailAsHtml,
  updateProjectWithEmailChanges 
} from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/uuid';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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
  
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null); // Store the resolved project ID
  const [projectTitle, setProjectTitle] = useState('Untitled Document 1');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
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
  
  // Add state for selected mode
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('edit'); 
  
  // Load username for current user
  useEffect(() => {
    if (user) {
      getUsernameFromId(user.id).then(name => setCurrentUsername(name));
    }
  }, [user]);

  // Handle projectId or username/projectName route
  useEffect(() => {
    if (!user) return;
    
    const loadProjectData = async () => {
      try {
        setIsLoadingProject(true);
        
        // Case 1: Using the /editor/:projectId route
        if (projectId) {
          await loadProjectById(projectId);
          setActualProjectId(projectId);
        }
        // Case 2: Using the /editor/:username/:projectName route
        else if (username && projectName) {
          try {
            const project = await getProjectByNameAndUsername(decodeURIComponent(projectName), username);
            if (project) {
              await loadProjectById(project.id);
              setActualProjectId(project.id);
            }
          } catch (error) {
            console.error('Error loading project by name:', error);
            toast({
              title: 'Error',
              description: 'Project not found',
              variant: 'destructive',
            });
            navigate('/dashboard');
          }
        } 
        // Case 3: Creating a new project at /editor route
        else {
          setProjectTitle('Untitled Document 1');
          setEmailTemplate(null);
          setChatMessages([]); // Always start with empty chat messages
          setPendingChanges([]);
          setHasCode(false);
          setActualProjectId(null);

          // Check localStorage for saved content and set as initial input value
          const savedContent = localStorage.getItem('savedEmailContent');
          if (savedContent) {
            console.log("Found saved content in localStorage:", savedContent);
            setInitialInputValue(savedContent); // Set the initial input value state
            localStorage.removeItem('savedEmailContent'); // Clear immediately after reading
            console.log("Cleared savedEmailContent from localStorage");
          } else {
            setInitialInputValue(null); // Ensure it's null if nothing found
          }

          setIsLoadingProject(false);
        }
      } catch (error) {
        console.error('Error in loadProjectData:', error);
        setIsLoadingProject(false);
      }
    };
    
    loadProjectData();
  }, [projectId, username, projectName, user, navigate, toast]);

  const loadProjectById = async (id: string) => {
    try {
      // Fetch project data including pending changes
      const { project, chatMessages, emailContent, pendingChanges: fetchedPendingChanges } = await getProject(id);
      
      setProjectTitle(project.name);
      setProjectData({
        id: project.id,
        name: project.name,
        lastEditedAt: new Date(project.lastEditedAt),
        createdAt: new Date(project.createdAt),
        isArchived: project.isArchived,
        current_html: project.current_html,
        semantic_email: project.semantic_email,
        version: project.version
      });

      const formattedMessages = chatMessages || [];
      setChatMessages(formattedMessages);
      setPendingChanges(fetchedPendingChanges || []); // Set pending changes from fetched data

      // Use current_html for preview, semantic_email for state if available
      if (project.semantic_email) {
        const semanticEmail = project.semantic_email as unknown as EmailTemplate;
        if (semanticEmail && semanticEmail.id && semanticEmail.sections && Array.isArray(semanticEmail.sections)) {
            setEmailTemplate(semanticEmail); // Keep semantic email for future edits
          setHasCode(true);
        } else {
          setEmailTemplate(null);
          setHasCode(false);
        }
      } else {
        setEmailTemplate(null); // No semantic structure yet
        setHasCode(!!project.current_html); // hasCode depends on if there's any HTML
      }

    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProject(false);
    }
  };

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

  // Handle title change and potentially update project name
  const handleTitleChange = async (newTitle: string) => {
    setProjectTitle(newTitle);
    
    if (projectData?.id) {
      try {
        // Update project title in the database
        const { error } = await supabase
          .from('projects')
          .update({ name: newTitle })
          .eq('id', projectData.id);
          
        if (error) throw error;
        
        // Update URL to reflect new project name if using the username/projectName format
        if (username && projectName && currentUsername) {
          navigate(`/editor/${currentUsername}/${encodeURIComponent(newTitle)}`);
        }
        
        toast({
          title: 'Success',
          description: 'Project name updated',
        });
      } catch (error) {
        console.error('Error updating project name:', error);
        toast({
          title: 'Error',
          description: 'Failed to update project name',
          variant: 'destructive',
        });
      }
    }
  };

  // handleSendMessage now matches ChatInterface prop expectations
  const handleSendMessage = async (message: string, mode: InteractionMode) => {
    console.log(`[handleSendMessage] Mode: ${mode}, ProjectID: ${actualProjectId}`);
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }
      
    let currentProjectId = actualProjectId;

    // --- Prepare User Message & Update UI Optimistically ---
    const newUserMessage: ChatMessage = {
        id: generateId(),
        project_id: currentProjectId || 'pending_creation', // Temp ID if needed
        role: 'user',
        content: message,
        timestamp: new Date(),
    };
    const tempMessages = [...chatMessages, newUserMessage];
    setChatMessages(tempMessages);
    setIsLoading(true);
    setProgress(30);

    let response: Response | null = null; // Declare response variable here

    try {
        // --- Ensure Project Exists --- 
        if (!currentProjectId) {
             // Always create project first if it doesn't exist, regardless of mode.
            console.log("No project ID found. Creating new project before sending message...");
            const titleForNewProject = projectTitle || "Untitled Document"; 
            
             // Create a minimal project first
             // We no longer need to pass an initial template here.
            const newProject = await createProject(titleForNewProject); // Simplified createProject
            currentProjectId = newProject.id;
            setActualProjectId(currentProjectId);
            setProjectData(newProject); // Set minimal project data
            newUserMessage.project_id = currentProjectId; // Update message project ID

            // Update URL if needed
            if (currentUsername) {
                window.history.pushState({}, '', `/editor/${currentUsername}/${encodeURIComponent(titleForNewProject)}`);
            }
            console.log("New project created with ID:", currentProjectId);
            setHasCode(false); // Initially no code until first generation
        }

        // Ensure project ID is set before proceeding
        if (!currentProjectId) {
             throw new Error("Project ID is still missing after creation check.");
        }
        
        setProgress(50);

        // --- Prepare Payload for Edge Function --- 
        // Remove currentTemplate/emailTemplate from payload
        const payload = {
            prompt: message,
            // Send chat history *before* the current user message for context
            chatHistory: chatMessages, 
            mode: mode,
            projectId: currentProjectId 
        };
        console.log("Sending payload to generate-email-changes:", payload);

        // --- Call Edge Function --- 
        // Assign to the outer response variable
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
            let errorData = { error: 'Unknown backend error', message: 'Response not OK' };
            try {
                errorData = await response.json();
                console.error("[handleSendMessage] Backend error response body:", errorData);
            } catch (parseError) {
                console.error("[handleSendMessage] Failed to parse error response body:", parseError);
                const errorText = await response.text();
                console.error("[handleSendMessage] Backend error response text:", errorText);
                errorData.message = errorText.substring(0, 100) || 'Failed to process request';
            }
            throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
        }

        // --- Process Successful Response --- 
        const result = await response.json();
        console.log("[handleSendMessage] Success response body:", result);

        // Destructure the new expected fields
        const { message: aiResponseMessage, newSemanticEmail, newHtml } = result;

        if (!newSemanticEmail || !newHtml) {
             throw new Error("Backend response missing newSemanticEmail or newHtml.");
        }
        
        // Fetch pending changes separately FIRST
        let fetchedChanges: PendingChange[] = [];
        try {
            console.log("[handleSendMessage] Fetching pending changes...");
            fetchedChanges = (await getPendingChanges(currentProjectId)) || [];
            console.log(`[handleSendMessage] Fetched ${fetchedChanges.length} pending changes.`);
        } catch (fetchChangesError) {
            console.error("Failed to fetch pending changes:", fetchChangesError);
            toast({ title: 'Warning', description: 'Could not fetch pending changes after update.', variant: 'default' });
            // Set to empty array on error to avoid stale overlays
            fetchedChanges = []; 
        }
        
        // NOW update pending changes state
        setPendingChanges(fetchedChanges); 
        console.log("[handleSendMessage] Pending changes state updated.");

        // THEN update project data state with new semantic/HTML
        setProjectData(prevData => {
            if (!prevData && !currentProjectId) {
                 // If projectData was null AND we just created the project, use the new ID
                 // This case needs careful review - projectData might be minimal after creation
                 console.warn("[handleSendMessage] Project data was null, reconstructing after creation.");
                 // It might be better to fetch the full project data here after creation?
                 // For now, construct based on what we have.
                 return { 
                    id: currentProjectId!, // ID is guaranteed here now 
                    name: projectTitle || "Untitled Document", // Use current title
                    semantic_email: newSemanticEmail, 
                    current_html: newHtml,
                    // Add default/initial values for other required fields
                    lastEditedAt: new Date(),
                    createdAt: new Date(), 
                    isArchived: false, 
                    version: newSemanticEmail.version || 1 
                 } as Project;
            } else if (!prevData) {
                 console.error("[handleSendMessage] Project data is null but project ID exists. State inconsistency?");
                 return null; // Cannot update null
            }
            // Update existing project data
            return {
                ...prevData,
                semantic_email: newSemanticEmail,
                current_html: newHtml,
                // Optionally update version if returned by backend
                 version: newSemanticEmail.version || prevData.version, // Use version from newSemanticEmail if available
                 lastEditedAt: new Date() // Update last edited time
            };
        });
        // Update related states AFTER projectData
        setEmailTemplate(newSemanticEmail); 
        setHasCode(true); 
        console.log("[handleSendMessage] Project data and related states updated.");

        // --- Save Chat Messages --- 
        const newAiMessage: ChatMessage = {
              id: generateId(),
            project_id: currentProjectId,
            role: 'assistant',
            content: aiResponseMessage || "Email updated.", // Use message from response
            timestamp: new Date(),
        };
        
        try {
             // Save user message (ensure ID is correct)
             newUserMessage.project_id = currentProjectId;
             await saveChatMessage(newUserMessage);
             // Save AI message
             await saveChatMessage(newAiMessage);
             console.log("[handleSendMessage] Chat messages saved successfully.");
             // Update UI chat state *after* successful save
             setChatMessages((prev) => [...prev, newAiMessage]);
        } catch (saveError) {
            console.error("Failed to save chat messages:", saveError);
             toast({ title: 'Warning', description: 'Failed to save chat messages.', variant: 'default' });
             // Add AI message to UI even if save failed so user sees the response
             setChatMessages((prev) => [...prev, newAiMessage]);
        }

    } catch (error) {
        console.error('[handleSendMessage] Error processing message:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to get response from AI.';
        toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
        
        // Log the detailed error from backend if available
        let backendErrorDetails = errorMsg;
        if (response && !response.ok) { // Check if response exists and was not ok
             try {
                 // The backend might send back a stringified JSON with more details
                 const parsedBackendError = await response.json(); 
                 if (parsedBackendError && parsedBackendError.error) {
                     backendErrorDetails = parsedBackendError.error; // Use the error message from the parsed object
                     if (parsedBackendError.problematicJson) {
                        console.error("--- Problematic JSON from Backend Start ---");
                        console.error(parsedBackendError.problematicJson);
                        console.error("--- Problematic JSON from Backend End ---");
                        backendErrorDetails += " (Problematic JSON logged to console)";
                     }
                 } 
             } catch (e) {
                 // Failed to parse backend error response, stick with original message
                 console.warn("Could not parse detailed backend error response.");
             }
        }

        // Revert optimistic UI update for user message
        setChatMessages(chatMessages);
        
        // Add specific error message to chat, using detailed message if available
        const errorAiMessage: ChatMessage = {
            id: generateId(),
            project_id: currentProjectId || 'error',
            role: 'assistant',
            content: `Error: ${backendErrorDetails}`,
            timestamp: new Date(),
            isError: true,
        };
        setChatMessages((prev) => [...prev, errorAiMessage]);
    } finally {
        setIsLoading(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
        console.log(`[handleSendMessage] Finished.`);
    }
 };

  // Function to navigate to the send page
  const handleNavigateToSendPage = async () => {
    if (!emailTemplate) {
      toast({
        title: "Cannot Send",
        description: "Please generate an email template first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate the HTML from the current template state
      const currentHtml = await exportEmailAsHtml(emailTemplate);
      
      // Store the HTML in sessionStorage
      sessionStorage.setItem('emailHtmlToSend', currentHtml);
      console.log("Stored current email HTML in sessionStorage.");

      // Navigate to the send page
      navigate('/send-email');

    } catch (error) {
      console.error("Error preparing email for sending:", error);
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

    setIsLoading(true); // Use main loading state? Or a specific one? Let's use main for now.
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

      // Refresh project data to reflect accepted state
      await loadProjectById(actualProjectId);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error accepting all changes:', error);
      toast({
        title: 'Error Accepting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
      // Optionally reload data even on error to sync with potential partial backend changes?
      // await loadProjectById(actualProjectId);
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

      // Refresh project data to reflect rejected state
      await loadProjectById(actualProjectId);

    } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error rejecting all changes:', error);
      toast({
        title: 'Error Rejecting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
       // Optionally reload data even on error
      // await loadProjectById(actualProjectId);
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
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
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
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleNavigateToSendPage} disabled={!hasCode || isLoadingProject}>
              <Mail className="mr-2 h-4 w-4" />
              Send Preview
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
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
            className="overflow-auto bg-neutral-100 dark:bg-neutral-950 flex flex-col"
          >
            {/* Preview Controls Header */}
            <div className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-950 py-2 px-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
              {/* Left side (Placeholder or future use) */}
              <div>
                {/* Conditionally render Accept/Reject buttons */}
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
            <div className="p-6 flex-grow overflow-y-auto">
              {!hasCode && !projectData?.current_html ? (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center h-full flex flex-col justify-center">
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
                <>
                  {/* Use projectData.current_html directly */}
                    <EmailPreview
                    currentHtml={projectData?.current_html || null}
                    pendingChanges={pendingChanges}
                    previewMode={previewMode}
                    previewDevice={previewDevice}
                  />
                   {isLoading && ( // Show progress overlay during any loading state
                     <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">Processing...</p>
                            <Progress value={progress} className="h-2 w-32" />
                        </div>
                     </div>
                  )}
                </>
              )}
            </div>
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
                onModeChange={(mode) => !isLoading && setSelectedMode(mode)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Editor;
