import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreview } from '@/components/EmailPreview';
import { ChatInterface } from '@/components/ChatInterface';
import { Project, EmailTemplate, PendingChange, ChatMessage } from '@/types/editor';
import { getProject, saveChatMessage, acceptPendingChange, rejectPendingChange } from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/uuid';

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
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Load project data
  useEffect(() => {
    if (!user) return;
    
    const loadProject = async () => {
      try {
        setIsLoadingProject(true);
        
        if (projectId) {
          const projectData = await getProject(projectId);
          
          setProjectName(projectData.project.name);
          
          // Convert chat messages to our format
          const formattedMessages = projectData.chatMessages || [];
          
          setChatMessages(formattedMessages);
          
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
          } else {
            // If no email content exists, use empty template
            setEmailTemplate(emptyTemplate);
          }
        } else {
          // If no project ID, use empty template
          setEmailTemplate(emptyTemplate);
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
    
    loadProject();
  }, [projectId, user, toast]);

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

  // Handle sending a message to the AI
  const handleSendMessage = async (message: string) => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      
      // Add user message to chat
      const userMessageId = generateId();
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      
      setChatMessages((prev) => [...prev, userMessage]);
      
      // Save user message to the database
      await saveChatMessage(projectId, 'user', message);
      
      // TODO: Call AI service for response
      // For now, we'll simulate an AI response
      setTimeout(async () => {
        const aiMessageId = generateId();
        const aiMessage: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: 'This is a placeholder response. In the full implementation, this would be a response from the OpenAI API.',
          timestamp: new Date(),
        };
        
        setChatMessages((prev) => [...prev, aiMessage]);
        
        // Save assistant message to the database
        await saveChatMessage(projectId, 'assistant', aiMessage.content);
        
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
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
      
      // Save the accepted change
      await acceptPendingChange(change.id, projectId, updatedTemplate);
      
      // Update local state
      setEmailTemplate(updatedTemplate);
      setPendingChanges(pendingChanges.filter((c) => c.id !== change.id));
      
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
      
      // Save the rejected change status
      await rejectPendingChange(change.id);
      
      // Update local state
      setEmailTemplate(updatedTemplate);
      setPendingChanges(pendingChanges.filter((c) => c.id !== change.id));
      
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emailore-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your project...</p>
        </div>
      </div>
    );
  }

  // If project exists but has no email content yet, show loading
  if (projectId && !emailTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emailore-purple animate-pulse"></div>
          </div>
          <p className="text-gray-600 mt-4">Preparing your email editor...</p>
        </div>
      </div>
    );
  }
  
  // Otherwise show the full editor interface
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
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                }}
                autoFocus
                className="text-lg font-medium text-center border-b border-gray-300 focus:border-emailore-purple focus:outline-none px-2"
              />
            ) : (
              <h1 
                className="text-lg font-medium cursor-pointer hover:text-emailore-purple transition-colors"
                onClick={() => setIsEditingTitle(true)}
              >
                {projectName}
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
            <h2 className="text-lg font-medium mb-4">Email Preview</h2>
            {emailTemplate && (
              <EmailPreview
                template={emailTemplate}
                onAcceptChange={handleAcceptChange}
                onRejectChange={handleRejectChange}
              />
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
