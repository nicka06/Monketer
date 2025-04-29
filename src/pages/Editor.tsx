
import { useState } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const Editor = () => {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [emailContent, setEmailContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { toast } = useToast();

  const handleGenerateEmail = () => {
    if (!emailContent.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your email.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Generating email",
      description: "Your email is being generated...",
    });
    
    // This will be implemented in the future
    console.log("Generating email with content:", emailContent);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-4">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to all projects</span>
            </Button>
          </div>
          
          <div className="flex-1 flex justify-center max-w-md">
            {isEditingTitle ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                }}
                autoFocus
                className="text-lg font-medium text-center border-b border-gray-300 focus:border-emailore-purple focus:outline-none px-2"
              />
            ) : (
              <h1 
                className="text-lg font-medium cursor-pointer hover:text-emailore-purple transition-colors"
                onClick={() => setIsEditingTitle(true)}
              >
                {projectName}
              </h1>
            )}
          </div>
          
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="email-content" className="block text-sm font-medium text-gray-700 mb-2">
                Describe the email you want to create
              </label>
              <Textarea 
                id="email-content"
                placeholder="E.g., Create a promotional email announcing our summer sale with 20% off all products..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="min-h-[180px] text-base p-4 border-2 border-emailore-purple/30 focus:border-emailore-purple shadow-sm transition-all duration-200"
              />
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleGenerateEmail}
                className="px-8 py-2 bg-emailore-purple hover:bg-emailore-purple-dark transition-colors"
              >
                Generate Email
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;
