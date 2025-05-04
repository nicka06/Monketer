// Explicitly import and re-export types from elements.ts
export type {
    ElementType,
    EmailElementLayout,
    EmailElementProperties, // Base type if needed
    HeaderElementProperties,
    TextElementProperties,
    ButtonElementProperties,
    ImageElementProperties,
    DividerElementProperties,
    SpacerElementProperties,
    EmailElement // The main union type
} from './elements.ts'; 

// Explicitly import and re-export types from sections.ts
export type {
    EmailSectionStyles,
    EmailSection
} from './sections.ts';

// Explicitly import and re-export types from template.ts
export type {
    EmailGlobalStyles,
    EmailTemplate
} from './template.ts';

// Explicitly import and re-export types from validators.ts
export { 
    isEmailElement,
    isEmailSection, // Add other validators if needed
    isEmailTemplate,
    validateEmailTemplate // Keeping this name consistent with edge func import
} from './validators.ts'; 

// Explicitly import and re-export types from diffs.ts
export type {
    PropertyChange,
    ElementDiff,
    SectionDiff,
    TemplateDiffResult
} from './diffs.ts'; 