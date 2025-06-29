import { Column } from './column';

/**
 * Defines the styling properties applicable to an entire row.
 */
export interface RowStyles {
  backgroundColor?: string;
  // A row might not have padding itself, as that's usually handled by columns or sections.
  // Add other row-specific styles if needed, e.g., vertical-align.
}

/**
 * Represents a single row within a section.
 * A row is a container for one or more columns, and its columns' desktop spans
 * must add up to 12.
 */
export interface Row {
  id: string;
  styles: RowStyles;
  columns: Column[];
} 