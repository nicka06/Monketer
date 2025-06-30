import { type EmailElement, type EmailElementLayout } from './elements.ts';

/**
 * Represents a single column within a Row.
 * A column holds the actual content elements that make up the email's content,
 * such as text, images, and buttons.
 *
 * The width property is based on a 12-column grid system, allowing for flexible layouts.
 */
export interface ColumnElement {
    id: string;
    width: number; // Value from 1-12, representing its share of the row.
    elements: EmailElement[];
    layout?: EmailElementLayout;
} 