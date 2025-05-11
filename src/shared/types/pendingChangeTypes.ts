/**
 * PENDING CHANGE TYPES
 * 
 * This module defines types for handling pending changes to email templates.
 * Pending changes represent modifications that have been proposed but not yet
 * committed to the main template structure.
 * 
 * KEY CONCEPTS:
 * - Change types (add/edit/delete) represent different modification operations
 * - Status values (pending/accepted/rejected) track the approval workflow
 * - Content fields store the state before and after the proposed change
 */

/**
 * Represents the input data structure for creating a new pending change.
 * This is used when proposing a new modification to an email template.
 */
export type PendingChangeInput = {
  /** Reference to the associated project */
  project_id: string;
  
  /** ID of the specific element being modified (corresponds to EmailElement.id) */
  element_id: string;
  
  /** The type of modification being performed */
  change_type: 'add' | 'edit' | 'delete';
  
  /** The original state before the change (null for additions) */
  old_content: any | null;
  
  /** The new state after the change (null for deletions) */
  new_content: any | null;
  
  /** The current status in the approval workflow */
  status: 'pending' | 'accepted' | 'rejected';
};

/**
 * Represents a complete pending change record with metadata.
 * Extends the input type with additional system-managed fields.
 */
export interface PendingChange extends PendingChangeInput {
  /** Unique identifier for the pending change */
  id: string;
  
  /** ISO timestamp when this change was first created */
  created_at: string;
  
  /** ISO timestamp when this change was last updated */
  updated_at?: string;
}
  