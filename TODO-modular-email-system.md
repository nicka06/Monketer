# Full System Restructuring: Grid System & Agentic Backend (V2 - Verified)

This document provides a comprehensive, file-by-file plan to fully migrate the application to a new architecture. This plan has been **verified** against the current codebase to ensure accuracy.

The goals are:
1.  **Replace** the legacy `semantic_email` data structure with a robust, grid-based system (`Section -> Row -> Column -> Element`).
2.  **Rearchitect** the backend `generate-email-changes` function into an observable, multi-step "Agentic Model."

---

## Phase 1: Database & Data Model Migration

**Goal:** Align the database schema and core data structures with the new grid model, migrate existing data, and prepare for agent logging.

-   [ ] **CREATE** `supabase/migrations/YYYYMMDDHHMMSS_create_ai_process_logs.sql`
    -   **Purpose:** To create the database table for logging the new AI agent's step-by-step process.
    -   **Action:** Write a SQL migration to create the `ai_process_logs` table.
    -   **Schema:** `id` (PK, uuid), `run_id` (UUID), `project_id` (FK), `step_name` (TEXT), `input_data` (JSONB), `output_data` (JSONB), `status` (TEXT), `error_message` (TEXT, nullable), `created_at` (TIMESTAMPTZ).

-   [ ] **CREATE** `supabase/migrations/YYYYMMDDHHMMSS_migrate_projects_to_grid_model.sql`
    -   **Purpose:** To modify the `projects` table to support the new grid structure and migrate existing data.
    -   **Action:** Write a SQL migration to perform the following:
        1.  **Add new column:** `ALTER TABLE projects ADD COLUMN email_content_structured JSONB;`
        2.  **Data Migration:** Write a SQL `UPDATE` to populate `email_content_structured` by converting data from the `semantic_email` column, wrapping the old linear elements into a default `[Section] -> [Row] -> [Column]` structure.
        3.  **Deprecate old column:** `ALTER TABLE projects RENAME COLUMN semantic_email TO semantic_email_deprecated;`

-   [ ] **EDIT** `src/shared/types/config/elementDefaults.ts`
    -   **Purpose:** To ensure any *newly created* projects or elements conform to the grid model from inception.
    -   **Action:** Modify the `createNewElement` factory function. It should now produce a complete default structure: a `Section` containing a `Row`, which in turn contains a `Column` holding the requested `EmailElement`.

-   [ ] **UPDATE** Supabase generated types.
    -   **Purpose:** To make the new database schema available to the TypeScript code.
    -   **Action:** Run the Supabase CLI command to generate and update local type definitions to reflect the `email_content_structured` column.

---

## Phase 2: Backend Refactoring (The Brains)

**Goal:** Implement the new agentic model and update all backend services to use the new `email_content_structured` data format.

#### Part A: The Agentic Core

-   [ ] **CREATE** a new directory: `src/backend/functions/generate-email-changes/steps/`
-   [ ] **CREATE** `src/backend/functions/_shared/services/agentLogger.ts` to provide a logging interface to the `ai_process_logs` table.
-   [ ] **CREATE** `src/backend/functions/generate-email-changes/steps/1-clarify-intent.ts`
-   [ ] **CREATE** `src/backend/functions/generate-email-changes/steps/2-plan-changes.ts`
-   [ ] **CREATE** `src/backend/functions/generate-email-changes/steps/3-execute-plan.ts`
-   [ ] **CREATE** `src/backend/functions/generate-email-changes/steps/4-generate-diff.ts`
-   [ ] **EDIT** `src/backend/functions/generate-email-changes/index.ts`
    -   **Purpose:** To rearchitect this file into the "Agent Runner".
    -   **Action:** Remove all monolithic logic. The new file will only orchestrate the `steps`, log the process using `agentLogger.ts`, and handle the final database update to the `email_content_structured` column.

#### Part B: Service-Wide Adaptation

-   [ ] **VERIFY** `src/shared/services/htmlGenerator.ts`
    -   **Purpose:** To confirm the HTML rendering engine works with the final `Section -> Row -> Column -> Element` structure.
    -   **Action:** Review the `generate` function to ensure its recursive logic correctly builds responsive, table-based layouts from the new data model.

-   [ ] **VERIFY** `src/shared/types` directory.
    -   **Purpose:** To confirm all type definitions are aligned.
    -   **Action:** Review `sections.ts`, `row.ts`, `column.ts`, and `elements.ts` to ensure they form a cohesive representation of the data model.

---

## Phase 3: Frontend Adaptation (The Interface)

**Goal:** Ensure the frontend correctly consumes, displays, and interacts with the new `email_content_structured` data provided by the backend.

-   [ ] **EDIT** `src/features/contexts/providers/ProjectProvider.tsx`
    -   **Purpose:** To align the frontend's main state context with the new database schema.
    -   **Action:** Update the `projectData` type definition to use `email_content_structured`. Ensure the data fetching logic correctly selects this column from the `projects` table.

-   [ ] **VERIFY** `src/components/EmailPreview.tsx`
    -   **Purpose:** To confirm the element selection and overlay logic works on the nested grid data.
    -   **Action:** Review the code that generates clickable overlays to ensure it correctly traverses the `sections -> rows -> columns -> elements` structure.

-   [ ] **VERIFY** `src/components/ManualEditPanel.tsx`
    -   **Purpose:** To confirm the layout editing tools function as expected.
    -   **Action:** Review the "Layout" tab logic to ensure its controls correctly find and modify the properties of the right `Column` object.

---

## Phase 4: Cleanup & Documentation

**Goal:** Remove all obsolete database columns and files, and update the project sitemap to reflect the new, completed architecture.

-   [ ] **CREATE** `supabase/migrations/YYYYMMDDHHMMSS_drop_deprecated_project_column.sql`
    -   **Purpose:** To permanently remove the old data column after the migration has been verified.
    -   **Action:** Write a SQL migration to `DROP COLUMN semantic_email_deprecated` from the `projects` table.

-   [ ] **UPDATE** `sitemap`
    -   **Purpose:** To reflect all structural and logical changes in the project's canonical documentation.
    -   **Action:** Meticulously audit and update the `sitemap` file. Document every **CREATED**, **EDITED**, and **DELETED** file from this plan, ensuring the `Purpose` and `Details` for each are accurate. 