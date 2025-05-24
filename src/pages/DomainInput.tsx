import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DomainCheckResult {
  provider?: string;
  nameservers?: string[];
  error?: string;
  domain?: string;
}

const DomainInputPage = () => {
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const domainToSubmit = domain.trim();
    if (!domainToSubmit) {
      toast({
        title: 'Error',
        description: 'Please enter a domain name.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResultText(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke<DomainCheckResult>(
        'get-domain-provider', 
        { body: { domainName: domainToSubmit } }
      );

      if (functionError) throw functionError;
      const resultData = data;

      console.log('[DomainInputPage] Full response from get-domain-provider:', resultData);

      if (resultData?.error) {
        setResultText(`Domain: ${resultData.domain}\nError: ${resultData.error}`);
        toast({
          title: 'Provider Check Failed',
          description: resultData.error,
          variant: 'destructive',
        });
      } else if (resultData?.provider) {
        setResultText(`Domain: ${resultData.domain}\nProvider: ${resultData.provider}\nNameservers: ${resultData.nameservers?.join(', ') || 'N/A'}`);
        toast({
          title: 'Provider Check Complete',
          description: `Detected provider: ${resultData.provider}`,
        });
      } else {
        setResultText(`Domain: ${resultData?.domain || domainToSubmit}\nCould not determine provider or an unexpected response was received.`);
        toast({
          title: 'Provider Check Uncertain',
          description: 'Could not determine provider.',
          variant: 'default',
        });
      }

    } catch (error) {
      console.error('Error checking domain provider:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setResultText(`Domain: ${domainToSubmit}\nError: ${errorMessage}`);
      toast({
        title: 'Error',
        description: `Failed to check domain provider: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-background pt-20 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Check Domain Provider</CardTitle>
          <CardDescription>
            Enter a domain name to attempt to identify its DNS provider based on its Name Server (NS) records.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="e.g., example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Checking...' : 'Check Domain Provider'}
            </Button>
            {resultText && (
              <div className="mt-6 p-4 bg-muted rounded-md w-full">
                <h4 className="font-semibold mb-2">Result:</h4>
                <pre className="text-sm whitespace-pre-wrap">{resultText}</pre>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default DomainInputPage;
