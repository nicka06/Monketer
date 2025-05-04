export type ElementType = 
  | 'header'
  | 'text'
  | 'button'
  | 'image'
  | 'divider'
  | 'spacer'; // Add more types as needed

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
  | (BaseEmailElement & { type: 'spacer'; properties: SpacerElementProperties }); 