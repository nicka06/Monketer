/**
 * EmailHtmlRenderer
 * 
 * This component renders HTML email content in an iframe, providing a preview environment
 * for email templates with special handling for placeholder elements.
 * 
 * Key Features:
 * 1. Renders email content in an isolated iframe environment
 * 2. Transforms placeholder elements (images/links) into visual representations
 * 3. Maintains proper styling and background colors
 * 4. Auto-resizes based on content
 * 5. Handles responsive design
 * 
 * @component
 */

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

interface EmailHtmlRendererProps {
  /** The HTML content to render */
  html: string | null;
  /** Callback fired when content is fully rendered and ready */
  onContentReady: () => void;
  /** Optional className for the container div */
  className?: string;
}

export interface EmailHtmlRendererRef {
  /** Returns the container div element */
  getContainer: () => HTMLDivElement | null;
}

/**
 * Safely escapes HTML special characters to prevent XSS attacks.
 * Used when inserting user-provided content into HTML attributes.
 * 
 * @param str - The string to escape
 * @returns The escaped string safe for HTML insertion
 * @example
 * // Used when inserting styles or attributes:
 * style="${escapeHtml(placeholderStyle)}"
 */
function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Processes HTML content to transform placeholder elements into visual representations.
 * Handles two types of placeholders:
 * 1. Images (<img data-placeholder="true">)
 * 2. Links (<a data-placeholder="true">)
 * 
 * @param html - The raw HTML content to process
 * @returns Processed HTML with placeholders transformed into visual elements
 */
function processHtmlForPlaceholders(html: string): string {
  if (!html) return '';
  console.log('[EmailHtmlRenderer:processHtml] === Starting Placeholder Processing ===');
  console.log('[EmailHtmlRenderer:processHtml] HTML Received (first 500 chars):', html.substring(0, 500));
  let processedHtml = html;

  // --- Process IMAGE Placeholders FIRST ---
  console.log('[EmailHtmlRenderer:processHtml] --- Searching for IMAGE placeholders (<img data-placeholder="true">) ---');
  const imgRegex = /<img[^>]*data-placeholder=[\'\"]true[\'\"][^>]*>/gi;
  processedHtml = processedHtml.replace(imgRegex, (match) => {
    console.log('[EmailHtmlRenderer:processHtml] Found IMAGE placeholder match:', match);
    // Extract required data attributes
    const elementIdMatch = match.match(/data-element-id=[\'\"]([^\"\']+)[\'\"]/i);
    const propertyPathMatch = match.match(/data-property-path=[\'\"]([^\"\']+)[\'\"]/i);
    const elementId = elementIdMatch ? elementIdMatch[1] : null;
    const propertyPath = propertyPathMatch ? propertyPathMatch[1] : null;

    if (!elementId || !propertyPath) {
      console.warn('[EmailHtmlRenderer:processHtml] Placeholder image missing data attributes:', match);
      return '<!-- Invalid Placeholder Image -->'; // Skip if data attributes are missing
    }

    // Extract existing styles and attributes for display
    const styleMatch = match.match(/style=[\'\"]([^\"\']*)[\'\"]/i);
    const widthMatch = match.match(/width=[\'\"]?(\\d+%?|auto)[\'\"]?/i);
    const heightMatch = match.match(/height=[\'\"]?(\\d+%?|auto)[\'\"]?/i);
    const altMatch = match.match(/alt=[\'\"]([^\"\']*)[\'\"]/i);
    
    const existingStyles = styleMatch ? styleMatch[1] : '';
    const width = widthMatch ? widthMatch[1] : '100%'; 
    const height = heightMatch ? heightMatch[1] : 'auto'; 
    const alt = altMatch ? altMatch[1] : 'Image Placeholder';
    console.log(`[EmailHtmlRenderer:processHtml] Extracted for Image ${elementId}: width=${width}, height=${height}, alt=${alt}`);

    // Ensure display: block for proper sizing
    let displayStyle = 'display: block;';
    if (existingStyles.includes('display:')) {
       displayStyle = existingStyles.match(/display:[^;]+/i)?.[0] || displayStyle;
    } 

    // Helper to add unit if needed
    const formatDimension = (value: string): string => {
      if (value === 'auto' || value.endsWith('%')) {
        return value;
      } 
      return /^\d+$/.test(value) ? value + 'px' : value;
    };

    // Generate placeholder styles
    let finalHeightStyle = '';
    if (height === 'auto') {
      finalHeightStyle = 'aspect-ratio: 16 / 9;'; 
      console.log(`[EmailHtmlRenderer:processHtml] Using aspect-ratio for Image ${elementId}`);
    } else {
      finalHeightStyle = `height: ${formatDimension(height)};`;
      console.log(`[EmailHtmlRenderer:processHtml] Using explicit height for Image ${elementId}: ${formatDimension(height)}`);
    }

    // Clean the existing styles string
    const cleanedExistingStyles = existingStyles
      .replace(/display:[^;]+;?/gi, '')
      .replace(/width:[^;]+;?/gi, '')
      .replace(/height:[^;]+;?/gi, '')
      .replace(/max-width:[^;]+;?/gi, '')
      .replace(/aspect-ratio:[^;]+;?/gi, '')
      .trim();

    const placeholderStyle = `
      ${displayStyle} 
      width: ${formatDimension(width)};
      ${finalHeightStyle}
      max-width: 100%;
      background-color: #e0e0e0; 
      border: 1px dashed #a0a0a0; 
      color: #666; 
      font-size: 14px; 
      text-align: center; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
      box-sizing: border-box;
      ${cleanedExistingStyles}
    `.replace(/\s+/g, ' ').trim();
    console.log(`[EmailHtmlRenderer:processHtml] Calculated Style for Image ${elementId}:`, placeholderStyle);

    // Return placeholder div
    const placeholderDiv = `
        <div 
          class="email-placeholder placeholder-image" 
          data-element-id="${elementId}" 
          data-property-path="${propertyPath}" 
          data-placeholder-type="image"
          style="${escapeHtml(placeholderStyle)}" 
          title="${escapeHtml(alt)}"
        >
          <span>${escapeHtml(alt)}<br/>(Placeholder)</span>
        </div>
      `;
    console.log(`[EmailHtmlRenderer:processHtml] Generated DIV for Image ${elementId}:`, placeholderDiv);
    return placeholderDiv;
  });
  console.log('[EmailHtmlRenderer:processHtml] --- Finished IMAGE placeholder search ---');
  console.log('[EmailHtmlRenderer:processHtml] HTML after Image processing (first 500 chars):', processedHtml.substring(0, 500));

  // --- Process LINK Placeholders SECOND ---
  console.log('[EmailHtmlRenderer:processHtml] --- Searching for LINK placeholders (<a data-placeholder="true">) ---');
  const linkRegex = /<a[^>]*data-placeholder=[\'\"]true[\'\"][^>]*>(.*?)<\/a>/gi;
  processedHtml = processedHtml.replace(linkRegex, (match, content) => {
    console.log('[EmailHtmlRenderer:processHtml] Found LINK placeholder match:', match);
    // Extract required data attributes
    const elementIdMatch = match.match(/data-element-id=[\'\"]([^\"\']+)[\'\"]/i);
    const propertyPathMatch = match.match(/data-property-path=[\'\"]([^\"\']+)[\'\"]/i);
    const elementId = elementIdMatch ? elementIdMatch[1] : null;
    const propertyPath = propertyPathMatch ? propertyPathMatch[1] : null;

    if (!elementId || !propertyPath) {
      console.warn('[EmailHtmlRenderer:processHtml] Placeholder link missing data attributes:', match);
      return '<!-- Invalid Placeholder Link -->';
    }

    // Extract existing styles from the <a> tag
    const styleMatch = match.match(/style=[\'\"]([^\"\']*)[\'\"]/i);
    const existingStyles = styleMatch ? styleMatch[1] : '';
    console.log(`[EmailHtmlRenderer:processHtml] Extracted for Link ${elementId}: content=${content.substring(0, 50)}, existingStyles=${existingStyles}`);

    // Basic styling for link placeholder
    const placeholderStyle = `
      display: inline-block; 
      border: 1px dashed #a0a0a0; 
      background-color: #e0e0e0; 
      color: #333; 
      padding: 2px 5px; 
      border-radius: 3px; 
      cursor: pointer; 
      text-decoration: none; 
      ${existingStyles}
    `.replace(/\s+/g, ' ').trim();
    console.log(`[EmailHtmlRenderer:processHtml] Calculated Style for Link ${elementId}:`, placeholderStyle);

    // Return placeholder span
    const placeholderSpan = `
        <span 
          class="email-placeholder placeholder-link" 
          data-element-id="${elementId}" 
          data-property-path="${propertyPath}" 
          data-placeholder-type="link"
          style="${escapeHtml(placeholderStyle)}" 
          title="Link Required"
        >
          ${content} (Link required)
        </span>
      `;
    console.log(`[EmailHtmlRenderer:processHtml] Generated SPAN for Link ${elementId}:`, placeholderSpan);
    return placeholderSpan;
  });
  console.log('[EmailHtmlRenderer:processHtml] --- Finished LINK placeholder search ---');
  console.log('[EmailHtmlRenderer:processHtml] HTML after Link processing (first 500 chars):', processedHtml.substring(0, 500));

  const finalHtml = processedHtml;
  console.log('[EmailHtmlRenderer:processHtml] Final processed HTML (first 500 chars):', finalHtml.substring(0, 500));
  console.log('[EmailHtmlRenderer:processHtml] === Finished Placeholder Processing ===');
  return finalHtml;
}

/**
 * The main EmailHtmlRenderer component.
 * Renders HTML email content in an iframe with special handling for placeholders.
 * 
 * Features:
 * - Isolated rendering environment using iframe
 * - Auto-resizing based on content
 * - Background color preservation
 * - Placeholder transformation
 * - Responsive design support
 * 
 * @param props.html - The HTML content to render
 * @param props.onContentReady - Callback when content is ready
 * @param props.className - Optional container className
 * @param ref - Forwarded ref with access to container element
 */
export const EmailHtmlRenderer = forwardRef<EmailHtmlRendererRef, EmailHtmlRendererProps>((
  { html, onContentReady, className },
  ref
) => {
  // Container ref for the outer div
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref for the iframe element
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Expose container access through ref
  useImperativeHandle(ref, () => ({ 
    getContainer: () => containerRef.current,
  }), []);
  
  // Main effect for rendering HTML content
  useEffect(() => {
    console.log("[EmailHtmlRenderer|useEffect html] Effect triggered. Current HTML length:", html?.length ?? 0);
    const container = containerRef.current;
    if (!container) {
      console.log("[EmailHtmlRenderer|useEffect html] Skipping: Container ref not ready.");
      return;
    }

    // Create iframe if it doesn't exist
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      // Set default iframe styling
      iframe.style.width = '100%';
      iframe.style.minHeight = '300px';
      iframe.style.border = '2px solid #d1d5db';
      iframe.style.borderRadius = '0.75rem';
      iframe.style.overflow = 'hidden';
      iframe.setAttribute('scrolling', 'no');
      container.appendChild(iframe);
      iframeRef.current = iframe;
    }

    // Render content in iframe
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          
          if (html) {
            console.log("[EmailHtmlRenderer|useEffect html] HTML content exists. Processing placeholders...");
            // Transform placeholders in HTML content
            const processedHtml = processHtmlForPlaceholders(html);
            
            // Extract background color from email container
            const bgColorMatch = processedHtml.match(/class="email-container"[^>]*background:([^;"]*)/i);
            const backgroundColor = bgColorMatch ? bgColorMatch[1].trim() : '#ffffff';
            
            // Add styles for proper content display and background color
            const styleTag = `
              <style>
                html, body {
                  margin: 0;
                  padding: 0;
                  height: auto;
                  overflow: visible;
                  background-color: ${backgroundColor};
                }
                * {
                  box-sizing: border-box;
                }
                .email-content {
                  padding: 20px;
                  background-color: ${backgroundColor};
                }
              </style>
            `;
            
            // Wrap content in container with proper styling
            const wrappedHtml = `
              ${styleTag}
              <div class="email-content">
                ${processedHtml}
              </div>
            `;
            
            iframeDoc.write(wrappedHtml);
          } else {
            // Empty content - write nothing
            iframeDoc.write('');
          }
          
          iframeDoc.close();
          
          // Handle iframe content loading
          iframe.onload = () => {
            console.log("[EmailHtmlRenderer|useEffect html] iframe.onload triggered.");
            
            /**
             * Resizes iframe to match content height
             * Uses multiple height calculations to ensure accuracy across different browsers
             */
            const resizeIframe = () => {
              try {
                const body = iframeDoc.body;
                const html = iframeDoc.documentElement;
                
                if (body && html) {
                  const height = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );
                  
                  iframe.style.height = height + 'px';
                  console.log(`Resized iframe to ${height}px based on content`);
                }
              } catch (e) {
                console.error("Error resizing iframe:", e);
              }
              
              onContentReady();
            };
            
            // Initial resize
            resizeIframe();
            
            // Set up automatic resizing for dynamic content
            if (window.ResizeObserver) {
              const resizeObserver = new ResizeObserver(() => {
                resizeIframe();
              });
              
              try {
                resizeObserver.observe(iframeDoc.body);
              } catch (e) {
                console.error("Error setting up ResizeObserver:", e);
              }
            }
          };
        }
      } catch (error) {
        console.error("Error setting iframe content:", error);
      }
    }

    // No cleanup needed
    return () => {};
  }, [html, onContentReady]);

  // Render container div
  return <div ref={containerRef} className={className} />;
}); 