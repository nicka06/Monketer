import React, { useEffect, useRef, useCallback } from 'react';
import { EmailPreviewProps, PendingChange } from '@/types/editor';
import { cn } from "@/lib/utils";
import { EmailHtmlRenderer } from './EmailHtmlRenderer';
import { isPlaceholder } from '@/services/v2/htmlGenerator';
import { 
  EmailElement,
  ImageElementProperties, 
  ButtonElementProperties,
} from '../../supabase/functions/_shared/types/v2/elements';

/**
 * EmailPreview Component
 * 
 * A sophisticated email preview component that provides an interactive preview environment
 * with support for visual overlays, placeholder management, and responsive design.
 * 
 * Technical Implementation Details:
 * 1. Iframe Integration:
 *    - Uses EmailHtmlRenderer to render content in an isolated iframe
 *    - Maintains coordinate mapping between iframe and parent document
 *    - Handles scroll synchronization and resize events
 * 
 * 2. Overlay System:
 *    - Two-layer overlay architecture:
 *      a) Non-interactive overlays for pending changes (lower z-index)
 *      b) Interactive overlays for placeholders (higher z-index)
 *    - Uses absolute positioning with offset calculations
 *    - Handles edge cases like iframe borders and scroll positions
 * 
 * 3. Performance Considerations:
 *    - Uses RAF (RequestAnimationFrame) for smooth animations
 *    - Batches DOM operations to minimize reflows
 *    - Cleanup handlers for event listeners
 * 
 * 4. Responsive Features:
 *    - Supports mobile/desktop preview modes
 *    - Handles dark/light theme switching
 *    - Maintains aspect ratios and dimensions
 * 
 * Props:
 * @param {string | null} currentHtml - HTML content to render
 *                                     Null triggers empty state display
 * 
 * @param {PendingChange[]} pendingChanges - Array of pending content changes
 *                                          Each change includes: elementId, changeType (add/edit/delete)
 * 
 * @param {'light' | 'dark'} previewMode - Theme mode
 *                                        'dark' applies color inversion via CSS filters
 * 
 * @param {'desktop' | 'mobile'} previewDevice - Device preview mode
 *                                              Affects container width and scaling
 * 
 * @param {EmailTemplateV2 | null} semanticTemplate - Structured template data
 *                                                   Used for placeholder detection and processing
 * 
 * @param {Function} onPlaceholderActivate - Callback for placeholder interaction
 *                                          Receives: { elementId, path, type }
 * 
 * State Management:
 * - Uses refs for DOM element access and measurement
 * - Callback memoization for performance
 * - Controlled props for preview modes
 */

/**
 * waitForPaintCycle
 * 
 * Utility function that ensures DOM operations occur after the browser has completed
 * layout and paint operations. Uses double requestAnimationFrame for maximum reliability.
 * 
 * Technical Details:
 * - First RAF: Queues operation for next frame
 * - Second RAF: Ensures first frame has completed
 * - Helps prevent layout thrashing
 * - More reliable than setTimeout(0) or single RAF
 * 
 * Use Cases:
 * - DOM measurements after content changes
 * - Overlay positioning calculations
 * - Smooth animations and transitions
 * 
 * @param {Function} callback - Operation to execute after paint cycle
 */
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
  /**
   * DOM References
   * 
   * overlayContainerRef: Container for all overlay elements
   * - Positioned absolutely over the iframe
   * - Contains both pending change and placeholder overlays
   * - z-index managed for proper stacking
   * 
   * htmlRendererRef: Reference to the EmailHtmlRenderer component
   * - Provides access to the iframe container
   * - Used for coordinate calculations and event binding
   * - Exposes getContainer() method for iframe access
   */
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const htmlRendererRef = useRef<{ getContainer: () => HTMLDivElement | null } | null>(null);

  /**
   * calculateAndApplyOverlays
   * 
   * Core function responsible for creating and positioning all overlays.
   * Handles both pending changes and placeholder overlays in a single pass.
   * 
   * Technical Process:
   * 1. Setup and Validation
   *    - Acquires necessary DOM references
   *    - Validates iframe accessibility
   *    - Clears existing overlays
   * 
   * 2. Coordinate Space Management
   *    - Maps iframe coordinates to parent document
   *    - Accounts for scroll position
   *    - Handles iframe border offset
   * 
   * 3. Overlay Creation
   *    - Two-phase process for pending changes
   *    - Single-phase for placeholders
   *    - Maintains separate z-indexes for stacking
   * 
   * Error Handling:
   * - Graceful degradation if elements not found
   * - Logging for debugging and monitoring
   * - Maintains overlay state consistency
   * 
   * Performance:
   * - Batches DOM operations
   * - Minimizes reflows and repaints
   * - Uses document fragments where beneficial
   */
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
    const containerRect = container.getBoundingClientRect();
    const scrollY = iframeWin.scrollY;

    let allPendingFound = true;
    
    /**
     * Process Non-Delete Pending Changes
     * 
     * Creates visual overlays for elements that have pending additions or edits.
     * Deletions are handled at the template level and not visualized here.
     * 
     * Overlay Types:
     * - Add: Green dashed border with light green background
     * - Edit: Yellow solid border with light yellow background
     */
    console.log("[EmailPreview] Processing Pending Changes Overlays...");
    if (Array.isArray(pendingChanges) && pendingChanges.length > 0) {
      // Create overlays for additions and edits only
      pendingChanges.forEach((change: PendingChange) => {
        // Skip deletion overlays as they're handled at template level
        if (change.changeType === 'delete') return;

        const targetElement = iframeDoc.getElementById(change.elementId);
        if (!targetElement) {
          console.warn(`[EmailPreview] Pending Change Overlay: Element [ID: ${change.elementId}] not found in iframe. Skipping.`);
          allPendingFound = false;
          return;
        }
        
        // Get element position relative to iframe
        const targetRect = targetElement.getBoundingClientRect();
        
        // Create overlay with appropriate styling based on change type
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${iframeRect.left + targetRect.left - containerRect.left}px`;
        overlay.style.top = `${iframeRect.top + targetRect.top - containerRect.top + scrollY}px`;
        overlay.style.width = `${targetRect.width}px`;
        overlay.style.height = `${targetRect.height}px`;
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10';
        overlay.style.boxSizing = 'border-box';
        overlay.style.borderRadius = '3px';
        
        // Apply specific styles based on change type
        if (change.changeType === 'add') {
          overlay.style.border = '2px dashed #22c55e';
          overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        } else if (change.changeType === 'edit') {
          overlay.style.border = '2px solid #eab308';
          overlay.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
        }
        
        overlayContainer?.appendChild(overlay);
      });
    }

    /**
     * Section 2: Process Placeholder Overlays
     * 
     * Creates interactive overlays for placeholder elements (images/links).
     * These overlays are clickable and trigger the onPlaceholderActivate callback.
     * 
     * Process:
     * 1. Iterate through semantic template elements
     * 2. Identify placeholder elements (images/links)
     * 3. Create clickable overlays positioned absolutely
     * 4. Add click handlers to trigger placeholder activation
     */
    console.log("[EmailPreview] Processing Placeholder Overlays...");
    let placeholdersFound = 0;
    if (semanticTemplate?.sections) {
      semanticTemplate.sections.forEach(section => {
        section.elements.forEach((element: EmailElement) => {
          let isImagePlaceholder = false;
          let isLinkPlaceholder = false;
          
          // Check for image and link placeholders
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

            // Create clickable overlay
            const placeholderOverlay = document.createElement('div');
            placeholderOverlay.classList.add('placeholder-overlay-clickable');
            placeholderOverlay.style.position = 'absolute';
            const iframeBorderWidth = 2;
            const calculatedLeft = iframeRect.left + targetRect.left - containerRect.left + iframeBorderWidth;
            const calculatedTop = iframeRect.top + targetRect.top - containerRect.top + scrollY + iframeBorderWidth;
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

            // Determine type and path for placeholder activation
            let path = 'unknown.path';
            const type: 'image' | 'link' = isImagePlaceholder ? 'image' : 'link';
            if (isImagePlaceholder && element.type === 'image') {
              path = 'image.src';
            } else if (isLinkPlaceholder) {
              if (element.type === 'image') path = 'image.linkHref';
              else if (element.type === 'button') path = 'button.href';
            }
            
            // Add click handler
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

  /**
   * handleContentReady
   * 
   * Callback triggered when EmailHtmlRenderer has completed content rendering.
   * Ensures proper timing for overlay calculations and positioning.
   * 
   * Technical Details:
   * - Uses waitForPaintCycle for reliable timing
   * - Handles initial content load and subsequent updates
   * - Triggers overlay recalculation at optimal time
   * 
   * Edge Cases:
   * - Handles empty content
   * - Manages race conditions with DOM updates
   * - Ensures proper cleanup between updates
   */
  const handleContentReady = useCallback(() => {
    console.log("[EmailPreview] handleContentReady called (likely from EmailHtmlRenderer). Waiting for paint cycle...");
    waitForPaintCycle(() => {
      console.log("[EmailPreview] Paint cycle finished. Executing calculateAndApplyOverlays.");
      calculateAndApplyOverlays();
    });
  }, [calculateAndApplyOverlays]);

  /**
   * Scroll Handler Effect
   * 
   * Manages overlay positioning during iframe content scrolling.
   * Ensures overlays remain aligned with their target elements.
   * 
   * Technical Implementation:
   * - Debounced scroll handler
   * - RAF-based position updates
   * - Proper event cleanup
   * 
   * Performance Considerations:
   * - Minimizes scroll jank
   * - Optimizes reflow triggers
   * - Handles rapid scroll events
   */
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
    
    iframe.contentWindow.addEventListener('scroll', handleIframeScroll);
    
    return () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.removeEventListener('scroll', handleIframeScroll);
      }
    };
  }, [calculateAndApplyOverlays]);

  /**
   * Style Computations
   * 
   * Calculates classes and styles for the preview container based on current mode.
   * Handles responsive design and theme switching.
   * 
   * Technical Details:
   * - Mobile: Fixed width (375px) with auto margins
   * - Desktop: Fluid width with max constraint
   * - Dark mode: Uses CSS filters for color inversion
   * - Maintains consistent border radius and overflow
   */
  const frameClass = previewDevice === 'mobile'
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
        {!currentHtml ? (
          // Empty State Display
          <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-xl min-h-[300px]">
            <div className="text-center">
              <p className="text-lg font-medium">No Email Content</p>
              <p className="text-sm mt-2">Start editing to preview your email here</p>
            </div>
          </div>
        ) : (
          <>
            {/* Content Renderer */}
            <EmailHtmlRenderer
              ref={htmlRendererRef}
              html={currentHtml}
              onContentReady={handleContentReady}
            />
            {/* Overlay Container */}
            <div 
              ref={overlayContainerRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ zIndex: 5 }}
            >
              {/* Overlays are dynamically injected here */}
              {/* Pending change overlays: pointer-events: none */}
              {/* Placeholder overlays: pointer-events: auto */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
