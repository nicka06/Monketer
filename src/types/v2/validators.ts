import * as z from 'zod'; // Standard package import

// --- Placeholders --- 
const PlaceholderImage = z.literal("@@PLACEHOLDER_IMAGE@@").describe("Placeholder for missing image URL");
const PlaceholderLink = z.literal("@@PLACEHOLDER_LINK@@").describe("Placeholder for missing link URL");
const PlaceholderText = z.literal("@@PLACEHOLDER_TEXT@@").describe("Placeholder for missing text content");

// --- Base Schemas --- 

const EmailElementLayoutSchema = z.object({
  width: z.string().optional(),
  height: z.string().optional(),
  maxWidth: z.string().optional(),
  margin: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional(),
  padding: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  valign: z.enum(['top', 'middle', 'bottom']).optional(),
}).describe("Layout styles for an element");

const BaseTypographySchema = z.object({
    fontFamily: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(), // Allow string for weights like 700
    fontStyle: z.enum(['italic', 'normal']).optional(),
    color: z.string().optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    lineHeight: z.string().optional(),
}).describe("Base typography styles");

const BaseBorderStyleSchema = z.object({
    width: z.string().optional(),
    style: z.enum(['solid', 'dashed', 'dotted']).optional(),
    color: z.string().optional(),
}).describe("Base border styles (width, style, color)");

// --- Element Property Schemas --- 

const HeaderElementPropertiesSchema = z.object({
  level: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  text: z.union([z.string().min(1), PlaceholderText]),
  typography: BaseTypographySchema.optional(),
});

const TextElementPropertiesSchema = z.object({
  text: z.union([z.string(), PlaceholderText]), // Allow empty string for text
  typography: BaseTypographySchema.optional(),
});

const ButtonElementPropertiesSchema = z.object({
  button: z.object({
    href: z.union([z.string().url().min(1), z.string().startsWith('#'), z.string().startsWith('mailto:'), PlaceholderLink]),
    target: z.enum(['_blank', '_self']).optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    borderRadius: z.string().optional(),
    border: z.string().optional(), // e.g., '1px solid #000'
  }),
  typography: z.object({ // Optional separate typography for button text
    fontFamily: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(),
  }).optional(),
});

const ImageElementPropertiesSchema = z.object({
  image: z.object({
    src: z.union([z.string().url().min(1), PlaceholderImage]),
    alt: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    linkHref: z.union([z.string().url().min(1), z.string().startsWith('#'), z.string().startsWith('mailto:'), PlaceholderLink]).optional(), // Optional link for the image
    linkTarget: z.enum(['_blank', '_self']).optional(),
    videoHref: z.union([z.string().url().min(1), PlaceholderLink]).optional(), // Optional video link
  }),
  border: BaseBorderStyleSchema.extend({
      radius: z.string().optional()
  }).optional()
});

const DividerElementPropertiesSchema = z.object({
  divider: z.object({
    color: z.string().optional(),
    height: z.string().optional(), // e.g., '1px'
    width: z.string().optional(), // e.g., '100%'
  }),
});

const SpacerElementPropertiesSchema = z.object({
  spacer: z.object({
    height: z.string().min(1), // Required: e.g., '20px'
  }),
});

// (+) New Element Property Schemas

const SubtextElementPropertiesSchema = z.object({
  text: z.union([z.string(), PlaceholderText]),
  typography: BaseTypographySchema.optional(),
});

const QuoteElementPropertiesSchema = z.object({
  text: z.union([z.string().min(1), PlaceholderText]),
  citation: z.string().optional(),
  typography: BaseTypographySchema.optional(),
  border: BaseBorderStyleSchema.optional(), // e.g., left border
  backgroundColor: z.string().optional(),
});

const CodeElementPropertiesSchema = z.object({
  code: z.union([z.string(), PlaceholderText]),
  language: z.string().optional(),
  typography: BaseTypographySchema.pick({ // Usually limited typography
      fontFamily: true, 
      fontSize: true, 
      fontWeight: true, 
      fontStyle: true, 
      color: true, 
      lineHeight: true 
  }).optional(),
  backgroundColor: z.string().optional(),
  borderRadius: z.string().optional(),
  padding: z.string().optional(),
});

const ListElementPropertiesSchema = z.object({
  items: z.array(z.union([z.string(), PlaceholderText])),
  listType: z.enum(['ordered', 'unordered']),
  typography: BaseTypographySchema.optional(), // Style for list items
  markerStyle: z.object({ // Style for bullets/numbers
    color: z.string().optional(),
  }).optional(),
});

const IconElementPropertiesSchema = z.object({
  icon: z.object({
    src: z.union([z.string().url().min(1), PlaceholderImage]),
    alt: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    linkHref: z.union([z.string().url().min(1), z.string().startsWith('#'), z.string().startsWith('mailto:'), PlaceholderLink]).optional(),
    linkTarget: z.enum(['_blank', '_self']).optional(),
  }),
});

const NavElementPropertiesSchema = z.object({
  links: z.array(z.object({
    text: z.union([z.string().min(1), PlaceholderText]),
    href: z.union([z.string().url().min(1), z.string().startsWith('#'), z.string().startsWith('mailto:'), PlaceholderLink]),
    target: z.enum(['_blank', '_self']).optional(),
    typography: BaseTypographySchema.optional(), // Style per link
  })),
  layout: z.object({ // Overall layout of the nav links
    align: z.enum(['left', 'center', 'right']).optional(),
    spacing: z.string().optional(), // Space between links
  }).optional(),
  typography: BaseTypographySchema.optional(), // Default style for all links
});

const SocialPlatformEnum = z.enum([
  'facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'pinterest', 'website', 'email', 'custom'
]);

const SocialElementPropertiesSchema = z.object({
  links: z.array(z.object({
    platform: SocialPlatformEnum,
    href: z.union([z.string().url().min(1), z.string().startsWith('mailto:'), PlaceholderLink]),
    iconSrc: z.union([z.string().url().min(1), PlaceholderImage]).optional(), // Required if platform is 'custom'?
    alt: z.string().optional(), // Alt text for the icon
  })),
  layout: z.object({ // Layout of icons
    align: z.enum(['left', 'center', 'right']).optional(),
    spacing: z.string().optional(), // Space between icons
  }).optional(),
  iconStyle: z.object({
    width: z.string().optional(),
    height: z.string().optional(),
    borderRadius: z.string().optional(), // e.g., for circular icons
  }).optional(),
});

const AppStoreBadgeElementPropertiesSchema = z.object({
  badge: z.object({
    platform: z.enum(['apple-app-store', 'google-play-store']),
    href: z.union([z.string().url().min(1), PlaceholderLink]),
    language: z.string().optional(),
    alt: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
  }),
});

const UnsubscribeElementPropertiesSchema = z.object({
  link: z.object({
    text: z.union([z.string().min(1), PlaceholderText]),
    href: z.union([z.string().url().min(1), PlaceholderLink]),
    target: z.enum(['_blank', '_self']).optional(),
  }),
  typography: BaseTypographySchema.optional(),
});

const PreferencesElementPropertiesSchema = z.object({
  link: z.object({
    text: z.union([z.string().min(1), PlaceholderText]),
    href: z.union([z.string().url().min(1), PlaceholderLink]),
    target: z.enum(['_blank', '_self']).optional(),
  }),
  typography: BaseTypographySchema.optional(),
});

const PreviewTextElementPropertiesSchema = z.object({
  text: z.string(), // Cannot be empty, should not be placeholder ideally
});

const ContainerElementPropertiesSchema = z.object({
  styles: z.object({
    backgroundColor: z.string().optional(),
    border: z.string().optional(), // e.g., '1px solid #ccc'
    borderRadius: z.string().optional(),
    padding: z.string().optional(),
  }).optional(),
});

const BoxElementPropertiesSchema = z.object({
   styles: z.object({
    backgroundColor: z.string().optional(),
    border: z.string().optional(), // e.g., '1px solid #000'
    borderRadius: z.string().optional(),
    padding: z.string().optional(),
    boxShadow: z.string().optional(), // Note: poor email client support
  }).optional(),
});

// --- Element Schema (Discriminated Union) ---

// Define base separately to avoid repetition 
const BaseEmailElementSchema = z.object({
  id: z.string().min(1),
  content: z.union([z.string(), PlaceholderText]), // Base content, interpretation varies by type
  layout: EmailElementLayoutSchema,
});

// Use Zod's discriminated union based on the 'type' property
const EmailElementSchema = z.discriminatedUnion('type', [
  BaseEmailElementSchema.extend({ type: z.literal('header'), properties: HeaderElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('text'), properties: TextElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('button'), properties: ButtonElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('image'), properties: ImageElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('divider'), properties: DividerElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('spacer'), properties: SpacerElementPropertiesSchema }),
  // (+) Add ALL new types
  BaseEmailElementSchema.extend({ type: z.literal('subtext'), properties: SubtextElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('quote'), properties: QuoteElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('code'), properties: CodeElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('list'), properties: ListElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('icon'), properties: IconElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('nav'), properties: NavElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('social'), properties: SocialElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('appStoreBadge'), properties: AppStoreBadgeElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('unsubscribe'), properties: UnsubscribeElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('preferences'), properties: PreferencesElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('previewText'), properties: PreviewTextElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('container'), properties: ContainerElementPropertiesSchema }),
  BaseEmailElementSchema.extend({ type: z.literal('box'), properties: BoxElementPropertiesSchema }),
]);

// Infer the EmailElement type from the schema if needed elsewhere
export type EmailElementType = z.infer<typeof EmailElementSchema>;

// --- Section and Template Schemas ---

const EmailSectionStylesSchema = z.object({
    backgroundColor: z.string().optional(),
    padding: z.object({
        top: z.string().optional(),
        right: z.string().optional(),
        bottom: z.string().optional(),
        left: z.string().optional(),
    }).optional(),
    border: BaseBorderStyleSchema.optional(),
}).describe("Styles specific to a section");

const EmailSectionSchema = z.object({
  id: z.string().min(1),
  elements: z.array(EmailElementSchema),
  styles: EmailSectionStylesSchema.optional(), // Make section styles optional
});

const EmailGlobalStylesSchema = z.object({
    bodyBackgroundColor: z.string().optional(),
    bodyFontFamily: z.string().optional(),
    bodyTextColor: z.string().optional(),
    contentWidth: z.string().optional(), // e.g., '600px'
}).describe("Global styles applied to the email body or container");

const EmailTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  version: z.literal(2), // Ensure we are dealing with V2
  sections: z.array(EmailSectionSchema),
  globalStyles: EmailGlobalStylesSchema.optional(), // Make global styles optional
});

// Infer the EmailTemplate type from the schema
export type EmailTemplateV2Type = z.infer<typeof EmailTemplateSchema>;


// --- Validation Function --- 

/**
 * Validates the structure of an EmailTemplate V2 object using Zod.
 * Allows specific placeholder strings in designated fields.
 * @param templateData The raw data (typically from AI JSON parse) to validate.
 * @returns An object indicating validation success or failure, with data or errors.
 */
export function validateEmailTemplateV2(templateData: unknown): { valid: boolean; data?: EmailTemplateV2Type; errors?: z.ZodIssue[] } {
    const result = EmailTemplateSchema.safeParse(templateData);
    if (result.success) {
        return { valid: true, data: result.data };
    } else {
        // Log detailed errors for easier debugging in edge function
        console.error("[validateEmailTemplateV2] Zod validation failed:", JSON.stringify(result.error.issues, null, 2));
        return { valid: false, errors: result.error.issues };
    }
}

// --- Remove Old Validation Logic --- 
// The old type guards (isEmailElement, etc.) and validateButtonElement are no longer needed. 