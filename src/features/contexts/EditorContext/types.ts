/**
 * types.ts
 * 
 * This file contains all the TypeScript type and interface definitions for the 
 * EditorContext. By centralizing them here, we can easily share them across 
 * the different hooks and the main provider file.
 */

import type { Project, PendingChange, ExtendedChatMessage, SimpleClarificationMessage } from '@/features/types/editor';
import type { EmailTemplate as EmailTemplateV2 } from '../../../shared/types';
import type { HtmlGeneratorV2 } from '@/features/services/htmlGenerator';
import type React from 'react';
import { DragEndEvent } from '@dnd-kit/core';

/**
 * The specific types of messages that can exist in the chat.
 */
export type TargetMessageType = ExtendedChatMessage['type'];


/**
 * Defines the available interaction modes for the editor.
 */
export type InteractionMode = 'ask' | 'edit' | 'major';

/**
 * Base API response structure for clarification endpoints.
 */
export interface ClarificationApiResponse {
  message?: string;
  context?: any;
  suggestions?: string[];
}

/**
 * Extended API response for clarification, including email data.
 */
export interface ExtendedClarificationResponse extends ClarificationApiResponse {
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
 * The complete shape of the Editor Context.
 * Specifies all state and functions available to consumers.
 */
export interface EditorContextType {
  // Project data
  projectData: Project | null;
  setProjectData: React.Dispatch<React.SetStateAction<Project | null>>;
  actualProjectId: string | null;
  projectTitle: string;
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  isEditingTitle: boolean;
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>;
  currentBatchId: string | null;
  setCurrentBatchId: React.Dispatch<React.SetStateAction<string | null>>;
  onDragEnd: (event: DragEndEvent) => void;
  
  // UI States
  isLoading: boolean;
  isLoadingProject: boolean;
  hasCode: boolean;
  progress: number;
  
  // Content & Preview
  livePreviewHtml: string | null;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileView: boolean;
  setIsMobileView: React.Dispatch<React.SetStateAction<boolean>>;
  currentUsername: string | null;
  initialInputValue: string | null;
  setInitialInputValue: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Chat & Messages
  chatMessages: ExtendedChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ExtendedChatMessage[]>>;
  pendingChanges: PendingChange[];
  setPendingChanges: React.Dispatch<React.SetStateAction<PendingChange[]>>;
  selectedMode: InteractionMode;
  setSelectedMode: React.Dispatch<React.SetStateAction<InteractionMode>>;
  
  // Placeholder editing
  editingPlaceholder: {elementId: string, path: string, type: 'image' | 'link' | 'text'} | null;
  setEditingPlaceholder: React.Dispatch<React.SetStateAction<{elementId: string, path: string, type: 'image' | 'link' | 'text'} | null>>;
  handlePlaceholderActivation: (context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => void;
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  linkInputValue: string;
  setLinkInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleSaveLink: () => void;
  handleFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateElementProperty: (elementId: string, propertyPath: string, value: any) => EmailTemplateV2 | null;
  
  // Clarification
  isClarifying: boolean;
  hasFirstDraft: boolean;
  isCreatingFirstEmail: boolean;
  setIsCreatingFirstEmail: React.Dispatch<React.SetStateAction<boolean>>;
  clarificationConversation: SimpleClarificationMessage[];
  setClarificationConversation: React.Dispatch<React.SetStateAction<SimpleClarificationMessage[]>>;
  clarificationContext: any;
  imageUploadRequested: number;
  
  // Core Actions
  handleSendMessage: (message: string, mode: InteractionMode) => Promise<void>;
  handleTitleChange: (newTitle: string) => Promise<void>;
  handleAcceptCurrentBatch: () => Promise<void>;
  handleRejectCurrentBatch: () => Promise<void>;
  handleAcceptOneChange: (changeId: string) => Promise<void>;
  handleRejectOneChange: (changeId: string) => Promise<void>;
  handleSuggestionSelected: (suggestionValue: string) => Promise<void>;
  handleNavigateToSendPage: () => Promise<void>;
  handleModeChange: (newMode: InteractionMode) => void;
  
  // Utils
  fetchAndSetProject: (id: string) => Promise<Project | null>;
  htmlGenerator: HtmlGeneratorV2;
  handleRefreshProject: () => Promise<void>;
  handleFinalEmailGeneration: (context: any) => Promise<void>;
  handleEditorError: (error: unknown, context: string, severity?: 'warning' | 'error') => string;

  // Manual Editing
  selectedManualEditElementId: string | null;
  selectElementForManualEdit: (elementId: string | null) => void;
  commitManualEditsToDatabase: () => Promise<void>;
} 