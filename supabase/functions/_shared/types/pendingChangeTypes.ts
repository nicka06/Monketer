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
  