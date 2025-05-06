import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

interface EmailHtmlRendererProps {
  html: string | null;
  onContentReady: () => void;
  className?: string;
}

export interface EmailHtmlRendererRef {
  getContainer: () => HTMLDivElement | null;
}

// (+) Helper function to generate unique IDs
function generatePlaceholderId() {
  return `placeholder-${Math.random().toString(36).substring(2, 9)}`;
}

// (+) Helper function to safely escape HTML attributes
function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// (+) Helper function to process HTML and replace placeholders
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
    // Regex to capture digits, percentages, or 'auto' (Fixed to handle % correctly)
    const widthMatch = match.match(/width=[\'\"]?(\\d+%?|auto)[\'\"]?/i);
    const heightMatch = match.match(/height=[\'\"]?(\\d+%?|auto)[\'\"]?/i);
    const altMatch = match.match(/alt=[\'\"]([^\"\']*)[\'\"]/i);
    
    const existingStyles = styleMatch ? styleMatch[1] : '';
    // Use extracted value or default to '100%' if missing width attr
    const width = widthMatch ? widthMatch[1] : '100%'; 
    const height = heightMatch ? heightMatch[1] : 'auto'; 
    const alt = altMatch ? altMatch[1] : 'Image Placeholder';
    console.log(`[EmailHtmlRenderer:processHtml] Extracted for Image ${elementId}: width=${width}, height=${height}, alt=${alt}`);

    // Ensure display: block or inline-block for proper sizing
    let displayStyle = 'display: block;';
    if (existingStyles.includes('display:')) {
       displayStyle = existingStyles.match(/display:[^;]+/i)?.[0] || displayStyle;
    } 
    // Removed the else-if for inline-block, block is usually safer for email images

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
      // If height is auto, use aspect ratio for the placeholder
      finalHeightStyle = 'aspect-ratio: 16 / 9;'; 
      console.log(`[EmailHtmlRenderer:processHtml] Using aspect-ratio for Image ${elementId}`);
    } else {
      // Otherwise, use the specified height
      finalHeightStyle = `height: ${formatDimension(height)};`;
      console.log(`[EmailHtmlRenderer:processHtml] Using explicit height for Image ${elementId}: ${formatDimension(height)}`);
    }

    // Clean the existing styles string more carefully
    const cleanedExistingStyles = existingStyles
      .replace(/display:[^;]+;?/gi, '')
      .replace(/width:[^;]+;?/gi, '')
      .replace(/height:[^;]+;?/gi, '')
      .replace(/max-width:[^;]+;?/gi, '') // Remove max-width as well
      .replace(/aspect-ratio:[^;]+;?/gi, '') // Remove existing aspect-ratio
      .trim();

    const placeholderStyle = `
      ${displayStyle} 
      width: ${formatDimension(width)};
      ${finalHeightStyle}
      max-width: 100%; /* Always apply max-width */
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
      /* Append cleaned existing styles */
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

export const EmailHtmlRenderer = forwardRef<EmailHtmlRendererRef, EmailHtmlRendererProps>((
  { html, onContentReady, className },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({ 
    getContainer: () => containerRef.current,
  }), []);
  
  useEffect(() => {
    console.log("[EmailHtmlRenderer|useEffect html] Effect triggered. Current HTML length:", html?.length ?? 0);
    const container = containerRef.current;
    if (!container) {
      console.log("[EmailHtmlRenderer|useEffect html] Skipping: Container ref not ready.");
      return;
    }

    // Create or access iframe
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.minHeight = '300px'; // Minimum height
      iframe.style.border = '2px solid #d1d5db';
      iframe.style.borderRadius = '0.75rem'; // matches rounded-xl
      iframe.style.overflow = 'hidden'; // Hide scrollbars initially
      iframe.setAttribute('scrolling', 'no'); // Disable scrolling
      container.appendChild(iframe);
      iframeRef.current = iframe;
    }

    // Set HTML content to iframe
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      try {
        // Clear previous content by removing the iframe's document children
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          
          if (html) {
            console.log("[EmailHtmlRenderer|useEffect html] HTML content exists. Processing placeholders...");
            // (+) Process HTML for placeholders before writing
            const processedHtml = processHtmlForPlaceholders(html);
            
            // Add CSS to ensure content fills iframe properly
            const styleTag = `
              <style>
                html, body {
                  margin: 0;
                  padding: 20px;
                  height: auto;
                  overflow: visible;
                  background-color: white;
                }
                * {
                  box-sizing: border-box;
                }
              </style>
            `;
            iframeDoc.write(styleTag + processedHtml); // (+) Write processed HTML
          } else {
            iframeDoc.write('<div style="padding: 16px; text-align: center; color: #888;">No preview available.</div>');
          }
          
          iframeDoc.close();
          
          // Wait for iframe content to load before calling onContentReady
          iframe.onload = () => {
            console.log("[EmailHtmlRenderer|useEffect html] iframe.onload triggered.");
            
            // Resize iframe to content height
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
            
            // Add resize observer to handle dynamic content changes
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

    return () => {
      // Cleanup if needed
    };
  }, [html, onContentReady]);

  return <div ref={containerRef} className={className} />;
}); 