import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditor } from '@/contexts/EditorContext';
import { KeyboardEvent, useState } from 'react';

/**
 * InitialPromptScreen Component
 * 
 * Landing screen for email creation, displayed when:
 * - User starts a new project
 * - User opens an existing project without email content
 * 
 * Allows users to describe their desired email in natural language,
 * which is then sent to the AI for generation.
 */
const InitialPromptScreen = () => {
  const { 
    initialInputValue, 
    setInitialInputValue, 
    handleSendMessage, 
    isLoading, 
    actualProjectId,
    setIsCreatingFirstEmail
  } = useEditor();

  // Track validation state
  const [isValidationVisible, setIsValidationVisible] = useState(false);
  const isInputEmpty = !initialInputValue?.trim();
  
  // Handle email generation request
  const handleGenerateEmail = () => {
    if (isInputEmpty) {
      setIsValidationVisible(true);
      return;
    }
    
    console.log('Initial Email Generation. Prompt:', initialInputValue, 'Project ID (current):', actualProjectId);
    setIsCreatingFirstEmail(true);
    handleSendMessage(initialInputValue, 'major');
    setInitialInputValue('');
    setIsValidationVisible(false);
  };
  
  // Handle Enter key submission
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isInputEmpty) {
      e.preventDefault();
      handleGenerateEmail();
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
      role="main"
      aria-labelledby="email-creation-title"
    >
      <Mail size={64} className="text-muted-foreground mb-6" aria-hidden="true" />
      <h2 id="email-creation-title" className="text-3xl font-semibold mb-3">Create Your First Email!</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {actualProjectId ? 
          "You don't have an email drafted for this project yet." : 
          "Welcome! Let's start your first email."}
        {' '}
        Describe what you want to build, and let our AI craft it for you.
      </p>
      <div className="w-full max-w-lg space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="e.g., A welcome email for new subscribers, highlighting key features..."
            value={initialInputValue || ''}
            onChange={(e) => {
              setInitialInputValue(e.target.value);
              if (isValidationVisible && e.target.value.trim()) {
                setIsValidationVisible(false);
              }
            }}
            onKeyDown={handleKeyDown}
            className="text-base p-4"
            aria-label="Email description"
            aria-invalid={isValidationVisible && isInputEmpty}
            aria-describedby={isValidationVisible && isInputEmpty ? "prompt-error" : undefined}
          />
          {isValidationVisible && isInputEmpty && (
            <p id="prompt-error" className="text-sm text-red-500 text-left">
              Please enter a description for your email
            </p>
          )}
        </div>
        <Button 
          onClick={handleGenerateEmail}
          disabled={isLoading}
          className="w-full text-lg py-6"
          size="lg"
        >
          {isLoading ? 'Generating...' : 'Generate Email with AI'}
        </Button>
      </div>
    </div>
  );
};

export default InitialPromptScreen; 