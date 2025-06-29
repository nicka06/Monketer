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
  | 'footer';

export interface EmailElementProperties {}

export interface HeaderElementProperties extends EmailElementProperties {
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  text: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
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
    lineHeight?: string;
  };
}

export interface ButtonElementProperties extends EmailElementProperties {
  href: string;
  text: string;
  target?: '_blank' | '_self';
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  border?: string; // e.g., '1px solid #000'
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
  };
}

export interface ImageElementProperties extends EmailElementProperties {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  linkHref?: string;
  linkTarget?: '_blank' | '_self';
  videoHref?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  border?: {
    radius?: string;
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
}

export interface DividerElementProperties extends EmailElementProperties {
  color?: string;
  height?: string; // e.g., '1px'
  width?: string; // e.g., '100%'
}

export interface SpacerElementProperties extends EmailElementProperties {
  height: string; // Required: e.g., '20px'
}

export interface SubtextElementProperties extends EmailElementProperties {
  text: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
}

export interface QuoteElementProperties extends EmailElementProperties {
  text: string;
  citation?: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
  border?: {
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
  backgroundColor?: string;
}

export interface CodeElementProperties extends EmailElementProperties {
  code: string;
  language?: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
}

export interface ListElementProperties extends EmailElementProperties {
  items: string[];
  listType: 'ordered' | 'unordered';
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'bold' | 'normal' | string;
    fontStyle?: 'italic' | 'normal';
    color?: string;
    lineHeight?: string;
  };
  markerStyle?: {
    color?: string;
  };
}

export interface IconElementProperties extends EmailElementProperties {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  linkHref?: string;
  linkTarget?: '_blank' | '_self';
}

export interface NavElementProperties extends EmailElementProperties {
  links: {
    text: string;
    href: string;
    target?: '_blank' | '_self';
    typography?: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: 'bold' | 'normal' | string;
      fontStyle?: 'italic' | 'normal';
      color?: string;
    };
  }[];
  typography?: {
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
    iconSrc?: string;
    alt?: string;
  }[];
  iconStyle?: {
    width?: string;
    height?: string;
    borderRadius?: string;
  };
}

export interface AppStoreBadgeElementProperties extends EmailElementProperties {
  platform: 'apple-app-store' | 'google-play-store';
  href: string;
  language?: string;
  alt?: string;
  width?: string;
  height?: string;
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
    lineHeight?: string;
  };
}

export interface PreviewTextElementProperties extends EmailElementProperties {
  text: string;
}

export interface FooterElementProperties extends EmailElementProperties {
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    lineHeight?: string;
  };
  text: string;
}

interface BaseEmailElement {
  id: string;
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
  | (BaseEmailElement & { type: 'footer'; properties: FooterElementProperties });