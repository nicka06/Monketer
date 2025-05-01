import { useState, useEffect, useCallback } from 'react';
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
  savePendingChange,
  exportEmailAsHtml,
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
  
  // Add state for selected mode
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('edit'); 
  
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
        setProjectData(fetchedResult.project);
        setProjectTitle(fetchedResult.project.name);
        setActualProjectId(fetchedResult.project.id);
        setHasCode(!!fetchedResult.project.current_html);
        setChatMessages(fetchedResult.chatMessages || []);
        setPendingChanges(fetchedResult.pendingChanges || []);
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
    console.log(`[handleSendMessage] Mode: ${mode}, ProjectID: ${actualProjectId}`);
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }
      
    let currentProjectId = actualProjectId;

    // --- Prepare User Message & Update UI Optimistically ---
    const newUserMessage: ChatMessage = {
      id: generateId(),
      project_id: currentProjectId || 'pending_creation',
      role: 'user',
        content: message,
        timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setProgress(30);

    let response: Response | null = null; 

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
      console.log("[handleSendMessage] Success response body:", result);

      const { message: aiResponseMessage, newSemanticEmail, newHtml } = result;

      if (!newSemanticEmail || !newHtml) {
        throw new Error("Backend response missing newSemanticEmail or newHtml.");
      }
      
      await loadPendingChanges(currentProjectId);
      
      setProjectData(prevData => {
        if (!prevData) {
          console.error("[handleSendMessage] Project data was null before update despite having project ID. Reconstructing.");
          return { 
            id: currentProjectId!, 
            name: projectTitle || "Untitled Document", 
            semantic_email: newSemanticEmail, 
            current_html: newHtml,
            lastEditedAt: new Date(),
            createdAt: new Date(),
            isArchived: false, 
            version: newSemanticEmail.version || 1 
          } as Project;
        }
        return {
          ...prevData,
          semantic_email: newSemanticEmail,
          current_html: newHtml,
          lastEditedAt: new Date(),
          version: newSemanticEmail.version || prevData.version,
        };
      });
      setHasCode(true);
      console.log("[handleSendMessage] Project data and related states updated.");

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

  // Function to navigate to the send page
  const handleNavigateToSendPage = async () => {
    if (!projectData?.current_html) {
      toast({
        title: "Cannot Send",
        description: "Please generate an email template first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Pass the semantic email object, not the HTML string
      const currentHtml = await exportEmailAsHtml(projectData.semantic_email); 
      
      sessionStorage.setItem('emailHtmlToSend', currentHtml);
      console.log("Stored current email HTML in sessionStorage.");

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
