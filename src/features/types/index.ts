export * from '../../shared/types/elements';
export * from '../../shared/types/sections';
export * from '../../shared/types/template';
export * from '../../shared/types/validators'; // Export validators too if needed elsewhere
export * from '../../shared/types/diffs';    // Export diff types
export * from './ai'; // Export local AI types

// Explicitly export from ./editor.ts to avoid name collisions
// The shared types (EmailElement, EmailSection, EmailTemplate) take precedence if not aliased here.
export {
    type Project,
    type ChatMessage,
    type PendingChange,
    type EmailPreviewProps,
    // Alias editor-specific versions if they need to be exported from this barrel
    // type EmailElement as EditorEmailElement, 
    // type EmailSection as EditorEmailSection,
    // type EmailTemplate as EditorEmailTemplate
} from './editor'; // Export local editor types