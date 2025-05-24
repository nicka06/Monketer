# Sitemap

This sitemap meticulously documents the location, purpose, detailed structure, and usage of EVERY file and directory within the `src` codebase.

## Core Principle

The sitemap file is the absolute and final source of truth for this project.

## `src` Directory Structure

*   `src/`
    *   `backend/`
        *   `functions/`
            *   `create-stripe-checkout-session/`
                *   `index.ts`: Supabase Edge Function to create a Stripe Checkout session for paid plans.
                    *   Details: Handles requests from the frontend, creates a Stripe Checkout session with appropriate line items and redirects the user to Stripe.
                    *   Usage: Called by `PlanSelectionPage.tsx` when a user selects a paid plan.
            *   `stripe-webhook-handler/`
                *   `index.ts`: Supabase Edge Function to handle incoming Stripe webhooks.
                    *   Details: Listens for events from Stripe (e.g., `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`). Updates `user_info` table in Supabase with subscription status, tier, and Stripe customer ID. Uses Deno runtime.
                    *   Usage: Configured in Stripe dashboard to receive webhook events.
                *   `types.ts`: Contains TypeScript type definitions for the Stripe webhook handler.
            *   `subscribe-to-free-plan/`
                *   `index.ts`: Supabase Edge Function to handle subscription to the free plan.
                    *   Details: Upserts a record in the `user_info` table, setting `subscription_tier` to 'free', `subscription_status` to 'active', and initializes `project_count` to 0.
                    *   Usage: Called by `PlanSelectionPage.tsx` when a user selects the free plan.
    *   `components/`
        *   `auth/`
            *   `AuthForm.tsx`: UI component for user sign-in and sign-up.
        *   `core/`
            *   `LoadingScreen.tsx`: A simple loading screen component.
            *   `Navbar.tsx`: Application navigation bar.
            *   `Sidebar.tsx`: Application sidebar.
        *   `editor/`
            *   `InitialPromptScreen.tsx`: Component shown when starting a new project or an empty one, allowing user to input initial email description.
        *   `subscription/`
            *   `PlanSelectionPage.tsx`: UI component for users to select a subscription plan (Free, Pro, Premium).
                *   Details: Displays plan options and calls respective Supabase functions (`subscribe-to-free-plan` or `create-stripe-checkout-session`) based on user selection.
                *   Usage: Shown to new users after signup, or accessible from settings to change plans.
            *   `SubscriptionProtectedRoute.tsx`: React component to protect routes based on user's subscription status and project limits.
                *   Details: Fetches user's subscription info from `user_info` table. Redirects to `/subscription` or `/login` if criteria are not met (e.g., no active subscription, project limit reached).
                *   Usage: Wraps routes in `App.tsx` that require an active subscription (e.g., the editor).
        *   `ui/` (ShadCN UI components - e.g., `button.tsx`, `card.tsx`, etc. - details omitted for brevity but assume standard ShadCN structure)
    *   `core/`
        *   `App.tsx`: Main application component, sets up routing and global providers.
            *   Details: Defines routes, including protected routes using `SubscriptionProtectedRoute`. Initializes `AuthProvider`, `QueryClientProvider`, etc.
            *   Usage: Entry point for the React application.
        *   `ErrorBoundary.tsx`: Catches JavaScript errors anywhere in its child component tree.
        *   `Layout.tsx`: Defines the main layout structure of the application (e.g., with Navbar and Sidebar).
    *   `features/`
        *   `auth/`
            *   `useAuth.tsx`: Custom React hook providing authentication state and methods (`user`, `session`, `signIn`, `signUp`, `signOut`).
                *   Details: Wraps Supabase auth functionalities. Interacts with `AuthContext`.
                *   Usage: Used by components that need access to auth state or methods.
        *   `contexts/`
            *   `EditorContext.tsx`: React context provider for the email editor. Manages editor state, operations (including project creation for new emails), and business logic.
        *   `services/`
            *   `projectService.ts`: Contains functions for interacting with the `projects` table and related data in Supabase.
                *   Details: Includes `createProject` (creates a project record and calls RPC `increment_project_count`), `getUserProjects`, `getProject`, `updateProject`, etc.
                *   Usage: Called by various components and contexts (e.g., `Dashboard.tsx`, `EditorContext.tsx`).
        *   `types/`
            *   `editor.ts`: TypeScript type definitions for editor-related data structures (e.g., `Project`, `EmailTemplate`).
    *   `hooks/`
        *   `use-toast.ts`: Custom hook for displaying toast notifications.
    *   `integrations/`
        *   `supabase/`
            *   `client.ts`: Initializes and exports the Supabase client.
    *   `lib/`
        *   `stripe.ts`: (This was previously deleted, if recreated for client-side Stripe.js setup, it would go here. Currently, Stripe interactions are backend through Supabase functions)
        *   `utils.ts`: Utility functions.
        *   `uuid.ts`: UUID generation functions.
    *   `pages/`
        *   `Dashboard.tsx`: User dashboard page. Displays a list of projects and allows creation of new projects.
            *   Details: Calls `handleCreateProject` which now includes logic to check project limits against `user_info` before navigating to the editor.
            *   Usage: Main page for authenticated users after subscription selection.
        *   `EditorPage.tsx`: Page that hosts the email editor.
        *   `LoginPage.tsx`: User login page.
        *   `SignupPage.tsx`: User signup page.
            *   Details: Redirects to `/subscription` after successful signup.
        *   `SubscriptionPage.tsx`: Page that likely uses `PlanSelectionPage.tsx` for users to manage their subscription.
    *   `shared/`
        *   `config/`
            *   `stripe.ts`: (This was previously a Node.js shared config, deleted. If a new shared config for constants like price IDs or tier limits is needed across frontend/backend, it might go here, but tier limits are also in `SubscriptionProtectedRoute.tsx` and `Dashboard.tsx` currently). Contains plan details such as `FREE_TIER` limits.
        *   `types/`
            *   `template.ts`: Shared TypeScript types, potentially for email templates if used by both frontend and backend functions.
    *   `import_map.json`: (Located at `src/backend/functions/import_map.json`) Deno import map for Supabase Edge Functions.
        *   Details: Maps module names to URLs for Deno imports (e.g., `stripe` to `https://esm.sh/stripe@^x.x.x`).
        *   Usage: Used by Deno runtime for Supabase Edge Functions.
*   `supabase/`
    *   `config.toml`: Supabase project configuration file.
        *   Details: Defines settings for the Supabase project, including function declarations.
    *   `migrations/`: Directory containing database migration files.
        *   Details: Includes migrations for `user_info` table (e.g., adding `UNIQUE` constraint on `auth_user_uuid`), `increment_project_count` RPC function, etc.

This sitemap will be updated continuously as the codebase evolves. 