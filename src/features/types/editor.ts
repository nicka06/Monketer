import type { EmailTemplateV2Type as EmailTemplateV2 } from '../../shared/types/validators';
import { GranularPendingChange as BackendGranularPendingChange } from '../../shared/types/pendingChangeTypes.ts';

// Types for email content and pending changes

export interface EmailElement {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer';
  content: string;
  styles: Record<string, string>;
  pending?: boolean;
  pendingType?: 'add' | 'edit' | 'delete';
}

export interface EmailSection {
  id: string;
  elements: EmailElement[];
  styles: Record<string, string>;
  pending?: boolean;
  pendingType?: 'add' | 'edit' | 'delete';
}

export interface EmailTemplate {
  id: string;
  name: string;
  sections: EmailSection[];
  styles: Record<string, string>;
  version: number;
}

// New PendingChange type for the frontend, directly using or extending the backend type
export type PendingChange = BackendGranularPendingChange;

// Base ChatMessage type (ensure this aligns with your actual base if it comes from DB types elsewhere)
// If Database['public']['Tables']['chat_messages']['Row'] was correct, use that.
// For now, using the simpler definition from your current editor.ts to avoid breaking it further.
export interface ChatMessage {
  id: string;
  project_id: string; // project_id is present in the base ChatMessage
  content: string;
  timestamp: Date;
  role?: 'user' | 'assistant'; // role is often part of the base message
  is_error?: boolean; // Changed from isError to is_error to match DB and payload
  // Fields for saving to database, aligning with the schema:
  user_id?: string; 
  is_clarifying_chat?: boolean;
  message_type?: string; // e.g., 'clarification', 'user_prompt', 'ai_response', 'error'
}

// Extended chat message interface for UI purposes
export interface ExtendedChatMessage extends Omit<ChatMessage, 'project_id'> {
  // id, content, timestamp, is_error can be inherited if Omit doesn't remove them due to ChatMessage definition
  // Explicitly defining role here to ensure it overrides any optionality from base ChatMessage for UI needs.
  role: 'user' | 'assistant'; 
  type?: 'question' | 'edit_request' | 'clarification' | 'success' | 'error' | 'answer' | 'edit_response';
  suggestions?: string[];
  // Ensure all properties used by ExtendedChatMessage in EditorContext.tsx are covered.
  // If 'id', 'content', 'timestamp' are not implicitly part of Omit result, add them.
  id: string; // Explicitly ensure id is here
  content: string; // Explicitly ensure content is here
  timestamp: Date; // Explicitly ensure timestamp is here
  is_error?: boolean; // Explicitly add is_error here to match ChatMessage for consistency
}

// Simplified message structure for the AI clarification flow
export interface SimpleClarificationMessage {
  role: 'user' | 'assistant';
  content: string;
  // If SimpleClarificationMessage needs an id for key props in React, add it:
  // id?: string; 
}

export interface Project {
  id: string;
  name: string;
  lastEditedAt: Date;
  createdAt: Date;
  isArchived: boolean;
  current_html: string | null;
  semantic_email: EmailTemplate | null;
  semantic_email_v2: EmailTemplateV2 | null;
  version: number;
  current_clarification_context?: any; // For storing ongoing AI clarification state
}

// Props for EmailPreview component
export interface EmailPreviewProps {
  currentHtml: string | null;
  pendingChanges: PendingChange[]; // This will now use the new PendingChange type (GranularPendingChange)
  previewMode: 'light' | 'dark';
  previewDevice: 'desktop' | 'mobile';
  semanticTemplate: EmailTemplateV2 | null;
  onPlaceholderActivate: (context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => void;
}
