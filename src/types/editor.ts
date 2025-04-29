
// Types for email content and pending changes

export interface EmailElement {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'divider';
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
  oldContent?: any;
  newContent?: any;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  lastEditedAt: Date;
  createdAt: Date;
  isArchived: boolean;
}
