import { EmailPreview } from '@/components/EmailPreview';
import { useProject } from '@/features/contexts/providers/ProjectProvider';
import { useUIState } from '@/features/contexts/providers/UIStateProvider';
import { useChanges } from '@/features/contexts/providers/ChangesProvider';
import EmailPreviewControls from './EmailPreviewControls';
import PendingChangesBar from './PendingChangesBar';
import { cn } from '@/lib/utils';
import { RefObject } from 'react';

/**
 * EmailPreviewPanel Component
 * 
 * Main preview container for the email being edited.
 * Displays a rendered HTML preview with theme/device controls
 * and includes functionality for interacting with placeholders.
 */
interface EmailPreviewPanelProps {
  fileInputRef?: RefObject<HTMLInputElement>;
}

const EmailPreviewPanel = ({ fileInputRef }: EmailPreviewPanelProps) => {
  const { projectData, livePreviewHtml } = useProject();
  const { isDarkMode, isMobileView, isLoading } = useUIState();
  const { pendingChanges } = useChanges();
  
  // Determine if we should show the preview content
  const hasPreviewContent = projectData?.email_content_structured && !isLoading;
  
  // Calculate content height based on controls presence
  const contentHeight = hasPreviewContent ? "h-[calc(100%-50px)]" : "h-full";
  
  // Get the HTML content to display
  const htmlContent = livePreviewHtml || projectData?.current_html || '';
  
  return (
    <div 
      className="bg-neutral-100 dark:bg-neutral-950 overflow-hidden relative h-full"
      role="region"
      aria-label="Email preview panel"
    >
      {/* Preview mode controls - only visible when content is available */}
      {hasPreviewContent && <EmailPreviewControls />}
      
      {/* Main Content Area */}
      <div className={cn("relative", contentHeight)}>
        {/* Email Preview - Only render when we have actual content and not loading */}
        {hasPreviewContent && (
          <div className="h-full overflow-auto">
            <EmailPreview
              currentHtml={htmlContent}
              pendingChanges={pendingChanges}
              previewMode={isDarkMode ? 'dark' : 'light'}
              previewDevice={isMobileView ? 'mobile' : 'desktop'}
              semanticTemplate={projectData.email_content_structured}
            />
          </div>
        )}
        
        {/* Pending Changes Action Bar - conditionally rendered */}
        <PendingChangesBar />
      </div>
    </div>
  );
};

export default EmailPreviewPanel; 