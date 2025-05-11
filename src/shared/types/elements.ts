export type ElementType = 
  | 'header'
  | 'text'
  | 'button'
  | 'image'
  | 'divider'
  | 'spacer'
  | 'subtext'
  | 'quote'
  | 'code'
  | 'list'
  | 'icon'
  | 'nav'
  | 'social'
  | 'appStoreBadge'
  | 'unsubscribe'
  | 'preferences'
  | 'previewText'
  | 'container'
  | 'box'
  | 'footer'; // Add more types as needed

export interface EmailElementLayout {
  width?: string;
  height?: string;
  maxWidth?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

export interface EmailElementProperties { }

export interface HeaderElementProperties extends EmailElementProperties {
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  text: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string; // Allow string for weights like 700
    fontStyle?: 'italic' | 'normal';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
}

export interface TextElementProperties extends EmailElementProperties {
  text: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
}

export interface ButtonElementProperties extends EmailElementProperties {
  button: {
    href: string;
    target?: '_blank' | '_self';
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    border?: string; // e.g., '1px solid #000'
  };
  typography?: { // Optional separate typography for button text
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
  };
}

export interface ImageElementProperties extends EmailElementProperties {
  image: {
    src: string;
    alt?: string;
    width?: string;
    height?: string;
    linkHref?: string; // Optional link for the image
    linkTarget?: '_blank' | '_self';
    videoHref?: string; // Optional: Link to video if image is a poster
    objectFit?: 'cover' | 'contain' | 'fill'; // Add objectFit property
  };
  border?: { // Optional border around the image
    radius?: string;
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
}

export interface DividerElementProperties extends EmailElementProperties {
  divider: {
    color?: string;
    height?: string; // e.g., '1px'
    width?: string; // e.g., '100%'
  };
}

export interface SpacerElementProperties extends EmailElementProperties {
  spacer: {
    height: string; // Required: e.g., '20px'
  };
}

export interface SubtextElementProperties extends EmailElementProperties {
  text: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string; // Typically smaller than standard text
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string; // Often lighter than standard text
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
}

export interface QuoteElementProperties extends EmailElementProperties {
  text: string;
  citation?: string; // Optional source/attribution
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal'; // Often italicized
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
  border?: { // e.g., left border common for quotes
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
  backgroundColor?: string;
}

export interface CodeElementProperties extends EmailElementProperties {
  code: string; // The code content
  language?: string; // Optional language hint (e.g., 'javascript')
  typography?: {
    fontFamily?: string; // Usually monospace
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string; // Padding around the code block
}

export interface ListElementProperties extends EmailElementProperties {
  items: string[]; // Array of list item texts
  listType: 'ordered' | 'unordered';
  typography?: { // Style for list items
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
  markerStyle?: { // Style for bullets/numbers
    color?: string;
  };
}

export interface IconElementProperties extends EmailElementProperties {
  icon: {
    src: string;
    alt?: string;
    width?: string; // Often small, fixed size
    height?: string;
    linkHref?: string; // Optional link
    linkTarget?: '_blank' | '_self';
  };
}

export interface NavElementProperties extends EmailElementProperties {
  links: {
    text: string;
    href: string;
    target?: '_blank' | '_self';
    typography?: { // Style per link (optional)
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: 'bold' | 'normal' | string;
      fontStyle?: 'italic' | 'normal';
      color?: string;
    };
  }[];
  layout?: { // Overall layout of the nav links
    align?: 'left' | 'center' | 'right';
    spacing?: string; // Space between links
  };
  typography?: { // Default style for all links
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
  };
}

export type SocialPlatform = 
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'pinterest'
  | 'website'
  | 'email'
  | 'custom';

export interface SocialElementProperties extends EmailElementProperties {
  links: {
    platform: SocialPlatform;
    href: string;
    iconSrc?: string; // Required if platform is 'custom' or for overriding defaults
    alt?: string; // Alt text for the icon
  }[];
  layout?: { // Layout of icons
    align?: 'left' | 'center' | 'right';
    spacing?: string; // Space between icons
  };
  iconStyle?: {
    width?: string;
    height?: string;
    borderRadius?: string; // e.g., for circular icons
  };
}

export interface AppStoreBadgeElementProperties extends EmailElementProperties {
  badge: {
    platform: 'apple-app-store' | 'google-play-store';
    href: string;
    language?: string; // e.g., 'en-us', for localized badges
    alt?: string; // Alt text for badge image
    width?: string;
    height?: string;
  };
}

export interface UnsubscribeElementProperties extends EmailElementProperties {
  link: {
    text: string;
    href: string;
    target?: '_blank' | '_self';
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
}

export interface PreferencesElementProperties extends EmailElementProperties {
  link: {
    text: string;
    href: string;
    target?: '_blank' | '_self';
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
}

export interface PreviewTextElementProperties extends EmailElementProperties {
  text: string;
}

export interface ContainerElementProperties extends EmailElementProperties {
  styles?: {
    backgroundColor?: string;
    border?: string; // e.g., '1px solid #ccc'
    borderRadius?: string;
    padding?: string;
    // Add other applicable container styles
  };
}

export interface BoxElementProperties extends EmailElementProperties {
  styles?: {
    backgroundColor?: string;
    border?: string; // e.g., '1px solid #000'
    borderRadius?: string;
    padding?: string;
    boxShadow?: string; // Note: poor email client support
    // Add other applicable box styles
  };
}

export interface FooterElementProperties extends EmailElementProperties {
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: string;
  };
  text: string;
}

interface BaseEmailElement {
  id: string;
  content: string; // Used differently by different types (text, alt text, button label)
  layout: EmailElementLayout;
}

export type EmailElement = 
  | (BaseEmailElement & { type: 'header'; properties: HeaderElementProperties })
  | (BaseEmailElement & { type: 'text'; properties: TextElementProperties })
  | (BaseEmailElement & { type: 'button'; properties: ButtonElementProperties })
  | (BaseEmailElement & { type: 'image'; properties: ImageElementProperties })
  | (BaseEmailElement & { type: 'divider'; properties: DividerElementProperties })
  | (BaseEmailElement & { type: 'spacer'; properties: SpacerElementProperties })
  | (BaseEmailElement & { type: 'subtext'; properties: SubtextElementProperties })
  | (BaseEmailElement & { type: 'quote'; properties: QuoteElementProperties })
  | (BaseEmailElement & { type: 'code'; properties: CodeElementProperties })
  | (BaseEmailElement & { type: 'list'; properties: ListElementProperties })
  | (BaseEmailElement & { type: 'icon'; properties: IconElementProperties })
  | (BaseEmailElement & { type: 'nav'; properties: NavElementProperties })
  | (BaseEmailElement & { type: 'social'; properties: SocialElementProperties })
  | (BaseEmailElement & { type: 'appStoreBadge'; properties: AppStoreBadgeElementProperties })
  | (BaseEmailElement & { type: 'unsubscribe'; properties: UnsubscribeElementProperties })
  | (BaseEmailElement & { type: 'preferences'; properties: PreferencesElementProperties })
  | (BaseEmailElement & { type: 'previewText'; properties: PreviewTextElementProperties })
  | (BaseEmailElement & { type: 'container'; properties: ContainerElementProperties })
  | (BaseEmailElement & { type: 'box'; properties: BoxElementProperties })
  | (BaseEmailElement & { type: 'footer'; properties: FooterElementProperties }); 