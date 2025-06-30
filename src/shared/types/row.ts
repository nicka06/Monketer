import { type ColumnElement } from './column.ts';
import { type EmailElementLayout } from './elements.ts';

/**
 * Represents a structural row in an email section.
 * A row is a horizontal container that holds one or more columns,
 * allowing elements to be placed side-by-side. This is the foundation
 * for creating multi-column layouts in the email.
 */
export interface RowElement {
    id: string;
    type: 'row';
    columns: ColumnElement[];
    layout?: EmailElementLayout;
}