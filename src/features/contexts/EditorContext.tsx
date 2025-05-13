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
  exportEmailAsHtmlV2
} from '@/features/services/projectService';
// Type definitions for core data structures
import { Project, PendingChange, ChatMessage, ExtendedChatMessage, SimpleClarificationMessage } from '@/features/types/editor';
// Import for email template type definition from the Supabase functions shared types
import { EmailTemplate as EmailTemplateV2 } from '../../shared/types/template';
// Type for AI clarification messages
import { ClarificationMessage } from '@/features/types/ai';
// UUID generation utility
import { generateId } from '@/lib/uuid';
// Supabase client for direct database operations
import { supabase } from '@/integrations/supabase/client';
// HTML generator for rendering email templates
import { HtmlGeneratorV2 } from '@/features/services/htmlGenerator';

/**
 * Defines the available interaction modes for the editor:
 * - 'ask': User is asking a question without editing
 * - 'edit': User is making minor edits to the email
 * - 'major': User is making significant changes or generating new content
 */
type InteractionMode = 'ask' | 'edit' | 'major';

/**
 * Local definition of the API response structure for the clarification endpoints
 * Contains fields needed to handle the multi-turn conversation for email creation
 */
interface ClarificationApiResponse {
  message?: string;
  context?: any;
  suggestions?: string[];
}

/**
 * Complete response structure from the clarification API endpoints
 * Extends the base ClarificationApiResponse with additional fields
 * needed for the email generation workflow
 */
interface ExtendedClarificationResponse extends ClarificationApiResponse {
  needsClarification?: boolean;
  message?: string;
  context?: any;
  suggestions?: string[];
  emailData?: {
    html: string;
    semantic: any;
  };
  completed?: boolean;
}

/**
 * Complete definition of the Editor Context API
 * This interface specifies all the properties, states, and functions
 * that components can access through the useEditor hook
 */
interface EditorContextType {
  // Project data section - Core project state and metadata
  /** The current project object with all its properties */
  projectData: Project | null;
  /** State setter for the project data */
  setProjectData: React.Dispatch<React.SetStateAction<Project | null>>;
  /** The project ID used for API calls and routing */
  actualProjectId: string | null;
  /** The displayed title of the project */
  projectTitle: string;
  /** State setter for the project title */
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  /** Whether the title is currently being edited */
  isEditingTitle: boolean;
  /** State setter for the title editing state */
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>;
  
  // UI States section - Loading and visual state indicators
  /** Whether any async operation is currently in progress */
  isLoading: boolean;
  /** Whether the project is currently being loaded */
  isLoadingProject: boolean;
  /** Whether the project has email content */
  hasCode: boolean;
  /** Progress indicator for long-running operations (0-100) */
  progress: number;
  
  // Content & Preview section - Email display related states
  /** Current HTML content for the preview */
  livePreviewHtml: string | null;
  /** Whether dark mode is enabled for the preview */
  isDarkMode: boolean;
  /** State setter for dark mode */
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  /** Whether mobile view is enabled for the preview */
  isMobileView: boolean;
  /** State setter for mobile view */
  setIsMobileView: React.Dispatch<React.SetStateAction<boolean>>;
  /** The username for legacy URL formats */
  currentUsername: string | null;
  /** Initial content value for the editor (from landing page) */
  initialInputValue: string | null;
  /** State setter for initial input value */
  setInitialInputValue: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Chat & Messages section - Conversation and pending changes
  /** Array of chat messages between user and AI */
  chatMessages: ExtendedChatMessage[];
  /** State setter for chat messages */
  setChatMessages: React.Dispatch<React.SetStateAction<ExtendedChatMessage[]>>;
  /** Array of pending changes to be accepted/rejected */
  pendingChanges: PendingChange[];
  /** State setter for pending changes */
  setPendingChanges: React.Dispatch<React.SetStateAction<PendingChange[]>>;
  /** Current interaction mode (ask/edit/major) */
  selectedMode: InteractionMode;
  /** State setter for interaction mode */
  setSelectedMode: React.Dispatch<React.SetStateAction<InteractionMode>>;
  
  // Placeholder editing section - For handling editable elements in the email
  /** Currently active placeholder element being edited */
  editingPlaceholder: {elementId: string, path: string, type: 'image' | 'link' | 'text'} | null;
  /** State setter for editing placeholder */
  setEditingPlaceholder: React.Dispatch<React.SetStateAction<{elementId: string, path: string, type: 'image' | 'link' | 'text'} | null>>;
  /** Handler for when a placeholder is activated in the preview */
  handlePlaceholderActivation: (context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => void;
  /** Whether the link editing modal is open */
  isLinkModalOpen: boolean;
  /** State setter for link modal visibility */
  setIsLinkModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** Current value in the link input field */
  linkInputValue: string;
  /** State setter for link input value */
  setLinkInputValue: React.Dispatch<React.SetStateAction<string>>;
  /** Handler for saving a link after editing */
  handleSaveLink: () => void;
  /** Handler for when a file is selected for an image placeholder */
  handleFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function to update a property of an element in the semantic structure */
  updateElementProperty: (elementId: string, propertyPath: string, value: any) => void;
  
  // Clarification section - AI conversation flow for gathering email requirements
  /** Whether the clarification flow is active */
  isClarifying: boolean;
  /** Whether an initial email draft has been created */
  hasFirstDraft: boolean;
  /** Whether we're in the process of creating the first email */
  isCreatingFirstEmail: boolean;
  /** State setter for first email creation state */
  setIsCreatingFirstEmail: React.Dispatch<React.SetStateAction<boolean>>;
  /** Array of messages in the clarification conversation */
  clarificationConversation: SimpleClarificationMessage[];
  /** State setter for clarification conversation */
  setClarificationConversation: React.Dispatch<React.SetStateAction<SimpleClarificationMessage[]>>;
  /** Context object for the clarification flow, containing gathered info */
  clarificationContext: any;
  
  // Core Actions section - Main user-initiated operations
  /** Handler for sending a user message to the AI */
  handleSendMessage: (message: string, mode: InteractionMode) => Promise<void>;
  /** Handler for changing the project title */
  handleTitleChange: (newTitle: string) => Promise<void>;
  /** Handler for accepting all pending changes */
  handleAcceptAll: () => Promise<void>;
  /** Handler for rejecting all pending changes */
  handleRejectAll: () => Promise<void>;
  /** Handler for when a suggestion is selected */
  handleSuggestionSelected: (suggestionValue: string) => Promise<void>;
  /** Handler for navigating to the send email page */
  handleNavigateToSendPage: () => Promise<void>;
  /** Handler for changing the interaction mode */
  handleModeChange: (newMode: InteractionMode) => void;
  
  // Utils section - Utility functions and helpers
  /** Function to fetch and set project data */
  fetchAndSetProject: (id: string) => Promise<Project | null>;
  /** HTML generator instance for rendering email templates */
  htmlGenerator: HtmlGeneratorV2;
  /** Handler for refreshing the project data from the server */
  handleRefreshProject: () => Promise<void>;
  /** Handler for final email generation after clarification */
  handleFinalEmailGeneration: (context: any) => Promise<void>;
  /** Standardized error handler for editor operations */
  handleEditorError: (error: unknown, context: string, severity?: 'warning' | 'error') => string;
}

/**
 * Create the context with undefined default value
 * We use undefined rather than null to ensure consumers must use the Provider
 */
const EditorContext = createContext<EditorContextType | undefined>(undefined);

/**
 * EditorProvider Component
 * 
 * This provider component wraps the editor interface and supplies all state,
 * data, and functionality needed for the email editor to function.
 * 
 * It manages project loading, state persistence, API communication, and
 * provides utility functions to all child components through React context.
 */
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Extract route parameters for project identification
  const { projectId, username, projectName } = useParams<{ projectId?: string; username?: string; projectName?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Project state - Core data about the current project
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Document');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Content state - Message history and pending changes
  const [chatMessages, setChatMessages] = useState<ExtendedChatMessage[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasCode, setHasCode] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [initialInputValue, setInitialInputValue] = useState<string | null>(null);
  
  // Preview controls - Visual settings for the email preview
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Editor mode - Current interaction mode with the AI
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('major');
  
  // Placeholder editing - State for handling editable elements in email
  const [editingPlaceholder, setEditingPlaceholder] = useState<{elementId: string, path: string, type: 'image' | 'link' | 'text'} | null>(null);
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);
  
  // Link modal - State for the link editing modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  
  // HTML Generator - Instantiate once and reuse for all HTML generation
  const htmlGenerator = useMemo(() => new HtmlGeneratorV2(), []);
  
  // Clarification flow - State for the multi-turn conversation with AI
  const [clarificationConversation, setClarificationConversation] = useState<SimpleClarificationMessage[]>([]);
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [clarificationContext, setClarificationContext] = useState<any>(null);
  const [hasFirstDraft, setHasFirstDraft] = useState<boolean>(false);
  const [isCreatingFirstEmail, setIsCreatingFirstEmail] = useState<boolean>(false);
  
  /**
   * fetchAndSetProject - Core utility function for loading project data
   * 
   * This function fetches a project by ID from the database, then updates
   * all relevant state in the EditorContext with the fetched data.
   * It also handles error states and navigation if the project isn't found.
   * 
   * @param id - The project ID to fetch
   * @returns The fetched project data or null if not found/error
   */
  const fetchAndSetProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      console.log(`[fetchAndSetProject] Fetching project with ID: ${id}`);
      const fetchedResult = await getProject(id);
      
      if (fetchedResult && fetchedResult.project) {
        // Log key information about the fetched project
        console.log("[fetchAndSetProject] Fetched Project HTML (first 500 chars):", 
          fetchedResult.project.current_html?.substring(0, 500) || "No HTML");
        console.log("[fetchAndSetProject] Fetched Pending Changes:", 
          fetchedResult.pendingChanges?.length || 0, "changes");
        console.log("[fetchAndSetProject] Has semantic email v2:", 
          !!fetchedResult.project.semantic_email_v2);

        // Update all relevant state with fetched data
        setProjectData(fetchedResult.project);
        setProjectTitle(fetchedResult.project.name);
        setActualProjectId(fetchedResult.project.id);
        setHasCode(!!fetchedResult.project.current_html);
        
        // Type cast the messages to match our extended interface
        // This ensures the chat messages have the correct structure for the UI
        const formattedChatMessages = (fetchedResult.chatMessages || []).map(msg => ({
          ...msg,
          role: msg.role || 'assistant',
        })) as ExtendedChatMessage[];
        setChatMessages(formattedChatMessages);
        
        setPendingChanges(fetchedResult.pendingChanges || []);
        
        // Initialize preview HTML with current content
        setLivePreviewHtml(fetchedResult.project.current_html || null);
        
        // Update draft status based on content
        // A draft exists if we have either HTML or a semantic structure
        const hasEmail = !!fetchedResult.project.current_html || 
                         !!fetchedResult.project.semantic_email_v2;
        setHasFirstDraft(hasEmail);
        
        // If we have a semantic template but no HTML, generate the HTML
        // This handles cases where only the structured data exists
        if (fetchedResult.project.semantic_email_v2 && !fetchedResult.project.current_html) {
          console.log("[fetchAndSetProject] We have semantic data but no HTML, generating...");
          try {
            const generatedHtml = await htmlGenerator.generate(fetchedResult.project.semantic_email_v2);
            if (generatedHtml) {
              console.log("[fetchAndSetProject] Generated HTML from semantic template");
              setLivePreviewHtml(generatedHtml);
              
              // Update project with generated HTML
              await updateProject(id, { current_html: generatedHtml });
            }
          } catch (error) {
            console.error("[fetchAndSetProject] Error generating HTML from semantic template:", error);
          }
        }
        
        return fetchedResult.project;
      } else {
        // Handle case where project wasn't found
        console.warn("[fetchAndSetProject] Project not found:", id);
        toast({ title: 'Error', description: 'Project not found.', variant: 'destructive' });
        navigate('/dashboard');
        return null;
      }
    } catch (error) {
      // Handle any errors during the fetch operation
      console.error('[fetchAndSetProject] Error fetching project:', error);
      toast({ title: 'Error', description: 'Failed to load project data.', variant: 'destructive' });
      navigate('/dashboard');
      return null;
    }
  }, [navigate, toast, htmlGenerator]);
  
  /**
   * Initialize the editor based on route parameters
   * 
   * This effect runs once on component mount and handles different initialization
   * scenarios based on the URL parameters:
   * 1. Direct projectId: Load project by ID
   * 2. Username/projectName: Legacy URL format, load by name
   * 3. No identifiers: Start fresh with potential initial content
   */
  useEffect(() => {
    const initializeEditor = async () => {
      setIsLoadingProject(true);
      
      try {
        // Case 1: Direct project ID is provided in the URL
        if (projectId) {
          console.log(`Loading project by ID: ${projectId}`);
          await fetchAndSetProject(projectId);
        } 
        // Case 2: Username and project name are provided (legacy URL format)
        else if (username && projectName) {
          console.log(`Loading project by username/name: ${username}/${projectName}`);
          const result = await getProjectByNameAndUsername(username, decodeURIComponent(projectName));
          
          if (result?.project) {
            // Update state with the fetched project
            setProjectData(result.project);
            setProjectTitle(result.project.name);
            setActualProjectId(result.project.id);
            setHasCode(!!result.project.current_html);
            
            // Type cast the messages to match our extended interface
            const formattedChatMessages = (result.chatMessages || []).map(msg => ({
              ...msg,
              role: msg.role || 'assistant',
            })) as ExtendedChatMessage[];
            setChatMessages(formattedChatMessages);
            
            setPendingChanges(result.pendingChanges || []);
            setLivePreviewHtml(result.project.current_html || null);
            
            // Update URL to use project ID format for future consistency
            window.history.replaceState({}, '', `/editor/${result.project.id}`);
            
            // Store the username for potential later use
            setCurrentUsername(username);
          } else {
            // Handle case where project wasn't found by username/name
            toast({ 
              title: 'Project Not Found', 
              description: `Could not find project "${projectName}" for user "${username}"`,
              variant: 'destructive'
            });
            navigate('/dashboard');
          }
        } 
        // Case 3: No project identifiers - fresh start
        else {
          console.log('No project identifiers in URL, starting fresh');
          setIsLoadingProject(false);
          setIsCreatingFirstEmail(true);
          
          // Check for initial content that might have been passed from landing page
          const storedPrompt = localStorage.getItem('initialEmailPrompt');
          if (storedPrompt) {
            setInitialInputValue(storedPrompt);
            localStorage.removeItem('initialEmailPrompt');
          }
        }
      } catch (error) {
        // Handle any errors during initialization
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
  }, [projectId, username, projectName, navigate, toast, fetchAndSetProject]);

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
          setLivePreviewHtml(generatedHtml);
          
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
      setHasFirstDraft(true);
    }
  }, [projectData?.current_html, hasFirstDraft]);
  
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
  const handleSendMessage = async (message: string, mode: InteractionMode) => {
    // Validate message isn't empty
    if (!message.trim()) {
      toast({ title: 'Error', description: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    // Set loading state and initial progress
    setIsLoading(true);
    setProgress(10);

    try {
      // Create initial message object and add to chat immediately for UI feedback
      const newUserMessage: ExtendedChatMessage = {
        id: generateId(),
        content: message,
        role: 'user',
        timestamp: new Date(),
        type: mode === 'ask' ? 'question' : 'edit_request',
      };
      setChatMessages(prev => [...prev, newUserMessage]);

      // Flow 1: First email creation process
      if (isCreatingFirstEmail) {
        setProgress(20);
        
        let currentProjectId = actualProjectId; // Use a local var that can be updated
        if (!currentProjectId) {
          console.log("Creating a new project for first email flow...");
          setProgress(30);
          try {
            const newProject = await createProject(projectTitle); // Assuming projectTitle is suitable
            if (!newProject?.id) {
              throw new Error("Failed to create project for first email flow");
            }
            setActualProjectId(newProject.id);
            setProjectData(newProject);
            currentProjectId = newProject.id; // Update local var
            window.history.replaceState({}, '', `/editor/${newProject.id}`);
            console.log("Created new project with ID:", newProject.id);
          } catch (error) {
            console.error("Error creating project in first email flow:", error);
            toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
            setIsLoading(false);
            setProgress(0);
            return;
          }
        }
        
        if (!currentProjectId) {
          toast({ title: 'Error', description: 'Project ID missing after creation attempt.', variant: 'destructive' });
          setIsLoading(false); return;
        }

        setProgress(40);
        console.log(`[EditorContext] Initiating 'clarify-user-intent' for project ${currentProjectId}`);

        // Step 1: Call 'clarify-user-intent'
        const clarifyPayload = { // Conforms to ClarifyUserIntentPayload
          userMessage: message,
          mainChatHistory: chatMessages.slice(-5), // Send recent history
          currentSemanticEmailV2: null,
          ongoingClarificationContext: clarificationContext, // Pass the current context back
          projectId: currentProjectId,
          mode: 'major', 
        };

        const clarifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
          },
          body: JSON.stringify(clarifyPayload),
        });

        setProgress(60);

        if (!clarifyResponse.ok) {
          const errorData = await clarifyResponse.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent' }));
          console.error("Error from clarify-user-intent:", clarifyResponse.status, errorData);
          throw new Error(errorData.error || errorData.message || `Failed to clarify intent (status ${clarifyResponse.status})`);
        }

        const clarifyData = await clarifyResponse.json(); // QuestionResponse or CompleteResponse

        if (clarifyData.status === 'requires_clarification') {
          console.log("[EditorContext] 'clarify-user-intent' requires clarification.");
          setIsClarifying(true); // Enter clarification mode
          setClarificationContext(clarifyData.updatedClarificationContext);
          
          const questionMessage: ExtendedChatMessage = {
            id: generateId(),
            content: clarifyData.question.text,
            role: 'assistant',
            timestamp: new Date(),
            type: 'clarification',
            suggestions: clarifyData.question.suggestions?.map(s => s.text) || [], // Assuming suggestions are just text arrays for UI
          };
          setChatMessages(prev => [...prev, questionMessage]);
          // Add to clarificationConversation as well for dedicated display if needed
          setClarificationConversation(prev => [
            ...prev,
            { role: 'user', content: message }, // User's initial prompt
            { role: 'assistant', content: clarifyData.question.text } // AI's question
          ]);

        } else if (clarifyData.status === 'complete') {
          console.log("[EditorContext] 'clarify-user-intent' complete. Proceeding to 'generate-email-changes'.");
          setProgress(70);
          // Reset clarification state as we are proceeding to generation
          setIsClarifying(false); 
          setClarificationContext(null); 

          // Step 2: Call 'generate-email-changes'
          const generatePayload = { // Conforms to GenerateEmailChangesPayload
            projectId: currentProjectId,
            mode: 'major', // As expected by generate-email-changes
            perfectPrompt: clarifyData.perfectPrompt,
            elementsToProcess: clarifyData.elementsToProcess,
            currentSemanticEmailV2: null, // No existing email for the first creation
            // newTemplateName: projectTitle, // Optional: use current project title or derive
          };

          const generateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
            },
            body: JSON.stringify(generatePayload),
          });

          setProgress(90);

          if (!generateResponse.ok) {
            const errorData = await generateResponse.json().catch(() => ({ error: 'Failed to parse error from generate-email-changes' }));
            console.error("Error from generate-email-changes:", generateResponse.status, errorData);
            throw new Error(errorData.error || errorData.message || `Failed to generate email (status ${generateResponse.status})`);
          }

          const generateData = await generateResponse.json(); // Expects { newSemanticEmail, newHtml, newPendingChanges }

          if (generateData.newHtml && generateData.newSemanticEmail) {
            console.log("[EditorContext] Email generated successfully by 'generate-email-changes'.");
            const updatedProjectData = await updateProject(currentProjectId, {
              current_html: generateData.newHtml,
              semantic_email_v2: generateData.newSemanticEmail,
              name: generateData.newSemanticEmail.name || projectTitle, // Update project name if template name changed
            });

            if (updatedProjectData) {
              setProjectData(updatedProjectData);
              setLivePreviewHtml(generateData.newHtml);
              setPendingChanges(generateData.newPendingChanges || []); // Assuming it can be null
              setHasCode(true);
              setHasFirstDraft(true);
              setIsCreatingFirstEmail(false); // Exit first email creation flow
              setIsClarifying(false); // Ensure clarification mode is exited

              const successMessage: ExtendedChatMessage = {
                id: generateId(),
                content: clarifyData.finalSummary || "I've created your email based on your description!",
                role: 'assistant',
                timestamp: new Date(),
                type: 'success',
              };
              setChatMessages(prev => [...prev, successMessage]);
            } else {
              throw new Error("Failed to update project with generated email data.");
            }
          } else {
            console.error("Invalid response from 'generate-email-changes':", generateData);
            throw new Error("Received invalid data after email generation.");
          }
        } else {
          console.error("Unknown status from 'clarify-user-intent':", clarifyData.status);
          throw new Error(`Unknown status from clarification: ${clarifyData.status}`);
        }
      } 
      // Flow 3: Normal message handling for questions or edits
      else { 
        // This flow should only trigger if !isCreatingFirstEmail AND !isClarifying
        if (isClarifying) {
          console.warn("Attempting normal message send while still in clarification mode. This shouldn't happen with the unified flow.");
          setIsClarifying(false); // Force exit clarification mode
          setClarificationContext(null);
        }
          
        try {
          // Ensure we have a project ID
          if (!actualProjectId) {
            throw new Error("Missing project ID for message handling");
          }
          
          setProgress(40);
          
          // --- START REFACTORED EDIT/MAJOR MODE HANDLING ---
          if (mode === 'edit' || mode === 'major') {
            console.log(`[EditorContext] Initiating 'clarify-user-intent' for existing project ${actualProjectId} (Mode: ${mode})`);

            // Step 1: Call 'clarify-user-intent'
            const clarifyPayload = { // Conforms to ClarifyUserIntentPayload
              userMessage: message,
              mainChatHistory: chatMessages.slice(-5), // Send recent history
              currentSemanticEmailV2: projectData?.semantic_email_v2 || null, // Pass existing template
              ongoingClarificationContext: clarificationContext, // Pass the current context back
              projectId: actualProjectId,
              mode: mode, // Pass the current mode
            };

            const clarifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clarify-user-intent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
              },
              body: JSON.stringify(clarifyPayload),
            });

            setProgress(60);

            if (!clarifyResponse.ok) {
              const errorData = await clarifyResponse.json().catch(() => ({ error: 'Failed to parse error from clarify-user-intent' }));
              console.error("Error from clarify-user-intent (edit flow):", clarifyResponse.status, errorData);
              throw new Error(errorData.error || errorData.message || `Failed to clarify intent (edit flow, status ${clarifyResponse.status})`);
            }

            const clarifyData = await clarifyResponse.json(); // QuestionResponse or CompleteResponse

            if (clarifyData.status === 'requires_clarification') {
              console.log("[EditorContext] 'clarify-user-intent' requires clarification (edit flow).");
              setIsClarifying(true); // Enter clarification mode
              setClarificationContext(clarifyData.updatedClarificationContext);
              
              const questionMessage: ExtendedChatMessage = {
                id: generateId(),
                content: clarifyData.question.text,
                role: 'assistant',
                timestamp: new Date(),
                type: 'clarification',
                suggestions: clarifyData.question.suggestions?.map(s => s.text) || [],
              };
              setChatMessages(prev => [...prev, questionMessage]);
              setClarificationConversation(prev => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: clarifyData.question.text }
              ]);

            } else if (clarifyData.status === 'complete') {
              console.log("[EditorContext] 'clarify-user-intent' complete (edit flow). Proceeding to 'generate-email-changes'.");
              setProgress(70);
              setIsClarifying(false); 
              setClarificationContext(null); 

              // Step 2: Call 'generate-email-changes'
              const generatePayload = { // Conforms to GenerateEmailChangesPayload
                projectId: actualProjectId,
                mode: mode, // Pass the original mode
                perfectPrompt: clarifyData.perfectPrompt,
                elementsToProcess: clarifyData.elementsToProcess,
                currentSemanticEmailV2: projectData?.semantic_email_v2 || null, // Pass existing template
              };

              const generateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-changes`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
                },
                body: JSON.stringify(generatePayload),
              });

              setProgress(90);

              if (!generateResponse.ok) {
                const errorData = await generateResponse.json().catch(() => ({ error: 'Failed to parse error from generate-email-changes' }));
                console.error("Error from generate-email-changes (edit flow):", generateResponse.status, errorData);
                throw new Error(errorData.error || errorData.message || `Failed to generate email changes (edit flow, status ${generateResponse.status})`);
              }

              const generateData = await generateResponse.json(); // Expects { newSemanticEmail, newHtml, newPendingChanges }

              if (generateData.newHtml && generateData.newSemanticEmail) {
                console.log("[EditorContext] Email changes generated successfully by 'generate-email-changes' (edit flow).");
                // Note: updateProject might overwrite changes if called concurrently. 
                // Consider fetching latest project data before updating locally, or relying on subscription.
                setProjectData(prev => prev ? { ...prev, semantic_email_v2: generateData.newSemanticEmail } : null);
                setLivePreviewHtml(generateData.newHtml);
                setPendingChanges(generateData.newPendingChanges || []); // Overwrite pending changes
                setHasCode(true);
                // Update the chat
                const successMessage: ExtendedChatMessage = {
                  id: generateId(),
                  content: clarifyData.finalSummary || "I've updated the email based on your request.",
                  role: 'assistant',
                  timestamp: new Date(),
                  type: 'success',
                };
                setChatMessages(prev => [...prev, successMessage]);
              } else {
                console.error("Invalid response from 'generate-email-changes' (edit flow):", generateData);
                throw new Error("Received invalid data after email change generation.");
              }
            } else {
              console.error("Unknown status from 'clarify-user-intent' (edit flow):", clarifyData.status);
              throw new Error(`Unknown status from clarification (edit flow): ${clarifyData.status}`);
            }
          } 
          // --- END REFACTORED EDIT/MAJOR MODE HANDLING ---

          // --- START ORIGINAL 'ask' MODE HANDLING ---
          else if (mode === 'ask') {
            // Determine endpoint based on interaction mode
            // For now, keep the separate 'ask' endpoint if needed
            const endpoint = 'email-question'; // Or potentially integrate into clarify-user-intent later
            
            // Call the appropriate endpoint based on mode
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
              },
              body: JSON.stringify({
                projectId: actualProjectId,
                message,
                mode,
                // Add relevant context if needed for the 'ask' endpoint
                // currentSemanticEmailV2: projectData?.semantic_email_v2 || null,
                // chatHistory: chatMessages.slice(-5), 
              }),
            });
            
            setProgress(75);
            
            // Handle error responses
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from email-question' }));
              console.error("Error from email-question:", response.status, errorData);
              throw new Error(errorData.error || errorData.message || `Failed to process question (status ${response.status})`);
            }
            
            const data = await response.json();
            
            // Case 3A: Just a question - add response to chat
            const aiResponse: ExtendedChatMessage = {
              id: generateId(),
              content: data.message || "Here's your answer",
              role: 'assistant',
              timestamp: new Date(),
              type: 'answer',
            };
            
            setChatMessages(prev => [...prev, aiResponse]);
          }
          // --- END ORIGINAL 'ask' MODE HANDLING ---
          
          // Old 'edit'/'major' logic removed here
          
        } catch (error) {
          // Handle errors during regular message processing
          console.error("Error processing message:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to process your request';
          
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
          
          // Add error message to chat
          const aiErrorMessage: ExtendedChatMessage = {
            id: generateId(),
            content: `Sorry, I encountered an error: ${errorMessage}`,
            role: 'assistant',
            timestamp: new Date(),
            type: 'error',
          };
          
          setChatMessages(prev => [...prev, aiErrorMessage]);
        }
      }
    } catch (error) {
      // Handle any unhandled errors in the entire message flow
      console.error("Unhandled error in message handling:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      // Clean up loading state
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500); // Reset progress after a delay
    }
  };
  
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
    setIsLoading(true);
    setProgress(20);
    
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
      
      setProgress(70);
      
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
        });
        
        if (updatedProject) {
          // Update local state with the generated content
          setLivePreviewHtml(data.emailData.html);
          setProjectData(updatedProject);
          setHasCode(true);
          setHasFirstDraft(true);
          
          // Add success message to chat
          const successMessage: ExtendedChatMessage = {
            id: generateId(),
            content: data.message || "I've created your email based on our discussion!",
            role: 'assistant',
            timestamp: new Date(),
            type: 'success',
          };
          
          setChatMessages(prev => [...prev, successMessage]);
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
      };
      
      setChatMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      // Clean up loading state
      setIsLoading(false);
      setProgress(100);
      setIsCreatingFirstEmail(false);
      setTimeout(() => setProgress(0), 500); // Reset progress after a delay
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
    await handleSendMessage(suggestionValue, selectedMode);
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
      setSelectedMode(newMode);
      
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
   * handleAcceptAll - Accept all pending changes to the email
   * 
   * Calls the API to apply all pending changes to the email,
   * then refreshes the project data to show the updated content.
   */
  const handleAcceptAll = async () => {
    // Ensure we have a project ID
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
    
    // Check if there are any pending changes to accept
    if (pendingChanges.length === 0) {
      toast({ title: 'Info', description: 'No pending changes to accept.' });
      return;
    }

    // Set loading state and progress
    setIsLoading(true);
    setProgress(30);

    try {
      // Call the API to accept all pending changes
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

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to accept changes');
      }

      // Show success message
      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message || 'All pending changes accepted.',
      });

      // Refresh project data to show updated content
      await fetchAndSetProject(actualProjectId);

    } catch (error) {
      // Handle errors during the accept operation
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error accepting all changes:', error);
      toast({
        title: 'Error Accepting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      // Clean up loading state
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500); // Reset progress after a delay
    }
  };
  
  /**
   * handleRejectAll - Reject all pending changes to the email
   * 
   * Calls the API to discard all pending changes to the email,
   * then refreshes the project data to restore the original content.
   */
  const handleRejectAll = async () => {
    // Ensure we have a project ID
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'Project context is missing.', variant: 'destructive' });
      return;
    }
    
    // Check if there are any pending changes to reject
    if (pendingChanges.length === 0) {
      toast({ title: 'Info', description: 'No pending changes to reject.' });
      return;
    }

    // Set loading state and progress
    setIsLoading(true);
    setProgress(30);

    try {
      // Call the API to reject all pending changes
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

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to reject changes');
      }

      // Show success message
      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message || 'All pending changes rejected.',
      });

      // Refresh project data to restore original content
      await fetchAndSetProject(actualProjectId);

    } catch (error) {
      // Handle errors during the reject operation
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error rejecting all changes:', error);
      toast({
        title: 'Error Rejecting Changes',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      // Clean up loading state
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500); // Reset progress after a delay
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
  const updateElementProperty = (elementId: string, propertyPath: string, value: any) => {
    console.log(`[Editor|updateElementProperty] Attempting to update element ${elementId}, path ${propertyPath} with value:`, value);
    
    // Update the project data with the modified element
    setProjectData(currentData => {
      // Ensure we have semantic data to work with
      if (!currentData?.semantic_email_v2) {
        console.error("[Editor|updateElementProperty] Error: semantic_email_v2 is missing.");
        return currentData;
      }

      // Deep copy to avoid mutation issues with nested state
      const newSemanticV2: EmailTemplateV2 = JSON.parse(JSON.stringify(currentData.semantic_email_v2));

      let elementFound = false;

      /**
       * Recursive function to find the element and update its property
       * 
       * @param elements - Array of elements to search through
       * @returns Whether the element was found and updated
       */
      const findAndUpdateElement = (elements: any[]) => { 
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (element.id === elementId) {
            // Found the element - access its properties
            const currentProperties = element.properties || {}; 
            console.log(`[Editor|updateElementProperty] Found element ${elementId}. Current properties:`, 
              JSON.parse(JSON.stringify(currentProperties)));
            
            try {
              // Navigate the property path and set the value
              const pathParts = propertyPath.split('.');
              let currentLevel: any = currentProperties; 
            
              // Navigate to the parent object of the property to update
              for (let j = 0; j < pathParts.length - 1; j++) {
                const part = pathParts[j];
                // Create intermediate objects if they don't exist
                if (currentLevel[part] === undefined || currentLevel[part] === null) {
                  console.log(`[Editor|updateElementProperty] Creating intermediate object for path part: ${part}`);
                  currentLevel[part] = {}; 
                }
                currentLevel = currentLevel[part];
                
                // Ensure we're working with an object
                if (typeof currentLevel !== 'object' || currentLevel === null) {
                    console.error(`[Editor|updateElementProperty] Error: Path part ${part} is not an object.`);
                    throw new Error(`Invalid path structure at ${part}`);
                }
              }

              // Set the final property value
              const finalPart = pathParts[pathParts.length - 1];
              console.log(`[Editor|updateElementProperty] Setting final property: ${finalPart} =`, value);
              currentLevel[finalPart] = value;
              
              // Assign the modified properties back to the element
              element.properties = currentProperties; 
              
              elementFound = true;
              console.log(`[Editor|updateElementProperty] Element ${elementId} updated. New properties:`, 
                JSON.parse(JSON.stringify(element.properties)));
              return true; // Element found and updated in this array
            } catch (error) {
              console.error(`[Editor|updateElementProperty] Error updating property ${propertyPath} for element ${elementId}:`, error);
              return true; // Even though there was an error, we found the element
            }
          }
          // Future: Add recursion for nested elements (like inside containers/boxes) if needed
        }
        return false; // Element not found in this array
      };

      // Iterate through sections and call the recursive function
      for (const section of newSemanticV2.sections) {
        if (findAndUpdateElement(section.elements)) { 
          break; // Stop searching sections once found
        }
      }

      // Handle case where element wasn't found
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
    setEditingPlaceholder(context);

    // Handle different placeholder types
    if (context.type === 'image') {
      // For images, a file input should be triggered (handled by parent component)
      console.log("[Editor] Image placeholder activated, file selection should be triggered")
    } else if (context.type === 'link') {
      // For links, open the link editing modal
      console.log("[Editor] Opening link modal.");
      setLinkInputValue('https://'); // Pre-fill with https://
      setIsLinkModalOpen(true);
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
    if (!event.target.files || event.target.files.length === 0 || !editingPlaceholder) {
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
    setIsLoading(true);
    
    try {
      console.log(`[Editor|handleFileSelected] Selected image: ${file.name} (${Math.round(file.size / 1024)}KB)`);
      
      // Create a unique storage path based on project ID and filename
      const filePath = `projects/${actualProjectId}/images/${generateId()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('email-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      
      if (error) {
        throw error;
      }
      
      if (!data?.path) {
        throw new Error('Upload succeeded but file path is missing');
      }
      
      // Get public URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from('email-assets')
        .getPublicUrl(data.path);
        
      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      const imageUrl = urlData.publicUrl;
      console.log(`[Editor|handleFileSelected] Image uploaded successfully: ${imageUrl}`);
      
      // Update the element property with the image URL
      const { elementId, path } = editingPlaceholder;
      updateElementProperty(elementId, path, imageUrl);
      
      // Save updated semantic data to database
      if (projectData?.semantic_email_v2 && actualProjectId) {
        await updateProject(actualProjectId, { 
          semantic_email_v2: projectData.semantic_email_v2 
        });
      }
      
      // Show success message
      toast({ title: 'Image Updated', description: 'Your image has been uploaded and added to the email.' });
      
      // Reset placeholder state
      setEditingPlaceholder(null);
      
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
      setIsLoading(false);
      
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
  const handleEditorError = useCallback((error: unknown, context: string, severity: 'warning' | 'error' = 'error') => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log to console with appropriate severity
    console[severity === 'error' ? 'error' : 'warn'](`[Editor|${context}] ${errorMessage}`, error);
    
    // Show toast notification for errors (but not warnings)
    if (severity === 'error') {
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    return errorMessage;
  }, [toast]);
  
  /**
   * handleRefreshProject - Reload the project data from the server
   * 
   * Useful for getting the latest data after external changes or
   * to recover from inconsistent state.
   */
  const handleRefreshProject = useCallback(async () => {
    // Ensure we have a project ID
    if (!actualProjectId) {
      toast({ title: 'Error', description: 'No project to refresh', variant: 'destructive' });
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    setProgress(30);
    
    try {
      // Fetch fresh project data
      await fetchAndSetProject(actualProjectId);
      toast({ title: 'Success', description: 'Project refreshed' });
    } catch (error) {
      // Handle any errors during refresh
      handleEditorError(error, 'handleRefreshProject');
    } finally {
      // Clean up loading state
      setIsLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [actualProjectId, fetchAndSetProject, handleEditorError, toast]);
  
  /**
   * handleSaveLink - Save a link URL for a link placeholder
   * 
   * Validates and saves the link URL for a link placeholder element,
   * updating both the UI and persisting to the database.
   */
  const handleSaveLink = () => {
    // Ensure we have an active link placeholder
    if (!editingPlaceholder || editingPlaceholder.type !== 'link') return;

    const { elementId, path } = editingPlaceholder;
    const url = linkInputValue.trim();

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
    setIsLinkModalOpen(false);
    setEditingPlaceholder(null);
    setLinkInputValue('');
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
      setIsLoading(true);
      setProjectTitle(newTitle);
      
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
        setProjectTitle(projectData.name);
      }
    } finally {
      // Clean up loading state
      setIsLoading(false);
    }
  };
  
  // Value to be provided by the context
  const contextValue = {
    // Project data
    projectData,
    setProjectData,
    actualProjectId,
    projectTitle,
    setProjectTitle,
    isEditingTitle,
    setIsEditingTitle,
    
    // UI States
    isLoading,
    isLoadingProject,
    hasCode,
    progress,
    
    // Content & Preview
    livePreviewHtml,
    isDarkMode,
    setIsDarkMode,
    isMobileView,
    setIsMobileView,
    currentUsername,
    initialInputValue,
    setInitialInputValue,
    
    // Chat & Messages
    chatMessages,
    setChatMessages,
    pendingChanges,
    setPendingChanges,
    selectedMode,
    setSelectedMode,
    
    // Placeholder editing
    editingPlaceholder,
    setEditingPlaceholder,
    handlePlaceholderActivation,
    isLinkModalOpen,
    setIsLinkModalOpen,
    linkInputValue, 
    setLinkInputValue,
    handleSaveLink,
    handleFileSelected,
    updateElementProperty,
    
    // Clarification
    isClarifying,
    hasFirstDraft,
    isCreatingFirstEmail,
    setIsCreatingFirstEmail,
    clarificationConversation,
    setClarificationConversation,
    clarificationContext,
    
    // Core Actions
    handleSendMessage,
    handleTitleChange,
    handleAcceptAll,
    handleRejectAll,
    handleSuggestionSelected,
    handleNavigateToSendPage,
    handleModeChange,
    
    // Utils
    fetchAndSetProject,
    htmlGenerator,
    handleRefreshProject,
    handleFinalEmailGeneration,
    handleEditorError
  };
  
  return (
    <EditorContext.Provider value={contextValue as EditorContextType}>
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
