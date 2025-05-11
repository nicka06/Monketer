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
  elementId: string;
  changeType: 'add' | 'edit' | 'delete';
  oldContent: any;
  newContent: any;
  status: 'pending' | 'applied' | 'rejected';
}

export interface ChatMessage {
  id: string;
  project_id: string;
  content: string;
  timestamp: Date;
  role?: 'user' | 'assistant';
  isError?: boolean;
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
