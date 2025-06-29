import { EmailElement } from './elements';

/**
 * Defines the responsive behavior of a column.
 * Spans are based on a 12-column grid system.
 */
export interface ColumnSpans {
  desktop: number; // How many of the 12 columns it should span on desktop.
  mobile: number;  // How many of the 12 columns it should span on mobile.
}

/**
 * Defines the styling properties applicable to a single column.
 */
export interface ColumnStyles {
  gridSpan: number; // How many of the 12 columns it should span.
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  border?: {
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
  // Add other column-specific styles as needed
}

/**
 * Represents a single column within a row.
 * A column contains the actual content elements and defines their layout behavior.
 */
export interface Column {
  id: string;
  styles: ColumnStyles;
  elements: EmailElement[];
} 