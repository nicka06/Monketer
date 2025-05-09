/**
 * SendEmailPage.tsx
 * 
 * Page for sending email previews to recipients with options to view and copy the HTML.
 * Retrieves HTML content from sessionStorage that was stored during the email creation process.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Send, ArrowLeft } from 'lucide-react';

/**
 * SendEmailPage Component
 * 
 * Allows users to send email previews to specified recipients and view/copy the HTML content.
 * Integrates with Supabase edge functions for email delivery.
 */
const SendEmailPage = () => {
  // State for the recipient's email address
  const [recipientEmail, setRecipientEmail] = useState('');
  // State for the email HTML content retrieved from sessionStorage
  const [emailHtml, setEmailHtml] = useState('');
  // Loading state for API operations
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Retrieve HTML from sessionStorage on component mount
   * Redirects to editor if content is missing
   */
  useEffect(() => {
    const storedHtml = sessionStorage.getItem('emailHtmlToSend');
    if (storedHtml) {
      setEmailHtml(storedHtml);
      // Optional: Clear storage after reading if desired
      // sessionStorage.removeItem('emailHtmlToSend'); 
    } else {
      console.warn("Email HTML not found in sessionStorage. Redirecting.");
      toast({
        title: "Error",
        description: "Email content not found. Please generate the email again.",
        variant: "destructive",
      });
      navigate('/editor'); // Redirect back to editor if HTML is missing
    }
  }, [navigate, toast]);

  /**
   * Copies the email HTML to clipboard
   * Provides feedback via toast notifications
   */
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(emailHtml)
      .then(() => {
        toast({ title: "Success", description: "HTML copied to clipboard!" });
      })
      .catch(err => {
        console.error("Failed to copy HTML:", err);
        toast({ title: "Error", description: "Failed to copy HTML.", variant: "destructive" });
      });
  };

  /**
   * Sends a preview email to the specified recipient
   * Uses Supabase edge function for delivery
   * Provides feedback and handles errors
   */
  const handleSendPreview = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: "Error", description: "Please enter a recipient email address.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Invoking edge function 'send-preview-email' for ${recipientEmail}`);
      const { error } = await supabase.functions.invoke('send-preview-email', {
        body: { recipientEmail, emailHtml },
      });

      if (error) {
        // Throw the error to be caught by the catch block
        throw new Error(error.message || 'Failed to send email via edge function.');
      }

      toast({ title: "Success", description: `Preview email sent to ${recipientEmail}` });
      setRecipientEmail(''); // Clear input after successful send

    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({ 
        title: "Error Sending Email", 
        description: error.message || "An unexpected error occurred.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      {/* Navigation back to editor */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} // Go back to the previous page (Editor)
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Editor
      </Button>

      <h1 className="text-3xl font-bold mb-6">Send Email Preview</h1>

      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* Recipient Email Input */}
        <div>
          <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Email Address
          </label>
          <div className="flex gap-2">
            <Input
              id="recipient-email"
              type="email"
              placeholder="Enter email address for preview"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={handleSendPreview} disabled={isLoading || !recipientEmail.trim() || !emailHtml}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>

        {/* HTML Content Display & Copy */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="email-html" className="block text-sm font-medium text-gray-700">
              Email HTML Content
            </label>
            <Button variant="outline" size="sm" onClick={handleCopyHtml} disabled={!emailHtml}>
              <Copy className="mr-2 h-4 w-4" />
              Copy HTML
            </Button>
          </div>
          <Textarea
            id="email-html"
            readOnly
            value={emailHtml}
            className="min-h-[300px] font-mono text-sm bg-gray-50"
            placeholder="Loading email HTML..."
          />
        </div>
      </div>
    </div>
  );
};

export default SendEmailPage; 