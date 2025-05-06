import React, { useEffect, useRef, useCallback } from 'react';
import { EmailPreviewProps, PendingChange } from '@/types/editor';
import { cn } from "@/lib/utils";
import { EmailHtmlRenderer } from './EmailHtmlRenderer';
import { isPlaceholder } from '@/services/v2/htmlGenerator';
import { 
  EmailElement as EmailElementTypeV2,
  ImageElementProperties, 
  ButtonElementProperties,
} from '@/types/v2';

// Utility function to wait for the next paint cycle
function waitForPaintCycle(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  currentHtml,
  pendingChanges,
  previewMode,
  previewDevice,
  semanticTemplate,
  onPlaceholderActivate,
}) => {
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const htmlRendererRef = useRef<{ getContainer: () => HTMLDivElement | null } | null>(null);

  const calculateAndApplyOverlays = useCallback(() => { 
    const container = htmlRendererRef.current?.getContainer(); 
    const overlayContainer = overlayContainerRef.current;

    if (!container || !overlayContainer) {
      console.log("[EmailPreview] calculateAndApplyOverlays skipped: Missing container or overlayContainer.");
      return;
    }

    console.log(`[EmailPreview] Running calculateAndApplyOverlays...`);

    // Clear existing overlays
    overlayContainer.innerHTML = '';
    
    // Find the iframe inside the container
    const iframe = container.querySelector('iframe');
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      console.warn("[EmailPreview] Could not access iframe content document.");
      return;
    }
    
    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    const iframeRect = iframe.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect(); // Use container rect for offset
    const scrollY = iframeWin.scrollY;

    let allPendingFound = true;
    
    // --- 1. Apply overlays for PENDING CHANGES --- 
    console.log("[EmailPreview] Processing Pending Changes Overlays...");
    if (Array.isArray(pendingChanges) && pendingChanges.length > 0) {
      // First pass: Reset styles for deleted elements to calculate correct bounds
      pendingChanges.forEach(change => {
        if (change.changeType === 'delete') {
          const targetElement = iframeDoc.getElementById(change.elementId);
          if (targetElement) {
            targetElement.style.opacity = '1'; // Reset opacity
            targetElement.style.textDecoration = 'none'; // Reset decoration
          }
        }
      });
    
      // Second pass: Create overlays
      pendingChanges.forEach((change: PendingChange) => {
        const targetElement = iframeDoc.getElementById(change.elementId);
        if (!targetElement) {
          console.warn(`[EmailPreview] Pending Change Overlay: Element [ID: ${change.elementId}] not found in iframe. Skipping.`);
          allPendingFound = false;
          return;
        }
        
        // Get element position relative to iframe
        const targetRect = targetElement.getBoundingClientRect();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${iframeRect.left + targetRect.left - containerRect.left}px`;
        overlay.style.top = `${iframeRect.top + targetRect.top - containerRect.top + scrollY}px`;
        overlay.style.width = `${targetRect.width}px`;
        overlay.style.height = `${targetRect.height}px`;
        overlay.style.pointerEvents = 'none'; // These are visual-only
        overlay.style.zIndex = '10';
        overlay.style.boxSizing = 'border-box';
        overlay.style.borderRadius = '3px';
        
        // Style based on change type
        switch (change.changeType) {
          case 'add': overlay.style.border = '2px dashed #22c55e'; overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; break;
          case 'edit': overlay.style.border = '2px solid #eab308'; overlay.style.backgroundColor = 'rgba(234, 179, 8, 0.1)'; break;
          case 'delete': 
            overlay.style.border = '2px dashed #ef4444'; 
            overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            if (targetElement) {
              targetElement.style.opacity = '0.6';
              targetElement.style.textDecoration = 'line-through';
            }
            break;
        }
        
        overlayContainer?.appendChild(overlay);
      });
      
      if (allPendingFound) {
        console.log("[EmailPreview] Pending Change Overlay calculation complete. All elements found.");
      } else {
        console.warn("[EmailPreview] Pending Change Overlay calculation complete. Some elements were NOT found.");
      }
    } else {
      console.log("[EmailPreview] No pending changes to overlay.");
    }

    // --- 2. Apply overlays for PLACEHOLDERS (using semanticTemplate) --- 
    console.log("[EmailPreview] Processing Placeholder Overlays...");
    let placeholdersFound = 0;
    if (semanticTemplate?.sections) {
      semanticTemplate.sections.forEach(section => {
        section.elements.forEach((element: EmailElementTypeV2) => {
          let isImagePlaceholder = false;
          let isLinkPlaceholder = false;
          
          if (element.type === 'image') {
            const props = element.properties as ImageElementProperties;
            if (props.image?.src && isPlaceholder(props.image.src)) {
              isImagePlaceholder = true;
            }
            if (props.image?.linkHref && isPlaceholder(props.image.linkHref)) {
              isLinkPlaceholder = true;
            }
          } else if (element.type === 'button') {
            const props = element.properties as ButtonElementProperties;
            if (props.button?.href && isPlaceholder(props.button.href)) {
              isLinkPlaceholder = true;
            }
          }

          if (isImagePlaceholder || isLinkPlaceholder) {
            const targetElement = iframeDoc.querySelector<HTMLElement>(`[data-element-id="${element.id}"]`);
            if (!targetElement) {
              console.warn(`[EmailPreview] Placeholder Overlay: Element [data-element-id: ${element.id}] not found in iframe. Skipping.`);
              return;
            }

            placeholdersFound++;
            const targetRect = targetElement.getBoundingClientRect();

            // (+) Add detailed logging for coordinates
            console.log(`[EmailPreview] Coords for ${element.id}:`);
            console.log(`  - Target Rect (in iframe):`, JSON.stringify(targetRect));
            console.log(`  - Iframe Rect:`, JSON.stringify(iframeRect));
            console.log(`  - Container Rect:`, JSON.stringify(containerRect));
            console.log(`  - Iframe ScrollY:`, scrollY);

            // Create clickable overlay
            const placeholderOverlay = document.createElement('div');
            placeholderOverlay.classList.add('placeholder-overlay-clickable');
            placeholderOverlay.style.position = 'absolute';
            // Adjust calculation to account for the iframe's 2px border
            const iframeBorderWidth = 2; 
            const calculatedLeft = iframeRect.left + targetRect.left - containerRect.left + iframeBorderWidth;
            const calculatedTop = iframeRect.top + targetRect.top - containerRect.top + scrollY + iframeBorderWidth;
            console.log(`  - Calculated Overlay Left:`, calculatedLeft);
            console.log(`  - Calculated Overlay Top:`, calculatedTop);
            placeholderOverlay.style.left = `${calculatedLeft}px`;
            placeholderOverlay.style.top = `${calculatedTop}px`;
            placeholderOverlay.style.width = `${targetRect.width}px`;
            placeholderOverlay.style.height = `${targetRect.height}px`;
            placeholderOverlay.style.zIndex = '20';
            placeholderOverlay.style.cursor = 'pointer';
            placeholderOverlay.style.boxSizing = 'border-box';
            placeholderOverlay.style.border = '2px dashed blue';
            placeholderOverlay.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            placeholderOverlay.setAttribute('title', isImagePlaceholder ? 'Click to upload image' : 'Click to set link');

            // Determine type and path
            let path = 'unknown.path';
            const type: 'image' | 'link' = isImagePlaceholder ? 'image' : 'link';
            if (isImagePlaceholder && element.type === 'image') {
              path = 'image.src';
            } else if (isLinkPlaceholder) {
              if (element.type === 'image') path = 'image.linkHref';
              else if (element.type === 'button') path = 'button.href';
            }
            
            // Add click listener to call onPlaceholderActivate
            placeholderOverlay.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log(`[EmailPreview] Placeholder overlay clicked for element with data-element-id=${element.id} (path: ${path}, type: ${type})`);
              onPlaceholderActivate({ elementId: element.id, path: path, type: type });
            });

            overlayContainer?.appendChild(placeholderOverlay);
          }
        });
      });
      console.log(`[EmailPreview] Placeholder Overlay calculation complete. Found ${placeholdersFound} placeholders.`);
    } else {
      console.log("[EmailPreview] No semantic template available to find placeholders.");
    }
  }, [pendingChanges, semanticTemplate, onPlaceholderActivate]);

  const handleContentReady = useCallback(() => {
    console.log("[EmailPreview] handleContentReady called (likely from EmailHtmlRenderer). Waiting for paint cycle...");
    waitForPaintCycle(() => {
      console.log("[EmailPreview] Paint cycle finished. Executing calculateAndApplyOverlays.");
      calculateAndApplyOverlays();
    });
  }, [calculateAndApplyOverlays]);

  // Effect for handling iframe scroll
  useEffect(() => {
    const container = htmlRendererRef.current?.getContainer();
    if (!container) return;
    
    const iframe = container.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;
    
    const handleIframeScroll = () => {
      console.log("[EmailPreview] Iframe scroll detected. Waiting for paint cycle...");
      waitForPaintCycle(() => {
        console.log("[EmailPreview] Paint cycle after scroll finished. Recalculating overlays.");
        calculateAndApplyOverlays();
      });
    };
    
    // Add scroll event listener to iframe content window
    iframe.contentWindow.addEventListener('scroll', handleIframeScroll);
    
    return () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.removeEventListener('scroll', handleIframeScroll);
      }
    };
  }, [calculateAndApplyOverlays]);

  const frameClass = 
    previewDevice === 'mobile'
      ? 'w-[375px] mx-auto rounded-xl overflow-hidden'
      : 'max-w-[650px] w-full mx-auto rounded-xl overflow-hidden';
      
  const frameBackground = 'bg-white';
  const inversionClass = previewMode === 'dark' ? 'filter invert hue-rotate-180' : '';
  const outerContainerClass = "flex justify-center pt-4 pb-20"; 

    return (
    <div className={outerContainerClass}>
      <div 
        className={cn("relative", frameClass, frameBackground, inversionClass)}
        style={{ boxShadow: 'none' }}
      >
        <EmailHtmlRenderer
          ref={htmlRendererRef}
          html={currentHtml}
          onContentReady={handleContentReady}
        />
        <div 
          ref={overlayContainerRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ zIndex: 5 }}
        >
        {/* Child overlays for pending changes have pointer-events:none set individually */}
        {/* Child overlays for placeholders do NOT have pointer-events:none */}
      </div>
      </div>
    </div>
  );
};
