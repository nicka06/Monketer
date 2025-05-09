import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';

/**
 * EditorHeader Component
 * 
 * Displays the top navigation bar for the email editor with:
 * - Back button to return to dashboard
 * - Editable project title with inline editing
 * - Settings button (placeholder for future functionality)
 */
const EditorHeader = () => {
  const navigate = useNavigate();
  const { 
    projectTitle, 
    setProjectTitle, 
    isEditingTitle, 
    setIsEditingTitle, 
    handleTitleChange 
  } = useEditor();

  // Handle saving the title changes
  const saveTitle = () => {
    setIsEditingTitle(false);
    handleTitleChange(projectTitle);
  };

  return (
    <header className="flex items-center justify-between p-3 border-b sticky top-0 z-10 bg-background">
      {/* Left section: Back navigation */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-4" 
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to all projects</span>
        </Button>
      </div>
      
      {/* Center section: Editable project title */}
      <div className="flex-1 flex justify-center max-w-md">
        {isEditingTitle ? (
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveTitle();
              }
            }}
            aria-label="Edit project title"
            autoFocus
            className="text-lg font-medium text-center border-b border-gray-300 focus:border-primary focus:outline-none px-2"
          />
        ) : (
          <h1 
            className="text-lg font-medium cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditingTitle(true)}
            role="button"
            aria-label="Click to edit project title"
          >
            {projectTitle}
          </h1>
        )}
      </div>
      
      {/* Right section: Settings (placeholder) */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          aria-label="Project settings"
          disabled
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  );
};

export default EditorHeader; 