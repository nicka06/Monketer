import { EmailSection } from './sections.ts';

export interface EmailGlobalStyles {
  bodyBackgroundColor?: string;
  bodyFontFamily?: string;
  bodyTextColor?: string;
  contentWidth?: string; // e.g., '600px'
  // Add other global styles as needed
}

export interface EmailTemplate {
  id: string; // Usually the project ID
  name: string;
  version: number;
  sections: EmailSection[];
  globalStyles: EmailGlobalStyles;
} 