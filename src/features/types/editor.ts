import type { EmailTemplateV2Type as EmailTemplateV2 } from '../../shared/types/validators';

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

export interface PendingChange {
  id: string;
  changeType: 'add' | 'edit' | 'delete';
  oldContent: any;
  newContent: any;
  status: 'pending' | 'applied' | 'rejected';
}

// Base ChatMessage type (ensure this aligns with your actual base if it comes from DB types elsewhere)
// If Database['public']['Tables']['chat_messages']['Row'] was correct, use that.
// For now, using the simpler definition from your current editor.ts to avoid breaking it further.
export interface ChatMessage {
  id: string;
  project_id: string; // project_id is present in the base ChatMessage
  content: string;
  timestamp: Date;
  role?: 'user' | 'assistant'; // role is often part of the base message
  isError?: boolean; // Assuming this might have been on the base or intended for Extended
}

// Extended chat message interface for UI purposes
export interface ExtendedChatMessage extends Omit<ChatMessage, 'project_id'> {
  // id, content, timestamp, isError can be inherited if Omit doesn't remove them due to ChatMessage definition
  // Explicitly defining role here to ensure it overrides any optionality from base ChatMessage for UI needs.
  role: 'user' | 'assistant'; 
  type?: 'question' | 'edit_request' | 'clarification' | 'success' | 'error' | 'answer' | 'edit_response';
  suggestions?: string[];
  // Ensure all properties used by ExtendedChatMessage in EditorContext.tsx are covered.
  // If 'id', 'content', 'timestamp' are not implicitly part of Omit result, add them.
  id: string; // Explicitly ensure id is here
  content: string; // Explicitly ensure content is here
  timestamp: Date; // Explicitly ensure timestamp is here
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
}

// Props for EmailPreview component
export interface EmailPreviewProps {
  currentHtml: string | null;
  pendingChanges: PendingChange[];
  previewMode: 'light' | 'dark';
  previewDevice: 'desktop' | 'mobile';
  semanticTemplate: EmailTemplateV2 | null;
  onPlaceholderActivate: (context: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => void;
}
