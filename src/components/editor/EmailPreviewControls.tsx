import { Sun, Moon, Smartphone, Monitor } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useUIState } from '@/features/contexts/providers/UIStateProvider';

/**
 * EmailPreviewControls Component
 * 
 * Control panel for email preview settings with toggles for:
 * - Dark/light mode preview
 * - Mobile/desktop device view
 * 
 * Positioned at the top of the email preview panel with
 * visual indicators showing the current selection state.
 */
const EmailPreviewControls = () => {
  const { 
    isDarkMode, 
    setIsDarkMode, 
    isMobileView, 
    setIsMobileView,
    isLoading
  } = useUIState();

  return (
    <div className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-950 py-2 px-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
      {/* Left placeholder for potential future controls */}
      <div className="invisible">Spacer</div>
      
      {/* Preview controls */}
      <div className="flex items-center space-x-6">
        {/* Dark/light mode toggle */}
        <div className="flex items-center space-x-2" role="group" aria-labelledby="theme-toggle-group">
          <span id="theme-toggle-group" className="sr-only">Theme Mode</span>
          <Sun 
            className={cn("h-4 w-4", isDarkMode ? "text-gray-500" : "text-yellow-500")} 
            aria-hidden="true"
          />
          <Switch
            id="dark-mode-switch"
            checked={isDarkMode}
            onCheckedChange={setIsDarkMode}
            aria-label="Toggle Dark Mode"
            disabled={isLoading}
          />
          <Moon 
            className={cn("h-4 w-4", isDarkMode ? "text-blue-400" : "text-gray-500")} 
            aria-hidden="true"
          />
        </div>
        
        {/* Device type toggle */}
        <div className="flex items-center space-x-2" role="group" aria-labelledby="device-toggle-group">
          <span id="device-toggle-group" className="sr-only">Device Preview</span>
          <Monitor 
            className={cn("h-4 w-4", isMobileView ? "text-gray-500" : "text-primary")} 
            aria-hidden="true"
          />
          <Switch
            id="mobile-view-switch"
            checked={isMobileView}
            onCheckedChange={setIsMobileView}
            aria-label="Toggle Mobile View"
            disabled={isLoading}
          />
          <Smartphone 
            className={cn("h-4 w-4", isMobileView ? "text-primary" : "text-gray-500")} 
            aria-hidden="true"
          />
        </div>
      </div>
      
      {/* Right placeholder for potential future controls */}
      <div className="invisible">Spacer</div>
    </div>
  );
};

export default EmailPreviewControls; 