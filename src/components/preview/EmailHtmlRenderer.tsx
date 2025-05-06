import React, { useRef, useEffect } from 'react';
import { isPlaceholder } from '../../utils/placeholderUtils'; // Assuming path

interface EmailHtmlRendererProps {
  livePreviewHtml: string | null; // Renamed from html for clarity
}

const EmailHtmlRenderer: React.FC<EmailHtmlRendererProps> = ({ livePreviewHtml }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Function to process HTML: replace placeholders with styled divs
  const processHtml = (htmlString: string): string => {
    console.log('[EmailHtmlRenderer|processHtml] Starting HTML processing...');
    // Use DOMParser to safely manipulate HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const images = doc.querySelectorAll('img[data-placeholder="true"]');
    console.log(`[EmailHtmlRenderer|processHtml] Found ${images.length} placeholder images.`);

    images.forEach((img, index) => {
      const widthAttr = img.getAttribute('width');
      const heightAttr = img.getAttribute('height');
      const styleAttr = img.getAttribute('style') || ''; // Get existing style

      // Extract width and height, handling units like 'px', '%', or unitless
      const widthMatch = widthAttr?.match(/^(\d*\.?\d+)(%|px)?$/);
      const heightMatch = heightAttr?.match(/^(\d*\.?\d+)(%|px)?$/);
      const width = widthMatch ? widthMatch[1] : '150'; // Default width
      const widthUnit = widthMatch?.[2] || 'px'; // Default unit
      const height = heightMatch ? heightMatch[1] : '100'; // Default height
      const heightUnit = heightMatch?.[2] || 'px'; // Default unit

      // Special handling for height: auto - use aspect-ratio if possible
      const isHeightAuto = heightAttr?.toLowerCase() === 'auto';
      
      // Get the original data-element-id
      const originalElementId = img.getAttribute('data-element-id');

      console.log(`[EmailHtmlRenderer|processHtml] Placeholder ${index + 1}: Original w='${widthAttr}', h='${heightAttr}', data-element-id='${originalElementId}'. Extracted: w=${width}${widthUnit}, h=${height}${heightUnit}, isHeightAuto=${isHeightAuto}`);

      const placeholderDiv = doc.createElement('div');
      placeholderDiv.textContent = 'Click to upload image'; // Placeholder text
      
      // Base styles
      let styles = `
        display: flex; 
        align-items: center; 
        justify-content: center; 
        text-align: center; 
        border: 1px dashed #ccc; 
        background-color: #f0f0f0; 
        color: #666; 
        font-family: sans-serif; 
        font-size: 14px; 
        box-sizing: border-box; /* Include border in size */
      `;

      // Apply dimensions
      styles += `width: ${width}${widthUnit}; `;
      if (isHeightAuto) {
        if (widthUnit === 'px' && heightUnit !== 'auto') { // Calculate aspect-ratio only if width is fixed
             // Use a default or calculated aspect ratio if height is also not defined properly. Let's assume 16/9 or use a default fixed height
             // placeholderDiv.style.aspectRatio = `${width} / ${height}`; // Requires browser support
             styles += `height: ${parseFloat(width) * (9/16)}${widthUnit};`; // Fallback to 16:9 aspect ratio height
             console.log(`[EmailHtmlRenderer|processHtml] Placeholder ${index + 1}: Height auto, using calculated aspect-ratio height.`);
        } else {
            styles += `height: 100px;`; // Fallback height if width is not fixed or height info is missing
            console.log(`[EmailHtmlRenderer|processHtml] Placeholder ${index + 1}: Height auto, using fallback 100px height.`);
        }
      } else {
        styles += `height: ${height}${heightUnit}; `;
      }
      
      // Preserve original inline styles if they don't conflict
      // Basic merge: append original style, letting new styles override if defined twice.
      // A more robust merge might be needed for complex cases.
      styles += styleAttr;

      placeholderDiv.setAttribute('style', styles.trim());
      // Copy necessary data attributes if needed
      placeholderDiv.setAttribute('data-placeholder-processed', 'true'); 
      placeholderDiv.setAttribute('data-original-element-id', img.id); // Keep track of the original element ID if needed later
      // Ensure data-element-id is copied directly
      if (originalElementId) {
          placeholderDiv.setAttribute('data-element-id', originalElementId);
      }

      console.log(`[EmailHtmlRenderer|processHtml] Placeholder ${index + 1}: Replacing img with div. Style: ${placeholderDiv.getAttribute('style')}`);
      
      img.parentNode?.replaceChild(placeholderDiv, img);
    });

    // Serialize the document back to string
    // Use doc.documentElement.outerHTML for the full HTML structure
    const finalHtml = doc.documentElement.outerHTML;
    console.log('[EmailHtmlRenderer|processHtml] Finished HTML processing.');
    return finalHtml;
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      console.log('[EmailHtmlRenderer|useEffect] Iframe ref not available yet.');
      return;
    }

    console.log('[EmailHtmlRenderer|useEffect] livePreviewHtml changed or iframe ref ready.');

    // --- Start of original snippet ---
    if (livePreviewHtml) { // Changed from 'html' to 'livePreviewHtml'
        console.log('[EmailHtmlRenderer|useEffect] HTML content exists. Processing placeholders...');
        try {
            const processedHtml = processHtml(livePreviewHtml); // Use livePreviewHtml and the defined processHtml
            // Log the HTML right before setting srcdoc
            console.log('[EmailHtmlRenderer|useEffect] HTML to be set in iframe (first 1500 chars):', processedHtml.substring(0, 1500));
            iframe.srcdoc = processedHtml; // Set the processed HTML (iframe is now defined via ref)
        } catch (error) {
            console.error("[EmailHtmlRenderer|useEffect] Error processing or setting HTML:", error);
            iframe.srcdoc = '<html><body>Error loading preview.</body></html>'; // Show error in iframe
        }
    } else {
      console.log('[EmailHtmlRenderer|useEffect] livePreviewHtml is null or empty, clearing iframe.');
      iframe.srcdoc = '<html><body>No content</body></html>'; // Handle null/empty case
    }
    // --- End of original snippet ---

    // Add iframe load listener to potentially trigger recalculations if needed elsewhere
    const handleLoad = () => {
      console.log('[EmailHtmlRenderer|useEffect] Iframe finished loading content.');
      // If overlays or other calculations depended on iframe load, signal here.
      // Example: iframe.contentWindow?.dispatchEvent(new Event('iframeloaded')); 
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      console.log('[EmailHtmlRenderer|useEffect] Cleanup: Removed load listener.');
    };

  }, [livePreviewHtml]); // Dependency array ensures this runs when livePreviewHtml changes

  return (
    <iframe
      ref={iframeRef}
      title="Email Preview"
      width="100%"
      height="100%"
      style={{ border: 'none', minHeight: '400px' }} // Basic styling
      sandbox="allow-scripts allow-same-origin" // Allow scripts if necessary, but restrict navigation etc.
    />
  );
};

export default EmailHtmlRenderer; 