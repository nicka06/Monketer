# Sitemap

This sitemap meticulously documents the location, purpose, detailed structure, and usage of EVERY file and directory within the `src` codebase.

## Directory Structure

*   `src/`
    *   `components/`
        *   `EmailPreview.tsx`: Renders the email HTML in an iframe, applies overlays for pending changes, and handles element selection for manual editing.
        *   `ManualEditPanel.tsx`: Provides a UI panel for editing the properties of a selected email element.
        *   `ui/`: Contains ShadCN UI components.
    *   `features/`
        *   `auth/`: Handles user authentication.
        *   `contexts/`
            *   `EditorContext.tsx`: Manages the state and core logic for the email editor, including project data, chat messages, pending changes, and manual editing functions.
        *   `services/`
            *   `htmlGenerator.ts` (`HtmlGeneratorV2`): Extends `HtmlGeneratorCore` to generate HTML for V2 email templates, including `data-element-id` attributes for manual editing.
            *   `projectService.ts`: Contains functions for interacting with the backend API for project-related operations (CRUD, content updates, chat messages, etc.).
    *   `hooks/`
        *   `use-toast.ts`: Custom hook for displaying toast notifications.
    *   `integrations/`
        *   `supabase/`
            *   `client.ts`: Supabase client initialization.
    *   `lib/`
        *   `uuid.ts`: Utility for generating UUIDs.
    *   `pages/`
        *   `Editor.tsx`: The main editor page, integrating `EmailPreview`, `ManualEditPanel`, and other editor components.
        *   `Dashboard.tsx`: User dashboard page.
        *   `SendEmail.tsx`: Page for sending the generated email.
    *   `shared/`
        *   `types/`: Contains shared TypeScript type definitions.
            *   `common.ts`: Common types used across the application.
            *   `elements.ts`: Defines types for individual email elements (`EmailElement`, `EmailElementLayout`, various `ElementProperties`).
            *   `editor.ts`: Types specific to the editor functionality (e.g., `Project`, `PendingChange`).
            *   `index.ts`: Exports types from other files in this directory.
            *   `sections.ts`: Defines types for email sections.
            *   `template.ts`: Defines the overall email template structure (`EmailTemplateV2`).
    *   `core/App.tsx`: Root application component. Handles main routing logic within `AppRoutes`. Manages authentication state via `useAuth` to conditionally render routes (e.g., `ProtectedRoute`) and redirect authenticated users (e.g., from `/login` or `/` to `/dashboard`). Provides `AuthProvider` and `QueryClientProvider` to the application.
    *   `main.tsx`: Main entry point of the application.
*   `supabase/`
    *   `functions/`: Contains Supabase edge functions.
        *   `clarify-user-intent/`: Edge function for clarifying user intent.
        *   `email-generation-final-v2/`: Edge function for final email generation.
        *   `generate-email-changes/`: Edge function for generating email changes.
        *   `manage-pending-changes/`: Edge function for managing pending changes.
        *   `shared/`: Shared code for Supabase functions.
            *   `htmlGeneratorCore.ts`: Core HTML generation logic, used by `HtmlGeneratorV2` and potentially other services.
            *   `types/`: Shared types for Supabase functions, often mirroring or extending types in `src/shared/types`.

## Key Files & Purpose

### Frontend (`src/`)

#### Components (`src/components/`)
*   **`EmailPreview.tsx`**:
    *   **Purpose**: Displays the rendered HTML email within an iframe. It is responsible for showing pending changes as overlays and allowing users to interact with elements (e.g., click to select for manual editing).
    *   **Details**: Uses `useEditor` context. Contains `calculateAndApplyOverlays` to find elements by `data-element-id` and attach `onClick` listeners. Highlights the selected element.
    *   **Usage**: Used within `Editor.tsx` (specifically within `EmailPreviewPanel`).
*   **`ManualEditPanel.tsx`**:
    *   **Purpose**: A UI component that allows users to edit the properties of a currently selected `EmailElement`.
    *   **Details**: Uses `useEditor` context for `selectedElement`, `updateElementProperty`, and `commitManualEditsToDatabase`. Dynamically renders input fields based on `selectedElement.type`. Handles live updates to the preview and saving changes to the database.
    *   **Usage**: Used within `src/pages/Editor.tsx` (`EditorContent` component), conditionally rendered in the right-hand panel when an element is selected for manual editing.

#### Contexts (`src/features/contexts/`)
*   **`EditorContext.tsx`**:
    *   **Purpose**: Central state management for the entire email editor. Holds project data, semantic email structure, chat history, pending changes, selected elements, and functions to modify them.
    *   **Details**: Exports `useEditor` hook. Key states: `projectData`, `semantic_email_v2`, `livePreviewHtml`, `selectedManualEditElementId`. Key functions: `fetchAndSetProject`, `handleSendMessage`, `updateElementProperty`, `commitManualEditsToDatabase`, `selectElementForManualEdit`.
    *   **Usage**: Wraps the main editor UI and is consumed by most editor-related components.

#### Services (`src/features/services/`)
*   **`projectService.ts`**:
    *   **Purpose**: Provides functions to interact with the backend API for all project-related operations.
    *   **Details**: Includes functions like `getProject`, `createProject`, `updateProject`, `updateProjectContent` (crucial for manual editor saves), `saveChatMessage`, `getChatMessages`, `getPendingChanges`.
    *   **Usage**: Used by `EditorContext.tsx` and potentially other parts of the application that need to interact with project data.
*   **`htmlGenerator.ts` (`HtmlGeneratorV2`)**:
    *   **Purpose**: Responsible for generating the final HTML string from the `EmailTemplateV2` semantic structure.
    *   **Details**: Extends `HtmlGeneratorCore`. Adds `data-element-id` attributes to HTML elements for click targeting in `EmailPreview.tsx`.
    *   **Usage**: Used by `EditorContext.tsx` to update `livePreviewHtml` and by `projectService.ts` (`updateProjectContent`) to regenerate HTML before saving to the database.

#### Shared Types (`src/shared/types/`)
*   **`elements.ts`**:
    *   **Purpose**: Defines the TypeScript interfaces and types for all individual email elements (e.g., `HeaderElement`, `TextElement`, `ButtonElement`).
    *   **Details**: Exports `EmailElement` (union type), `EmailElementLayout`, and various specific `ElementProperties` interfaces (e.g., `HeaderElementProperties`, `ButtonElementProperties`). `EmailElementLayout` defines padding, margin, alignment. `backgroundColor` was recently added here.
    *   **Usage**: Used throughout the codebase wherever email element data is handled.
*   **`template.ts`**:
    *   **Purpose**: Defines the top-level structure for an email template (V2).
    *   **Details**: Exports `EmailTemplateV2`, which includes `sections`, `name`, `subject`, etc.
    *   **Usage**: Core data structure for representing an email.

### Backend (Supabase Functions - `supabase/functions/`)

*   **`shared/htmlGeneratorCore.ts`**:
    *   **Purpose**: Provides the base HTML generation logic for individual email elements. This is extended by `HtmlGeneratorV2` in the frontend.
    *   **Details**: Contains methods like `generateElementHtml`, `generateImageElementHtml`, etc. It was modified to ensure `data-element-id` is on the outermost `<td>` of each element.
    *   **Usage**: Consumed by `HtmlGeneratorV2` and potentially by backend services if they need to generate HTML directly (e.g., for versioning or previews).

*(Other files and directories will be documented as they become relevant or are modified.)*

#### Pages (`src/pages/`)
*   **`Editor.tsx`**:
    *   **Purpose**: The main editor page, integrating `EmailPreviewPanel`, `ManualEditPanel` (conditionally), and `ChatInterface`.
    *   **Details**: Uses `EditorProvider`. The `EditorContent` component within handles the overall layout. It conditionally renders `ManualEditPanel` in the right-hand panel when an element is selected (via `selectedManualEditElementId` from `EditorContext`). Otherwise, it shows the `ChatInterface` in that panel.
    *   **Usage**: Main page for all email creation and editing activities.

#### Contexts (`src/features/contexts/`)
*   **`EditorContext.tsx`**:
    *   **Purpose**: Central state management for the entire email editor. Holds project data, semantic email structure, chat history, pending changes, selected elements, and functions to modify them.
    *   **Details**: Exports `useEditor` hook. Key states: `projectData`, `semantic_email_v2`, `livePreviewHtml`, `selectedManualEditElementId`. Key functions: `fetchAndSetProject`, `handleSendMessage`, `updateElementProperty`, `commitManualEditsToDatabase`, `selectElementForManualEdit`.
    *   **Usage**: Wraps the main editor UI and is consumed by most editor-related components.

*(Other files and directories will be documented as they become relevant or are modified.)* 