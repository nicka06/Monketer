/**
 * EDITOR TYPES
 * 
 * This module contains type definitions for the editor interface.
 * These types support the chat and collaboration features of the email editor.
 */

import { EmailTemplate } from './template';
import { GranularPendingChange } from './pendingChangeTypes';

/**
 * Defines the unique path to a specific element within the email template.
 * This is used for targeting elements for manual edits and other operations.
 */
export interface ElementPath {
  sectionId: string;
  rowId: string;
  columnId: string;
  elementId: string;
}

/**
 * Represents a granular change waiting for user approval.
 * This is a direct alias of the backend type.
 */
export type PendingChange = GranularPendingChange;

/**
 * Represents a single message in the chat interface.
 * Messages can be from the user, the AI assistant, or system notifications.
 * They are typically displayed in a chronological conversation view.
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  
  /** Reference to the associated project */
  project_id: string;
  
  /** Sender of the message */
  role: 'user' | 'assistant' | 'system';
  
  /** Message text content, may contain markdown */
  content: string;
  
  /** 
   * When the message was sent
   * Represented as ISO string for serialization, Date for client-side operations
   */
  timestamp: string | Date;
  
  /** Flag indicating if this message represents an error state */
  isError?: boolean;
}

/**
 * Defines the complete data structure for a project within the frontend.
 * This is the canonical interface used by all components and contexts.
 */
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  lastEditedAt: Date;
  current_html: string | null;
  version: number;
  has_first_draft: boolean;
  is_generating: boolean;
  email_content_structured: EmailTemplate | null;
  chat_messages: ChatMessage[];
  pending_changes: PendingChange[];
  username?: string;
}

/**
 * Defines the props for the EmailPreview component.
 */
export interface EmailPreviewProps {
  currentHtml: string | null;
  pendingChanges: PendingChange[];
  previewMode: 'light' | 'dark';
  previewDevice: 'desktop' | 'mobile';
  semanticTemplate: EmailTemplate | null;
}

// You can also share other editor-related types here if needed by functions
// For example, if Project or PendingChange types were needed by Edge Functions. 