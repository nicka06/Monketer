import { useState } from 'react';
import type { Project, ExtendedChatMessage, PendingChange, SimpleClarificationMessage } from '@/features/types/editor';
import type { InteractionMode } from './types';

/**
 * Custom hook to manage all the state for the EditorContext.
 * This centralizes state initialization and makes the main provider cleaner.
 */
export const useEditorState = () => {
  // Project state
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Document');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  
  // Content state
  const [chatMessages, setChatMessages] = useState<ExtendedChatMessage[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasCode, setHasCode] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [initialInputValue, setInitialInputValue] = useState<string | null>(null);
  
  // Preview controls
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Editor mode
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('major');
  
  // Placeholder editing
  const [editingPlaceholder, setEditingPlaceholder] = useState<{elementId: string, path: string, type: 'image' | 'link' | 'text'} | null>(null);
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);
  
  // Link modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');

  // Clarification flow
  const [clarificationConversation, setClarificationConversation] = useState<SimpleClarificationMessage[]>([]);
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [clarificationContext, setClarificationContext] = useState<any>(null);
  const [hasFirstDraft, setHasFirstDraft] = useState<boolean>(false);
  const [isCreatingFirstEmail, setIsCreatingFirstEmail] = useState<boolean>(false);
  const [imageUploadRequested, setImageUploadRequested] = useState(0);

  // Manual Editing
  const [selectedManualEditElementId, setSelectedManualEditElementId] = useState<string | null>(null);

  return {
    projectData, setProjectData,
    actualProjectId, setActualProjectId,
    projectTitle, setProjectTitle,
    isEditingTitle, setIsEditingTitle,
    currentBatchId, setCurrentBatchId,
    chatMessages, setChatMessages,
    pendingChanges, setPendingChanges,
    isLoading, setIsLoading,
    isLoadingProject, setIsLoadingProject,
    progress, setProgress,
    hasCode, setHasCode,
    currentUsername, setCurrentUsername,
    initialInputValue, setInitialInputValue,
    isDarkMode, setIsDarkMode,
    isMobileView, setIsMobileView,
    selectedMode, setSelectedMode,
    editingPlaceholder, setEditingPlaceholder,
    livePreviewHtml, setLivePreviewHtml,
    isLinkModalOpen, setIsLinkModalOpen,
    linkInputValue, setLinkInputValue,
    clarificationConversation, setClarificationConversation,
    isClarifying, setIsClarifying,
    clarificationContext, setClarificationContext,
    hasFirstDraft, setHasFirstDraft,
    isCreatingFirstEmail, setIsCreatingFirstEmail,
    imageUploadRequested, setImageUploadRequested,
    selectedManualEditElementId, setSelectedManualEditElementId,
  };
}; 