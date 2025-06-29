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
 * Defines the possible actions for a granular change.
 * - `element_add`: A new element is added.
 * - `element_edit`: An existing element is modified.
 * - `element_delete`: An existing element is removed.
 * - `section_add`: A new section is added.
 * - `section_delete`: An existing section is removed.
 * - `section_edit`: An existing section's properties (not its elements) are modified.
 * - `row_add`: A new row is added.
 * - `row_delete`: An existing row is removed.
 * - `column_add`: A new column is added.
 * - `column_delete`: An existing column is removed.
 */
export type ChangeTypeAction = 
  | 'element_add' 
  | 'element_edit' 
  | 'element_delete' 
  | 'section_add' 
  | 'section_delete' 
  | 'section_edit'
  | 'row_add'
  | 'row_delete'
  | 'column_add'
  | 'column_delete';
  
/**
 * Defines the possible statuses for a granular pending change.
 */
export type ChangeStatusAction = 'pending' | 'accepted' | 'rejected';

/**
 * Represents a single granular pending change record from the database.
 * This structure mirrors the `pending_changes` table schema.
 */
export interface GranularPendingChange {
  /** Primary Key for the pending change entry (UUID) */
  id: string;
  
  /** Foreign Key to the projects table (UUID) */
  project_id: string;

  /** Identifier to group all granular changes from a single AI suggestion batch (UUID) */
  batch_id: string;

  /** Type of change performed */
  change_type: ChangeTypeAction;

  /** ID of the element or section being affected */
  target_id: string;

  /** For element changes, the ID of their parent section; for section_add, potential parent section. Nullable. */
  target_parent_id?: string | null;

  /** JSONB storing the full element/section object before the change (for edit/delete). Nullable. */
  old_content?: any | null; // Consider using a more specific type if possible, e.g., EmailElement | EmailSection

  /** JSONB storing the full element/section object after the change (for add/edit). Nullable. */
  new_content?: any | null; // Consider using a more specific type if possible, e.g., EmailElement | EmailSection

  /** Lifecycle status of this specific pending change */
  status: ChangeStatusAction;

  /** Optional: Defines the sequence if applying changes within a batch matters. Nullable. */
  order_of_application?: number | null;

  /** Optional: Explanation from AI for why this change was suggested. Nullable. */
  ai_rationale?: string | null;

  /** Timestamp of when the pending change was created (ISO string) */
  created_at: string;
  
  /** Timestamp of when the pending change was last updated (ISO string) */
  updated_at: string;
}

/**
 * Represents the input data structure for creating a new granular pending change.
 * Typically, `id`, `created_at`, and `updated_at` are excluded as they are set by the database.
 * Status might also be defaulted by the DB.
 */
export type GranularPendingChangeInput = Omit<GranularPendingChange, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: ChangeStatusAction; // Status is optional here as it defaults to 'pending' in DB
};
  