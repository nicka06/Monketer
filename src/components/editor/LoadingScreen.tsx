import { Mail } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useUIState } from '@/features/contexts/providers/UIStateProvider';
import { useAI } from '@/features/contexts/providers/AIProvider';

/**
 * LoadingScreen Component
 * 
 * Visual feedback display for various loading/processing states:
 * - 'generating': Creating email content
 * - 'clarifying': AI gathering user requirements
 * - 'loading': Generic content loading
 * 
 * Features animated elements and a progress bar.
 */
interface LoadingScreenProps {
  type?: 'clarifying' | 'generating' | 'loading';
}

const LoadingScreen = ({ type = 'generating' }: LoadingScreenProps) => {
  const { progress } = useUIState();
  const { isClarifying } = useAI();
  
  // Use passed type or determine based on context
  const displayType = type === 'clarifying' || isClarifying ? 'clarifying' : type;
  
  // Content mapping based on display type
  const content = {
    clarifying: {
      title: "Understanding Your Needs...",
      description: "Our AI is gathering details to create exactly what you need",
      progressLabel: "Understanding Progress",
      statusText: "We'll start generating once we have all the details"
    },
    generating: {
      title: "Crafting Your Perfect Email",
      description: "Our AI is carefully generating your email based on our conversation",
      progressLabel: "Generation Progress",
      statusText: "This usually takes less than a minute"
    },
    loading: {
      title: "Loading Your Content...",
      description: "Preparing your workspace and content",
      progressLabel: "Loading Progress",
      statusText: "This usually takes less than a minute"
    }
  };
  
  // Get content for current display type
  const currentContent = content[displayType];
  const progressPercent = Math.round(progress);
  
  return (
    <div 
      className="h-full bg-background flex flex-col"
      role="status"
      aria-live="polite"
      aria-label={`${displayType} in progress: ${progressPercent}% complete`}
    >
      {/* Top Section with Animation */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-8" aria-hidden="true">
          <div className="relative">
            <Mail className="h-20 w-20 text-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-3xl font-semibold mb-3 text-center">
          {currentContent.title}
        </h2>
        <p className="text-lg text-muted-foreground mb-12 text-center max-w-md">
          {currentContent.description}
        </p>
      </div>
      
      {/* Bottom Section with Progress */}
      <div className="border-t bg-muted/30 p-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {currentContent.progressLabel}
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2" 
              aria-label={`${progressPercent}% complete`}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {currentContent.statusText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 