// Explicitly import and re-export types from elements.ts
export type {
    ElementType,
    EmailElementLayout,
    EmailElementProperties, // Base type if needed
    HeaderElementProperties,
    TextElementProperties,
    TextElement,
    ButtonElementProperties,
    ButtonElement,
    ImageElementProperties,
    DividerElementProperties,
    SpacerElementProperties,
    SubtextElementProperties,
    QuoteElementProperties,
    CodeElementProperties,
    ListElementProperties,
    IconElementProperties,
    NavElementProperties,
    SocialElementProperties,
    AppStoreBadgeElementProperties,
    UnsubscribeElementProperties,
    PreferencesElementProperties,
    PreviewTextElementProperties,
    ContainerElementProperties,
    BoxElementProperties,
    FooterElementProperties,
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
    validateEmailTemplateV2 // Corrected name and removed others
} from './validators.ts';


export * from './row.ts';
export * from './column.ts';

// Explicitly import and re-export types from diffs.ts
export type {
    PropertyChange,
    ElementDiff,
    SectionDiff,
    TemplateDiffResult
} from './diffs.ts'; 