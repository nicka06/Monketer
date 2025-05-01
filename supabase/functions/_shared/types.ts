// supabase/functions/_shared/types.ts

// Define types for the email structure
export type EmailTemplate = {
  id: string;
  version: number;
  sections: EmailSection[];
  styles?: Record<string, any>; // Global styles if needed
  // Allow other potential project-level fields if necessary
  [key: string]: any;
};

export type EmailSection = {
  id: string; // Unique ID for the section
  elements: EmailElement[];
  styles?: Record<string, any>; // Styles specific to this section
};

export type EmailElement = {
  id: string; // Unique ID for the element (crucial for diffing and highlighting)
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | string; // Add more types as needed
  content?: string; // Text content, image URL, button text, etc.
  styles?: Record<string, any>; // Styles specific to this element
};

// Type for the input to the pending_changes table
export type PendingChangeInput = {
  project_id: string; // Foreign key to projects table
  element_id: string; // ID of the element being changed (matches EmailElement.id)
  change_type: 'add' | 'edit' | 'delete';
  old_content: any | null; // Store old element/style/content state as JSON
  new_content: any | null; // Store new element/style/content state as JSON
  status: 'pending' | 'accepted' | 'rejected'; // Status of the change
};

// Type representing a record from the pending_changes table
export interface PendingChange extends PendingChangeInput {
  id: string; // Primary key from the database
  created_at: string; // Timestamp from the database
  updated_at?: string; // Optional timestamp from the database
}

// Type for interaction modes in generate-email-changes
export type InteractionMode = 'ask' | 'edit' | 'major';

// Type for email versions table (simplified example)
export type EmailVersion = {
    id: string; // Or maybe auto-incrementing primary key
    project_id: string;
    version_number: number;
    semantic_snapshot: EmailTemplate; // Store the accepted semantic state
    created_at: string; // Timestamp
}

// Common CORS Headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 