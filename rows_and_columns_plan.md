# Plan: Implementing Rows, Columns, and Drag-and-Drop

This document outlines the step-by-step plan to add a row and column-based layout system with drag-and-drop functionality to the email editor.

## The Goal

The primary goal is to empower users to create more complex email layouts by placing content elements (like text and images) side-by-side. This requires a significant refactor of the data model and the editor's UI.

## Core Technical Approach: HTML Email Compatibility

To ensure maximum compatibility across all email clients (including older versions of Outlook), we will use a `<table>`-based structure for layouts.

*   **Row:** A `<table>` element.
*   **Column:** A `<td>` element within the table's single `<tr>`.

This is the most robust and universally supported method for creating multi-column layouts in HTML emails.

## The Plan: A Phased Approach

We will implement this feature in four distinct phases to manage complexity.

---

### Phase 1: Update Core Data Structures

This is the foundational phase where we update the "blueprint" of our email templates.

1.  **Define New Types:**
    *   Create a `RowElement` type. It will contain an ID, type identifier (`'row'`), and an array of `ColumnElement`s.
    *   Create a `ColumnElement` type. It will contain an ID and an array of standard content elements (`ImageElement`, `TextElement`, etc.).
2.  **Refactor `Section` Type:**
    *   Modify the `Section` type. Its `elements` array will now hold `RowElement`s instead of a direct list of content elements.
3.  **Update Type Guards and Validators:**
    *   Update any functions that check element types to be aware of the new `RowElement` and `ColumnElement` types.
4.  **Location of Changes:**
    *   `src/shared/types/elements.ts`
    *   `src/shared/types/sections.ts`
    *   `src/shared/types/validators.ts`

---

### Phase 2: Update Backend HTML Generation

The backend needs to understand the new data structure to generate the correct `<table>`-based HTML.

1.  **Update `htmlGenerator.ts`:**
    *   Modify the `generate` method to iterate through `RowElement`s within a section.
    *   For each `RowElement`, it should generate a `<table>` tag.
    *   Inside the table, it should iterate through the `ColumnElement`s and generate a `<td>` for each.
    *   The existing logic for rendering content elements will be called for the elements inside each column.
2.  **Location of Changes:**
    *   `src/shared/services/htmlGenerator.ts` (Core logic)
    *   `src/backend/functions/_shared/services/htmlGenerator.ts` (If any backend-specific overrides are needed)

---

### Phase 3: Implement Frontend Drag-and-Drop UI

This is the most user-facing part of the implementation.

1.  **Integrate a Drag-and-Drop Library:**
    *   Install and configure a library like `@dnd-kit/core`.
    *   **Ghost Previews:** To create the "ghost" image effect, we will use the `<DragOverlay>` component from `@dnd-kit`. When a drag begins, we will render a styled, semi-transparent copy of the component in the overlay, giving the user a clear preview of what they are moving.
    *   **Drop Indicators:** As the user drags the ghost preview over valid drop zones (columns, between rows), we will provide a visual indicator (like a solid blue line) to show exactly where the element will land upon release.

2.  **Create New UI Components:**
    *   **Row & Column Components:** We'll create React components to render `RowElement` and `ColumnElement`. These components will be configured as "droppable" areas.
    *   **12-Column Grid System:** We will implement a 12-column grid system. A `ColumnElement` will have a `width` property (a number from 1-12).
    *   **Dynamic Resizing:**
        *   We will add a draggable "resizer" handle between columns.
        *   When a user drags this handle, we will calculate the change and translate it into grid units (e.g., dragging 50px might equal 1 grid unit).
        *   The `width` property of the adjacent columns will be updated in real-time, providing immediate visual feedback as the user drags. The change will be committed to the state when the drag is released.

3.  **Update `EmailPreviewPanel.tsx`:**
    *   Wrap elements, columns, and rows in `Draggable` and `Droppable` contexts from the library.
    *   Implement the logic to handle the `onDragEnd` event, which is where we'll update the application's state.
4.  **Update Editor State Management (`EditorContext`):**
    *   Create new actions and reducer logic for:
        *   Adding a new row to a section.
        *   Moving an element from one column to another.
        *   Re-ordering rows within a section.
        *   Re-ordering elements within a column.
5.  **Location of Changes:**
    *   `package.json` (to add new dependencies)
    *   `src/pages/Editor.tsx`
    *   `src/components/editor/EmailPreviewPanel.tsx`
    *   `src/features/contexts/EditorContext/`

---

### Phase 4: Database Persistence and API Updates

Finally, we need to make sure our changes are saved.

1.  **Trigger Save on Drop (Seamless Saving):**
    *   **Optimistic Updates:** All UI changes from drag-and-drop operations (moving elements, resizing columns) will update the local React state immediately for a fluid user experience.
    *   **Asynchronous Save:** After the local state is updated, a background process will call the `saveProject` function to persist the changes to the database. This will not block the UI, allowing the user to continue working.
    *   **Subtle Feedback:** We can add a non-intrusive indicator (e.g., a small "Saving..." then "Saved ✓" message) to provide assurance without interrupting the user's flow.

2.  **Verify Backend Endpoint:**
    *   The `manage-pending-changes` Supabase function should already accept the full `EmailTemplate` object. Because our type changes are in the `shared` directory, the backend will already be aware of the new structure. We will double-check to ensure no validation logic on the server needs to be adjusted.

3.  **Location of Changes:**
    *   `src/features/contexts/EditorContext/useProjectManagement.ts` (or wherever the save logic is called)
    *   `src/backend/functions/manage-pending-changes/index.ts` (for verification)

## Data Structure Visualization

#### Before:
```
EmailTemplate
└── Section[]
    └── Element[] (Image, Text, etc.)
```

#### After:
```
EmailTemplate
└── Section[]
    └── Row[]
        └── Column[]
            └── Element[] (Image, Text, etc.)
``` 