import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { EmailHtmlRenderer } from './EmailHtmlRenderer';
import { 
  EmailTemplate,
  PendingChange,
  EmailPreviewProps,
} from '@/shared/types';
import { useChanges } from '@/features/contexts/providers/ChangesProvider';
import { useUIState } from '@/features/contexts/providers/UIStateProvider';

/**
 * EmailPreview Component
 * 
 * A sophisticated email preview component that provides an interact ive preview environment
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
 * @param {EmailTemplate | null} semanticTemplate - Structured template data
 *                                                   Used for placeholder detection and processing
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

  const { handleAcceptOneChange, handleRejectOneChange } = useChanges();
  const { isLoading, selectedElementPath, setSelectedElementPath } = useUIState();

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
      // console.log("[EmailPreview] calculateAndApplyOverlays skipped: Missing container or overlayContainer.");
      return;
    }

    // console.log(`[EmailPreview] Running calculateAndApplyOverlays for ${pendingChanges.length} changes...`);
    overlayContainer.innerHTML = '';
    
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
    
    // --- Render Overlays for Manual Editing ---
    if (semanticTemplate && semanticTemplate.sections) {
      semanticTemplate.sections.forEach(section => {
        section.rows.forEach(row => {
          row.columns.forEach(column => {
            column.elements.forEach(element => {
              const targetEl = iframeDoc.getElementById(element.id);
              if (!targetEl) return;

              const targetRect = targetEl.getBoundingClientRect();
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.left = `${iframeRect.left + targetRect.left - containerRect.left}px`;
              overlay.style.top = `${iframeRect.top + targetRect.top - containerRect.top + scrollY}px`;
              overlay.style.width = `${targetRect.width}px`;
              overlay.style.height = `${targetRect.height}px`;
              overlay.style.cursor = 'pointer';
              overlay.style.zIndex = '10';
              overlay.style.pointerEvents = 'auto';

              if (selectedElementPath && element.id === selectedElementPath.elementId) {
                overlay.style.outline = '2px solid #3b82f6'; // Blue-500
                overlay.style.outlineOffset = '2px';
                overlay.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
              }

              overlay.onclick = (e) => {
                e.stopPropagation();
                setSelectedElementPath({
                  sectionId: section.id,
                  rowId: row.id,
                  columnId: column.id,
                  elementId: element.id,
                });
              };

              overlayContainer.appendChild(overlay);
            });
          });
        });
      });
    }

    // console.log("[EmailPreview] Processing Pending Changes Overlays...");
    if (Array.isArray(pendingChanges) && pendingChanges.length > 0) {
      pendingChanges.forEach((change: PendingChange) => { // PendingChange is now GranularPendingChange
        if (change.status !== 'pending') return;
        if (change.change_type === 'element_delete' || change.change_type === 'section_delete') return;
        let targetElement: HTMLElement | null = null;
        const isSectionChange = change.change_type.startsWith('section');
        if (isSectionChange) {
          targetElement = iframeDoc.querySelector(`[data-section-id="${change.target_id}"]`);
        } else {
          targetElement = iframeDoc.querySelector(`[data-element-id="${change.target_id}"]`);
        }
        if (!targetElement) return;
        const targetRect = targetElement.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${iframeRect.left + targetRect.left - containerRect.left + 2}px`;
        overlay.style.top = `${iframeRect.top + targetRect.top - containerRect.top + scrollY + 2}px`;
        overlay.style.width = `${targetRect.width}px`;
        overlay.style.height = `${targetRect.height}px`;
        overlay.style.pointerEvents = 'auto';
        overlay.style.zIndex = '20'; // Above content and placeholders
        overlay.style.boxSizing = 'border-box';
        overlay.style.borderRadius = '3px';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'flex-end';
        overlay.style.flexDirection = 'row';
        overlay.style.background = 'none';
        // Border and background
        if (change.change_type === 'element_add' || change.change_type === 'section_add') {
          overlay.style.border = '2px dashed #22c55e';
          overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        } else if (change.change_type === 'element_edit' || change.change_type === 'section_edit') {
          overlay.style.border = '2px solid #eab308';
          overlay.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
        }
        // Accept/Reject buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.position = 'absolute';
        btnContainer.style.top = '4px';
        btnContainer.style.right = '4px';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '4px';
        btnContainer.style.zIndex = '21';
        // Accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.innerHTML = '✓';
        acceptBtn.title = 'Accept change';
        acceptBtn.style.background = '#22c55e';
        acceptBtn.style.color = 'white';
        acceptBtn.style.border = 'none';
        acceptBtn.style.borderRadius = '50%';
        acceptBtn.style.width = '24px';
        acceptBtn.style.height = '24px';
        acceptBtn.style.fontSize = '16px';
        acceptBtn.style.cursor = 'pointer';
        acceptBtn.style.opacity = isLoading ? '0.5' : '1';
        acceptBtn.disabled = isLoading;
        acceptBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAcceptOneChange(change.id);
        });
        // Reject button
        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.innerHTML = '✗';
        rejectBtn.title = 'Reject change';
        rejectBtn.style.background = '#ef4444';
        rejectBtn.style.color = 'white';
        rejectBtn.style.border = 'none';
        rejectBtn.style.borderRadius = '50%';
        rejectBtn.style.width = '24px';
        rejectBtn.style.height = '24px';
        rejectBtn.style.fontSize = '16px';
        rejectBtn.style.cursor = 'pointer';
        rejectBtn.style.opacity = isLoading ? '0.5' : '1';
        rejectBtn.disabled = isLoading;
        rejectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRejectOneChange(change.id);
        });
        btnContainer.appendChild(acceptBtn);
        btnContainer.appendChild(rejectBtn);
        overlay.appendChild(btnContainer);
        overlayContainer?.appendChild(overlay);
      });
    }

    // The entire placeholder overlay system has been removed, as this functionality
    // is now handled by the direct-to-element click logic for the ManualEditPanel.
  }, [pendingChanges, semanticTemplate, handleAcceptOneChange, handleRejectOneChange, isLoading, selectedElementPath, setSelectedElementPath]);

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
              style={{ zIndex: 5, pointerEvents: 'none' }}
            >
              {/* Overlays are dynamically injected here */}
              {/* Individual overlays that need interaction (placeholders, buttons) will set pointerEvents: 'auto' */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
