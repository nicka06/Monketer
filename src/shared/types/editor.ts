/**
 * EDITOR TYPES
 * 
 * This module contains type definitions for the editor interface.
 * These types support the chat and collaboration features of the email editor.
 */

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

// You can also share other editor-related types here if needed by functions
// For example, if Project or PendingChange types were needed by Edge Functions. 