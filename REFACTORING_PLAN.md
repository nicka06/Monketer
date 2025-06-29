# Refactoring Plan: Decomposing EditorContext

This document outlines the step-by-step process for refactoring the monolithic `EditorContext.tsx` into a collection of smaller, more manageable, and focused context providers.

**Motivation:** `EditorContext.tsx` has become a "God Object," managing too many unrelated concerns (project state, AI chat, UI state, pending changes, manual editing). This makes the code difficult to understand, modify, test, and debug. The current issues with applying edits to this file highlight the urgent need for this refactoring.

**Goal:** Decompose `EditorContext` into a set of providers, each with a single, clear responsibility. This will improve code quality, reduce component re-renders, and make future development easier.

---

## Proposed Architecture

We will replace the single `EditorProvider` with a nested structure of five new providers:

1.  **`ProjectProvider`**: Manages loading, saving, and holding the core project data (`projectData`, `semantic_email_v2`). This is the foundational provider.
2.  **`UIStateProvider`**: Manages simple, global UI state like loading indicators, progress bars, and view modes (e.g., dark/mobile).
3.  **`AIProvider`**: Handles all AI chat interactions, including the clarification flow and calling backend AI services.
4.  **`ChangesProvider`**: Manages the state of `pendingChanges` and the logic for accepting/rejecting them.
5.  **`ManualEditProvider`**: Manages the state related to the manual edit panel, including element selection and property updates.

These providers will be consumed by components via corresponding custom hooks: `useProject()`, `useUIState()`, `useAI()`, `useChanges()`, and `useManualEdit()`.

---

## Detailed Implementation Plan

### Phase 1: Scaffolding and Setup

1.  **Create New Directory:**
    *   Create a new directory to house the new provider files: `src/features/contexts/providers/`.

2.  **Create Provider Files:**
    *   In the new directory, create the following empty files. Each will contain the context definition, the provider component, and the custom hook.
        *   `src/features/contexts/providers/ProjectProvider.tsx`
        *   `src/features/contexts/providers/UIStateProvider.tsx`
        *   `src/features/contexts/providers/AIProvider.tsx`
        *   `src/features/contexts/providers/ChangesProvider.tsx`
        *   `src/features/contexts/providers/ManualEditProvider.tsx`

3.  **Update Component Tree:**
    *   Locate where `EditorProvider` is used (likely in `src/pages/Editor.tsx` or a similar layout component).
    *   Wrap the children with the new providers. The order is important, as some providers will be dependent on others. `ProjectProvider` should be near the top.

    ```tsx
    // Example in Editor.tsx
    <ProjectProvider>
      <UIStateProvider>
        <AIProvider>
          <ChangesProvider>
            <ManualEditProvider>
              {/* The rest of the editor components */}
            </ManualEditProvider>
          </ChangesProvider>
        </AIProvider>
      </UIStateProvider>
    </ProjectProvider>
    ```

### Phase 2: Logic Migration (One Provider at a Time)

We will migrate logic from `EditorContext.tsx` to the new providers incrementally.

#### Step 2.1: `ProjectProvider`

*   **State to Move:** `projectData`, `actualProjectId`, `projectTitle`, `isEditingTitle`, `hasCode`.
*   **Functions to Move:**
    *   `fetchAndSetProject`
    *   `handleTitleChange`
    *   The main `useEffect` hook that initializes the project based on URL parameters.
*   **Dependencies:** `useParams`, `useNavigate`, `useToast`, `useAuth`, and project service functions (`getProject`, `createProject`, etc.).
*   **Exposed Value:** The context will provide the project state and the functions to manipulate it.

#### Step 2.2: `UIStateProvider`

*   **State to Move:** `isLoading`, `isLoadingProject`, `progress`, `isDarkMode`, `isMobileView`, `selectedMode`.
*   **Functions to Move:** The `set` functions for each state variable.
*   **Dependencies:** None (purely `useState`).
*   **Exposed Value:** UI state variables and their setters.

#### Step 2.3: `ManualEditProvider`

*   **State to Move:** `selectedManualEditElementId`.
*   **Functions to Move:**
    *   `selectElementForManualEdit`
    *   `updateElementProperty`
    *   `commitManualEditsToDatabase`
*   **Dependencies:** `useProject()` to get and update the `semantic_email_v2` object.
*   **Exposed Value:** Selected element ID and functions for manual editing.

#### Step 2.4: `AIProvider`

*   **State to Move:** `chatMessages`, `isClarifying`, `hasFirstDraft`, `isCreatingFirstEmail`, `clarificationConversation`, `clarificationContext`, `imageUploadRequested`.
*   **Functions to Move:**
    *   `handleSendMessage` (the largest function)
    *   `handleFinalEmailGeneration`
    *   `handleSuggestionSelected`
*   **Dependencies:** `useProject()`, `useUIState()`, `useAuth`, `supabase`. It will call project services and Supabase functions.
*   **Exposed Value:** Chat history, clarification state, and the `handleSendMessage` function.

#### Step 2.5: `ChangesProvider`

*   **State to Move:** `pendingChanges`, `currentBatchId`.
*   **Functions to Move:**
    *   `handleAcceptCurrentBatch`
    *   `handleRejectCurrentBatch`
    *   `handleAcceptOneChange`
    *   `handleRejectOneChange`
*   **Dependencies:** `useProject()`, `useUIState()`, `supabase`. It will call the `manage-pending-changes` function.
*   **Exposed Value:** Pending changes list and functions to manage them.

### Phase 3: Component Refactoring

After the logic has been migrated into the new providers, we will refactor all components that currently consume `useEditor()`.

1.  **Identify Consumer Components:**
    *   Search the codebase for all instances of `useEditor()`. Key components will include: `ChatInterface`, `PendingChangesBar`, `ManualEditPanel`, `EditorHeader`, `EmailPreviewPanel`, etc.

2.  **Replace `useEditor` Hook:**
    *   For each component, replace the `const { ... } = useEditor()` call with the specific hooks required.
    *   **Example:**
        *   In `PendingChangesBar.tsx`:
            ```diff
            - const { pendingChanges, handleAcceptCurrentBatch, ... } = useEditor();
            + const { pendingChanges, handleAcceptCurrentBatch, ... } = useChanges();
            + const { isLoading } = useUIState();
            ```
        *   In `ChatInterface.tsx`:
             ```diff
            - const { chatMessages, handleSendMessage, ... } = useEditor();
            + const { chatMessages, handleSendMessage, ... } = useAI();
            ```

### Phase 4: Cleanup

1.  **Remove Obsolete Code:**
    *   Now that the file is smaller and more manageable, attempt the deletion of the obsolete "placeholder" system from the original `EditorContext.tsx` file one last time.

2.  **Deprecate and Delete:**
    *   Once all logic and state have been successfully migrated out of `EditorContext.tsx`, and all components have been updated, the file can be deleted.

3.  **Final Review:**
    *   Perform a final review of the changes to ensure there are no redundant state variables or incorrect dependencies between the new providers.
    *   Thoroughly test the application to confirm all functionality works as expected.

---

This plan provides a clear roadmap to a more stable and maintainable architecture for the editor. 