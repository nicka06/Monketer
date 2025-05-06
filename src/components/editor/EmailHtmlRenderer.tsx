import React, { useEffect, useRef, useState, useCallback } from 'react';
// Keep V2 types if findElementById is still used internally for styling, otherwise remove
import { EmailTemplateV2Type, EmailElement as EmailElementTypeV2 } from '@/types/v2'; 

interface EmailHtmlRendererProps {
  html: string; // Expect 'html' prop
  semanticTemplate: EmailTemplateV2Type | null; // Add back semanticTemplate
  onPlaceholderClick: (data: { elementId: string; path: string; type: 'image' | 'link' | 'text' }) => void; // Add back onPlaceholderClick
  onContentReady?: () => void; 
  padding?: string;
}

// Helper to find element by ID in the template
const findElementById = (template: EmailTemplateV2Type | null, elementId: string): EmailElementTypeV2 | null => {
  if (!template) return null;
  for (const section of template.sections) {
    const found = section.elements.find(el => el.id === elementId);
    // Explicitly check for undefined BEFORE checking properties
    if (found !== undefined && typeof found.id === 'string') {
      // If found and has an id, we assume it conforms to EmailElementTypeV2 based on our data structure
      return found as EmailElementTypeV2; // Cast to satisfy the return type explicitly
    }
  }
  return null; 
};

// Remove forwardRef
const EmailHtmlRenderer: React.FC<EmailHtmlRendererProps> = ({ 
  html, // Use 'html' prop 
  semanticTemplate, // Add back semanticTemplate
  onPlaceholderClick, // Add back onPlaceholderClick
  onContentReady, 
  padding = '0px' 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = useState('500px');

  const updateIframeContent = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow?.document) return;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html); // Use 'html' prop here
    doc.close();

    // Inject base styles and padding
    const style = doc.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: ${padding};
        font-family: sans-serif; /* Basic default font */
        background-color: #ffffff; /* Ensure default background */
        height: auto; /* Allow body height to adjust */
        overflow: hidden; /* Prevent internal scrollbars */
      }
      img, button, a, p, h1, h2, h3, h4, h5, h6, div, span {
        cursor: default; /* Standard cursor for elements */
      }
      /* Basic placeholder styling */
      .placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f0f0f0;
          border: 1px dashed #cccccc;
          color: #888888;
          text-align: center;
          font-size: 14px;
          cursor: pointer !important; /* Override default */
          min-height: 50px; /* Minimum height for placeholders */
          padding: 10px;
          box-sizing: border-box; /* Include padding/border in size */
          overflow: hidden; /* Prevent text overflow */
      }
      .placeholder-image {
          /* Specific image placeholder styles if needed */
      }
       .placeholder-button {
          /* Specific button placeholder styles (use anchor styling) */
          display: inline-block; /* Make it behave like a button */
          padding: 12px 25px; /* Match default button padding */
          text-decoration: none;
          cursor: pointer !important;
          /* We use the placeholder class for background/border */
       }
       .placeholder-link {
          /* Specific link placeholder styles */
          text-decoration: underline;
          color: #007bff; /* Example link color */
          cursor: pointer !important;
       }
    `;
    doc.head.appendChild(style);

    // Find and replace placeholders
    const placeholderElements = doc.querySelectorAll('[data-placeholder-type]');
    console.log(`[EmailHtmlRenderer] Found ${placeholderElements.length} placeholder elements.`); // Log count
    placeholderElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const elementId = htmlEl.dataset.elementId;
      const propertyPath = htmlEl.dataset.propertyPath;
      const placeholderType = htmlEl.dataset.placeholderType as 'image' | 'link' | 'text';
      
      console.log(`[EmailHtmlRenderer] Processing placeholder ${index + 1}:`, { elementId, propertyPath, placeholderType, tagName: htmlEl.tagName, outerHTML: htmlEl.outerHTML.substring(0, 150) + '...' });

      if (!elementId || !propertyPath || !placeholderType) {
          console.warn(`[EmailHtmlRenderer] Skipping placeholder ${index+1} due to missing data attributes.`);
          return;
      }

      let replacementElement: HTMLElement | null = null;
      let isReplacement = false; 

      // --- IMAGE PLACEHOLDER --- 
      if (placeholderType === 'image' && htmlEl.tagName === 'IMG') {
        console.log(`[EmailHtmlRenderer] Handling IMAGE placeholder for ${elementId}`);
        const originalElementData = findElementById(semanticTemplate, elementId);
        
        let width = '100%'; // Default width
        let height = 'auto'; // Default height

        if (originalElementData) {
            // Determine width/height from semantic data, checking element type first
            width = originalElementData.layout?.width || 
                    (originalElementData.type === 'image' ? originalElementData.properties?.image?.width : undefined) || 
                    '100%'; 
            height = originalElementData.layout?.height || 
                     (originalElementData.type === 'image' ? originalElementData.properties?.image?.height : undefined) || 
                     'auto';
        }
        
        replacementElement = doc.createElement('div');
        replacementElement.className = 'placeholder placeholder-image';
        replacementElement.textContent = 'click to add image';
        replacementElement.style.width = width; 
        replacementElement.style.height = height;
        replacementElement.style.maxWidth = '100%';
        // Force flex centering for the text
        replacementElement.style.display = 'flex'; 
        replacementElement.style.alignItems = 'center';
        replacementElement.style.justifyContent = 'center';
        replacementElement.style.padding = '10px'; 
        replacementElement.style.textAlign = 'center';
        isReplacement = true;
        console.log(`[EmailHtmlRenderer] Created replacement div for image ${elementId}. Text: ${replacementElement.textContent}, Width: ${width}, Height: ${height}`);

      // --- BUTTON/LINK PLACEHOLDER --- 
      } else if (placeholderType === 'link' && htmlEl.tagName === 'A') {
        console.log(`[EmailHtmlRenderer] Handling LINK placeholder for ${elementId}`);
        replacementElement = htmlEl; // Modify the existing anchor
        
        // Set href BEFORE adding listener
        replacementElement.setAttribute('href', 'javascript:void(0);'); 
        console.log(`[EmailHtmlRenderer] Set href='javascript:void(0);' for link ${elementId}. Current outerHTML: ${replacementElement.outerHTML.substring(0,150)}...`);
        
        if(htmlEl.querySelector('img')) { // Linked image
            replacementElement.classList.add('placeholder', 'placeholder-link');
            replacementElement.style.display = 'inline-block';
            replacementElement.textContent = '[click to add link]';
            console.log(`[EmailHtmlRenderer] Styled as linked image placeholder: ${elementId}`);
        } else { // Button-like link
             replacementElement.classList.add('placeholder', 'placeholder-button'); 
             console.log(`[EmailHtmlRenderer] Styled as button placeholder: ${elementId}. Original text: ${replacementElement.textContent}`);
        }
        isReplacement = false; 
      } 
      // Add other placeholder types (text) if needed here
      
      if (replacementElement) {
         // Store reference for listener check
         const elementForListener = replacementElement; 
         elementForListener.addEventListener('click', (e) => {
            console.log(`[EmailHtmlRenderer] Click handler fired for ${elementId}. Event:`, e); // Log event object
            console.log(`[EmailHtmlRenderer] Calling preventDefault() for ${elementId}.`);
            e.preventDefault(); 
            console.log(`[EmailHtmlRenderer] Calling stopPropagation() for ${elementId}.`);
            e.stopPropagation();
            console.log(`[EmailHtmlRenderer] Calling onPlaceholderClick for ${elementId}:`, { elementId, path: propertyPath, type: placeholderType });
            onPlaceholderClick({ elementId, path: propertyPath, type: placeholderType });
          });
          // Log outerHTML *after* adding listener
          console.log(`[EmailHtmlRenderer] Added click listener to placeholder ${elementId}. Element outerHTML: ${elementForListener.outerHTML.substring(0, 150)}...`);

          // Replace the original placeholder element ONLY IF we created a new one
          if (isReplacement && replacementElement !== htmlEl) {
              const parent = htmlEl.parentNode;
              if (parent) {
                 console.log(`[EmailHtmlRenderer] Attempting replaceChild for ${elementId}. Parent node:`, parent);
                 parent.replaceChild(replacementElement, htmlEl);
                 // Check if parent is an Element before accessing outerHTML
                 const parentLogHTML = parent instanceof Element ? parent.outerHTML.substring(0, 200) + '...' : '[Parent is not an Element]';
                 console.log(`[EmailHtmlRenderer] Executed replaceChild for ${elementId}. Parent HTML after replace: ${parentLogHTML}`);
              } else {
                  console.error(`[EmailHtmlRenderer] Cannot replace element ${elementId}: parentNode is null.`);
              }
          } else if (!isReplacement) {
              console.log(`[EmailHtmlRenderer] Modified existing element in-place for ${elementId}. Final outerHTML: ${htmlEl.outerHTML.substring(0, 150)}...`);
          }
      } else {
          console.warn(`[EmailHtmlRenderer] No replacement or modification logic matched for placeholder ${index+1}:`, { placeholderType, tagName: htmlEl.tagName });
      }
    });
    console.log("[EmailHtmlRenderer] Finished processing all placeholder elements."); // Add completion log

    adjustIframeHeight();

    // Call onContentReady if provided
    if (onContentReady) {
        console.log("[EmailHtmlRenderer] Content processing complete, calling onContentReady.");
        onContentReady();
    }

  }, [html, onPlaceholderClick, padding, semanticTemplate, onContentReady]); // Add onContentReady dependency

  // Adjust iframe height based on its content
  const adjustIframeHeight = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow?.document?.body) {
      // Use scrollHeight for potentially taller content
      const bodyHeight = iframe.contentWindow.document.body.scrollHeight;
      // Add a small buffer (e.g., 10px) to prevent scrollbars in some cases
      setIframeHeight(`${bodyHeight + 10}px`); 
    }
  };

  // Effect to add/remove load listener on mount/unmount
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const handleLoad = () => {
        console.log("[EmailHtmlRenderer] >>> handleLoad function executed <<< "); 
        console.log("[EmailHtmlRenderer] iframe load event fired. Running updateIframeContent.");
        updateIframeContent(); 
        
        const resizeObserver = new ResizeObserver(adjustIframeHeight);
        if (iframe.contentWindow?.document?.body) {
          resizeObserver.observe(iframe.contentWindow.document.body);
        } else {
          console.warn("[EmailHtmlRenderer] Could not attach ResizeObserver: iframe body not found after load.");
        }
        return () => {
            console.log("[EmailHtmlRenderer] Disconnecting ResizeObserver.");
            resizeObserver.disconnect(); 
        };
      };

      console.log("[EmailHtmlRenderer] Adding 'load' event listener to iframe.");
      iframe.addEventListener('load', handleLoad);
      
      return () => {
        console.log("[EmailHtmlRenderer] Removing 'load' event listener from iframe.");
        iframe.removeEventListener('load', handleLoad);
      };
    }
  }, [updateIframeContent]); // updateIframeContent is the key dependency here

  // Effect to update srcDoc when htmlContent changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && html) {
        console.log("[EmailHtmlRenderer] Updating iframe srcDoc due to htmlContent change.");
        iframe.srcdoc = html;
    } else if (iframe && !html) {
        console.log("[EmailHtmlRenderer] Clearing iframe srcDoc because htmlContent is empty.");
        iframe.srcdoc = '<html><head></head><body></body></html>'; // Clear content if htmlContent is null/empty
    }
  }, [html]); // Rerun only when htmlContent changes

  // Log htmlContent length on each render
  console.log(`[EmailHtmlRenderer] Rendering. htmlContent length: ${html?.length ?? 0}`);

  return (
    // Wrap iframe in a div to attach containerRef
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}> 
      <iframe
        ref={iframeRef}
        // srcDoc is now set via useEffect based on htmlContent
        title="Email Preview"
        width="100%"
        height={iframeHeight} // Dynamic height
        style={{
          border: '1px solid #e2e8f0', // Consistent border
          borderRadius: '0.375rem', // Matches input fields
          backgroundColor: '#ffffff', // Ensure white background
          transition: 'height 0.2s ease-in-out' // Smooth height transition
        }}
        sandbox="allow-scripts allow-same-origin" // Keep sandbox for security
      />
    </div>
  );
};

export { EmailHtmlRenderer }; // Use named export 