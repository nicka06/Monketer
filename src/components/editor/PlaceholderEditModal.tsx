import { useEditor } from '@/contexts/EditorContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, KeyboardEvent, useEffect } from 'react';

/**
 * PlaceholderEditModal Component
 * 
 * Modal dialog for editing link placeholders in the email template.
 * Provides URL input and validation for updating link properties
 * in the email template structure.
 */
const PlaceholderEditModal = () => {
  const {
    isLinkModalOpen,
    setIsLinkModalOpen,
    linkInputValue,
    setLinkInputValue,
    handleSaveLink,
    editingPlaceholder
  } = useEditor();
  
  // Local state for URL validation
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Reset validation state when modal opens/closes
  useEffect(() => {
    if (isLinkModalOpen) {
      validateUrl(linkInputValue);
    } else {
      setIsValid(true);
      setErrorMessage('');
    }
  }, [isLinkModalOpen, linkInputValue]);
  
  // Validate URL format
  const validateUrl = (url: string) => {
    if (!url || url === 'https://') {
      setIsValid(false);
      setErrorMessage('Please enter a URL');
      return false;
    }
    
    // Allow relative URLs, mailto:, and standard http(s)
    if (url.startsWith('/') || 
        url.startsWith('mailto:') || 
        url.startsWith('#') || 
        /^https?:\/\/\S+\.\S+/.test(url)) {
      setIsValid(true);
      setErrorMessage('');
      return true;
    }
    
    setIsValid(false);
    setErrorMessage('Please enter a valid URL (e.g., https://example.com)');
    return false;
  };
  
  // Handle URL input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkInputValue(e.target.value);
    validateUrl(e.target.value);
  };
  
  // Handle save with validation
  const handleSave = () => {
    if (validateUrl(linkInputValue)) {
      handleSaveLink();
    }
  };
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Link URL</DialogTitle>
          <DialogDescription>
            Enter the destination URL for the element "({editingPlaceholder?.elementId})" targeting property "{editingPlaceholder?.path}".
          </DialogDescription>
        </DialogHeader>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-url" className="text-right">
                URL
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="link-url"
                  value={linkInputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={isValid ? "" : "border-red-500 focus-visible:ring-red-500"}
                  placeholder="https://example.com"
                  aria-invalid={!isValid}
                  aria-describedby={!isValid ? "url-error" : undefined}
                  autoFocus
                />
                {!isValid && (
                  <p id="url-error" className="text-sm text-red-500">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit"
              disabled={!isValid || !linkInputValue}
            >
              Save Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceholderEditModal; 