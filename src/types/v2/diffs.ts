import { EmailElement, EmailSection, EmailTemplate, ElementType } from './'; // Assuming index.ts exports all types

export interface PropertyChange {
  oldValue: any;
  newValue: any;
}

export interface ElementDiff {
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  elementId: string;
  elementType: ElementType;
  /** Detailed changes for modified elements */
  changes?: {
    content?: PropertyChange;
    layout?: Record<string, PropertyChange | Record<string, PropertyChange>>; // Handles nested layout like padding
    properties?: Record<string, PropertyChange | Record<string, PropertyChange>>; // Handles nested properties
  };
  /** The original element if status is 'modified' or 'removed' */
  oldValue?: EmailElement;
  /** The new element if status is 'modified' or 'added' */
  newValue?: EmailElement;
  /** If the element moved position within its section */
  moved?: { fromIndex: number; toIndex: number };
}

export interface SectionDiff {
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  sectionId: string;
  /** Diff results for elements within this section */
  elementDiffs: ElementDiff[];
   /** Detailed changes to section styles */
  styleChanges?: Record<string, PropertyChange | Record<string, PropertyChange>>;
  /** The original section if status is 'modified' or 'removed' */
  oldValue?: EmailSection;
  /** The new section if status is 'modified' or 'added' */
  newValue?: EmailSection;
  /** If the section moved position within the template */
  moved?: { fromIndex: number; toIndex: number };
}

export interface TemplateDiffResult {
  /** Overall flag indicating if any significant change occurred */
  hasChanges: boolean;
  /** Change details for the template name */
  nameChange?: PropertyChange;
  /** Change details for global styles */
  globalStyleChanges?: Record<string, PropertyChange | Record<string, PropertyChange>>;
  /** Diff results for each section */
  sectionDiffs: SectionDiff[];
} 