import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreview } from '@/components/EmailPreview';
import { ChatInterface } from '@/components/ChatInterface';
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';
import { 
  getProject, 
  saveChatMessage, 
  acceptPendingChange, 
  rejectPendingChange, 
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
          loadProjectById(projectId);
        }
        // Case 2: Using the /editor/:username/:projectName route
        else if (username && projectName) {
          try {
            const project = await getProjectByNameAndUsername(decodeURIComponent(projectName), username);
            if (project) {
              loadProjectById(project.id);
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
          setChatMessages([]);
          setPendingChanges([]);
          setHasCode(false);
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
      const projectData = await getProject(id);
      
      setProjectTitle(projectData.project.name);
      setProjectData({
        id: projectData.project.id,
        name: projectData.project.name,
        lastEditedAt: new Date(projectData.project.last_edited_at),
        createdAt: new Date(projectData.project.created_at),
        isArchived: projectData.project.is_archived
      });
      
      // Convert chat messages to our format
      const formattedMessages = projectData.chatMessages || [];
      
      setChatMessages(formattedMessages);
      
      // Check if we have email content (either from standard content or semantic_email)
      if (projectData.emailContent) {
        // Apply pending changes to the template if both email content and pending changes exist
        if (projectData.pendingChanges && projectData.pendingChanges.length > 0) {
          const updatedTemplate = applyPendingChangesToTemplate(
            projectData.emailContent,
            projectData.pendingChanges
          );
          setEmailTemplate(updatedTemplate);
        } else {
          setEmailTemplate(projectData.emailContent);
        }
        setPendingChanges(projectData.pendingChanges || []);
        
        // IMPORTANT: Always set hasCode to true if we have email content
        setHasCode(true);
      } else if (projectData.project.semantic_email) {
        // If semantic_email exists in the project, use it
        // We need to properly cast the semantic_email to EmailTemplate
        const semanticEmail = projectData.project.semantic_email as unknown as EmailTemplate;
        
        // Validate that it has the structure we expect
        if (semanticEmail && 
            semanticEmail.id && 
            semanticEmail.sections && 
            Array.isArray(semanticEmail.sections)) {
          setEmailTemplate(semanticEmail);
          setPendingChanges(projectData.pendingChanges || []);
          setHasCode(true);
        } else {
          // If the structure is invalid, don't set the email template
          setEmailTemplate(null);
          setHasCode(false);
        }
      } else {
        // If no email content exists yet but we have a project, show empty state
        setEmailTemplate(null);
        setHasCode(false);
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

  // Apply pending changes to the email template
  const applyPendingChangesToTemplate = (
    template: EmailTemplate,
    changes: PendingChange[]
  ): EmailTemplate => {
    const updatedTemplate = { ...template };
    
    changes.forEach((change) => {
      // Find the element by ID (could be in any section)
      let targetElement = null;
      let targetSection = null;
      
      for (const section of updatedTemplate.sections) {
        for (const element of section.elements) {
          if (element.id === change.elementId) {
            targetElement = element;
            targetSection = section;
            break;
          }
        }
        if (targetElement) break;
      }
      
      if (targetElement) {
        // Mark the element as pending with the appropriate type
        targetElement.pending = true;
        targetElement.pendingType = change.changeType;
        
        if (change.changeType === 'edit' && change.newContent) {
          // Keep the element but update its content while marking it as pending
          Object.assign(targetElement, {
            ...change.newContent,
            pending: true,
            pendingType: 'edit',
          });
        }
      } else if (change.changeType === 'add' && change.newContent) {
        // Handle adding new elements
        const section = updatedTemplate.sections.find(
          (s) => s.id === change.newContent.sectionId
        );
        
        if (section) {
          const newElement = {
            ...change.newContent.element,
            id: change.elementId,
            pending: true,
            pendingType: 'add',
          };
          
          section.elements.push(newElement);
        }
      }
    });
    
    return updatedTemplate;
  };

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

  // Handle sending a message to the AI
  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      
      // If there's no projectId yet, create one first
      let targetProjectId = projectId;
      let newProjectCreated = false;
      
      if (!targetProjectId && !projectData) {
        // Create a new project since this is the first message
        const newProject = await createProject(projectTitle);
        targetProjectId = newProject.id;
        setProjectData(newProject);
        newProjectCreated = true;
        
        // Update URL to include the username and project name
        if (currentUsername) {
          navigate(`/editor/${currentUsername}/${encodeURIComponent(newProject.name)}`, { replace: true });
        } else {
          navigate(`/editor/${targetProjectId}`, { replace: true });
        }
      }
      
      // Add user message to chat with explicit 'user' role
      const userMessageId = generateId();
      const userMessage: ChatMessage = {
        id: userMessageId,
        content: message,
        timestamp: new Date(),
        role: 'user'
      };
      
      setChatMessages((prev) => [...prev, userMessage]);
      
      // Save user message to the database with explicit 'user' role
      await saveChatMessage(targetProjectId!, message, 'user');
      
      try {
        // Get the current template or use empty template if none exists
        const currentTemplateToUse = emailTemplate || emptyTemplate;
        
        // Format chat history for context
        const chatHistoryForAI = chatMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role || (chatMessages.indexOf(msg) % 2 === 0 ? 'user' : 'assistant')
        }));
        
        // Call our OpenAI Edge Function
        const response = await supabase.functions.invoke('generate-email-changes', {
          body: {
            prompt: message,
            currentTemplate: currentTemplateToUse,
            chatHistory: chatHistoryForAI,
          }
        });
        
        // Check if the response contains an error
        if (response.error) {
          throw new Error(response.error.message || 'Error generating email changes');
        }
        
        const { explanation, updatedTemplate, error } = response.data;
        
        // Handle error in response data
        if (error) {
          throw new Error(error);
        }
        
        // Save assistant message to the database with explicit 'assistant' role
        const aiMessageId = generateId();
        const aiMessage: ChatMessage = {
          id: aiMessageId,
          content: explanation,
          timestamp: new Date(),
          role: 'assistant'
        };
        
        setChatMessages((prev) => [...prev, aiMessage]);
        await saveChatMessage(targetProjectId!, explanation, 'assistant');
        
        // Calculate differences and save as pending changes
        const newPendingChanges = generatePendingChanges(currentTemplateToUse, updatedTemplate);
        
        // Update the email template with pending changes
        setEmailTemplate(updatedTemplate);
        
        // Generate HTML from the updated template
        const htmlOutput = await exportEmailAsHtml(updatedTemplate);
        
        // IMPORTANT CHANGE: Ensure we always set hasCode to true when we have a template
        setHasCode(true);
        
        // IMPORTANT CHANGE: Immediately update the project with the changes
        await updateProjectWithEmailChanges(targetProjectId!, htmlOutput, updatedTemplate);
        
        // Save pending changes to database
        await Promise.all(
          newPendingChanges.map(change => 
            savePendingChange(
              targetProjectId!,
              change.elementId,
              change.changeType,
              change.oldContent,
              change.newContent
            )
          )
        );
        
        // Update local state with new pending changes
        setPendingChanges((prev) => [...prev, ...newPendingChanges]);
        
      } catch (error) {
        console.error('Error processing with AI:', error);
        toast({
          title: 'AI Processing Error',
          description: error.message || 'Failed to process request with AI. Please make sure the OpenAI API key is valid.',
          variant: 'destructive',
        });
        
        // Add a system message about the error with explicit 'assistant' role
        setChatMessages((prev) => [
          ...prev, 
          {
            id: generateId(),
            content: `Error: ${error.message || 'Failed to process request with AI'}. This might be due to an issue with the OpenAI API key or service.`,
            timestamp: new Date(),
            role: 'assistant'
          }
        ]);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to identify differences between templates and generate pending changes
  const generatePendingChanges = (oldTemplate: EmailTemplate, newTemplate: EmailTemplate): PendingChange[] => {
    const changes: PendingChange[] = [];
    
    // Process each section in the new template
    newTemplate.sections.forEach(newSection => {
      // For each element in this section
      newSection.elements.forEach(element => {
        // If the element has pending flag, create a pending change
        if (element.pending) {
          // Find the corresponding element in the old template (if it exists)
          let oldElement: EmailElement | undefined;
          let oldSectionId: string | undefined;
          
          oldTemplate.sections.forEach(oldSection => {
            const foundElement = oldSection.elements.find(e => e.id === element.id);
            if (foundElement) {
              oldElement = foundElement;
              oldSectionId = oldSection.id;
            }
          });
          
          // Create the pending change object
          const change: PendingChange = {
            id: generateId(),
            elementId: element.id,
            changeType: element.pendingType || 'edit',
            status: 'pending'
          };
          
          // Add old and new content based on change type
          if (element.pendingType === 'add') {
            change.newContent = {
              element: { ...element },
              sectionId: newSection.id
            };
          } else if (element.pendingType === 'edit') {
            if (oldElement) {
              change.oldContent = { ...oldElement };
              change.newContent = { ...element };
            }
          } else if (element.pendingType === 'delete') {
            if (oldElement) {
              change.oldContent = { ...oldElement };
            }
          }
          
          changes.push(change);
        }
      });
    });
    
    return changes;
  };

  // Handle accepting a pending change
  const handleAcceptChange = async (elementId: string) => {
    if (!projectId || !emailTemplate) return;
    
    try {
      const change = pendingChanges.find((c) => c.elementId === elementId);
      if (!change) return;
      
      // Create an updated template with the accepted change
      const updatedTemplate = { ...emailTemplate };
      
      // Find the element and remove pending flags
      for (const section of updatedTemplate.sections) {
        for (let i = 0; i < section.elements.length; i++) {
          const element = section.elements[i];
          
          if (element.id === elementId) {
            if (element.pendingType === 'delete') {
              // Remove the element if it was pending deletion
              section.elements.splice(i, 1);
            } else {
              // Otherwise just remove the pending flags
              delete element.pending;
              delete element.pendingType;
            }
            break;
          }
        }
      }
      
      // Save the accepted change and update the template
      await acceptPendingChange(change.id, projectId, updatedTemplate);
      
      // Update local state
      setEmailTemplate(updatedTemplate);
      setPendingChanges(pendingChanges.filter((c) => c.id !== change.id));
      
      // IMPORTANT: Ensure hasCode remains true
      setHasCode(true);
      
      toast({
        title: 'Change accepted',
        description: 'The change has been applied to your email',
      });
    } catch (error) {
      console.error('Error accepting change:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept change',
        variant: 'destructive',
      });
    }
  };

  // Handle rejecting a pending change
  const handleRejectChange = async (elementId: string) => {
    if (!projectId || !emailTemplate) return;
    
    try {
      const change = pendingChanges.find((c) => c.elementId === elementId);
      if (!change) return;
      
      // Create an updated template with the change rejected
      const updatedTemplate = { ...emailTemplate };
      
      for (const section of updatedTemplate.sections) {
        for (let i = 0; i < section.elements.length; i++) {
          const element = section.elements[i];
          
          if (element.id === elementId) {
            if (element.pendingType === 'add') {
              // Remove added elements
              section.elements.splice(i, 1);
            } else if (element.pendingType === 'edit' && change.oldContent) {
              // Restore original content for edited elements
              section.elements[i] = {
                ...change.oldContent,
                id: elementId,
              };
            } else if (element.pendingType === 'delete') {
              // Just remove pending flags for elements that were going to be deleted
              delete element.pending;
              delete element.pendingType;
            }
            break;
          }
        }
      }
      
      // Reject the change in the database
      await rejectPendingChange(change.id);
      
      // Generate HTML from the restored template
      const htmlOutput = await exportEmailAsHtml(updatedTemplate);
      
      // UPDATE: Also update the project with the restored template
      await updateProjectWithEmailChanges(projectId, htmlOutput, updatedTemplate);
      
      // Update local state
      setEmailTemplate(updatedTemplate);
      setPendingChanges(pendingChanges.filter((c) => c.id !== change.id));
      
      // IMPORTANT: Ensure hasCode remains true if we still have a template with elements
      const stillHasElements = updatedTemplate.sections.some(section => section.elements.length > 0);
      if (stillHasElements) {
        setHasCode(true);
      }
      
      toast({
        title: 'Change rejected',
        description: 'The change has been discarded',
      });
    } catch (error) {
      console.error('Error rejecting change:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject change',
        variant: 'destructive',
      });
    }
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
      </header>

      {/* Main content with split screen */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Email preview panel */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            {!hasCode ? (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                <h2 className="text-2xl font-medium mb-4">Start Creating Your Email</h2>
                <p className="text-gray-500 mb-6">
                  Send a message to the AI assistant to start generating your email template.
                  The AI will create an email layout based on your requirements.
                </p>
                {isLoading && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm text-gray-500">Generating email template...</p>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-lg font-medium mb-4">Email Preview</h2>
                {emailTemplate && (
                  <EmailPreview
                    template={emailTemplate}
                    onAcceptChange={handleAcceptChange}
                    onRejectChange={handleRejectChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Chat interface panel */}
        <div className="w-full lg:w-96 p-6 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default Editor;
