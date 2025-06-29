import { Row } from './row';

/**
 * Defines the styling for a section, which acts as a full-width container.
 */
export interface EmailSectionStyles {
  backgroundColor?: string;
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * An email section, which is a full-width container for rows of content.
 */
export interface EmailSection {
  id: string;
  styles: EmailSectionStyles;
  rows: Row[];
}