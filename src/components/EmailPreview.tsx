import React, { useEffect, useRef, useCallback } from 'react';
import { EmailPreviewProps, PendingChange } from '@/types/editor';
import { cn } from "@/lib/utils";
import { EmailHtmlRenderer, EmailHtmlRendererRef } from './EmailHtmlRenderer';

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
}) => {
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const htmlRendererRef = useRef<EmailHtmlRendererRef>(null);

  const calculateAndApplyOverlays = useCallback(() => { 
    const container = htmlRendererRef.current?.getContainer(); 
    const overlayContainer = overlayContainerRef.current;

    if (!container || !overlayContainer || !pendingChanges) {
      console.log("[EmailPreview] calculateAndApplyOverlays skipped: Missing container, overlay, or pendingChanges.");
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
    
    // Apply styles to elements in the iframe document
    const iframeDoc = iframe.contentDocument;
    if (Array.isArray(pendingChanges)) {
      pendingChanges.forEach((change: PendingChange) => {
        if (change.changeType === 'delete') {
          const targetElement = iframeDoc.getElementById(change.elementId);
          if (targetElement) {
            targetElement.style.opacity = '1';
            targetElement.style.textDecoration = 'none';
          }
        }
      });
    }
    
    let allFound = true;
    if (Array.isArray(pendingChanges)) {
      pendingChanges.forEach((change: PendingChange) => {
        const targetElement = iframeDoc.getElementById(change.elementId);
        if (!targetElement) {
          console.warn(`[EmailPreview] Overlay target element [ID: ${change.elementId}] not found in iframe. Skipping.`);
          allFound = false;
          return;
        }
        
        // Get element position relative to iframe
        const targetRect = targetElement.getBoundingClientRect();
        const iframeRect = iframe.getBoundingClientRect();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${iframeRect.left + targetRect.left - container.offsetLeft}px`;
        overlay.style.top = `${iframeRect.top + targetRect.top - container.offsetTop + iframe.contentWindow.scrollY}px`;
        overlay.style.width = `${targetRect.width}px`;
        overlay.style.height = `${targetRect.height}px`;
        overlay.style.pointerEvents = 'none';
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
    }
    
    if (allFound) {
      console.log("[EmailPreview] Overlay calculation complete. All elements found.");
    } else {
      console.warn("[EmailPreview] Overlay calculation complete. Some elements were NOT found.");
    }
  }, [pendingChanges]); 

  const handleContentReady = useCallback(() => {
    console.log("[EmailPreview] handleContentReady called. Waiting for paint cycle...");
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
        className={cn(frameClass, frameBackground, inversionClass)}
        style={{ boxShadow: 'none' }}
      >
        <EmailHtmlRenderer
          ref={htmlRendererRef}
          html={currentHtml}
          onContentReady={handleContentReady}
          className="w-full"
        />
        <div 
          ref={overlayContainerRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
      </div>
      </div>
    </div>
  );
};
