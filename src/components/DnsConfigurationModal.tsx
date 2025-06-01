import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogOverlay } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { DNS_PROVIDER_DISPLAY_OPTIONS } from '@/core/constants'; // For provider type

// Interfaces from DnsConfirmationPage (or define more specific ones if preferred)
interface DnsRecord {
  id: string;
  type: 'MX' | 'TXT' | 'CNAME';
  name: string;
  value: string;
  priority?: number;
  purpose: string;
  status?: 'verified' | 'failed' | 'pending' | 'error';
  verificationMessage?: string;
}

interface EmailSetupData {
  id: string;
  domain: string | null; // Made nullable to handle cases before data is fully loaded
  dkim_public_key: string | null;
  overall_dns_status?: 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify'; // Added this field
  // Add other fields from EmailSetupData if they are directly used in the modal
}

interface DnsConfigurationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedProvider: typeof DNS_PROVIDER_DISPLAY_OPTIONS[0] | null;
  emailSetupData: EmailSetupData | null;
  displayedDnsRecords: DnsRecord[];
  onVerifyDns: () => Promise<void>;
  isVerifyingDns: boolean;
  copyToClipboard: (text: string, type: string) => void;
  getStatusIcon: (status?: DnsRecord['status'] | EmailSetupData['overall_dns_status']) => JSX.Element;
}

// Helper component to render DNS records (moved from DnsConfirmationPage)
const DnsRecordsDisplay: React.FC<{ 
    records: DnsRecord[], 
    providerName: string | undefined, 
    copyToClipboard: DnsConfigurationModalProps['copyToClipboard'],
    getStatusIcon: DnsConfigurationModalProps['getStatusIcon'] 
}> = ({ records, providerName, copyToClipboard, getStatusIcon }) => {
    if (!records.length) {
      return <p className="text-gray-400 text-center py-4">No DNS records available to display. This might indicate an issue with the initial setup.</p>;
    }
    return (
      <ScrollArea className="h-[calc(70vh-200px)] md:h-[400px] pr-4"> {/* Adjust height as needed */}
        <div className="space-y-6">
          {records.map((record) => (
            <Card key={record.id} className="bg-green-700 bg-opacity-40 border-green-600">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-yellow-400 flex items-center">
                    {getStatusIcon(record.status)} 
                    <span className="ml-2">{record.type} Record</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(record.name, `${record.type} Name/Host`)}
                    className="text-gray-300 hover:text-yellow-300 px-2 py-1"
                  >
                    <Copy size={16} className="mr-1" /> Name
                  </Button>
                </div>
                <p className="text-xs text-gray-400 break-all">{record.name}</p>
              </CardHeader>
              <CardContent className="text-sm text-gray-200 px-4 pb-3">
                <div className="font-mono bg-green-800 bg-opacity-50 p-2 rounded text-xs break-all relative">
                  {record.value}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(record.value, `${record.type} Value`)}
                    className="absolute top-1 right-1 text-gray-300 hover:text-yellow-300 h-6 w-6"
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                {record.priority && <p className="mt-1 text-xs text-gray-400">Priority: {record.priority}</p>}
                <p className="mt-1 text-xs text-gray-400">{record.purpose}</p>
                {record.status === 'failed' && record.verificationMessage && (
                  <p className="mt-1 text-xs text-red-400">Reason: {record.verificationMessage}</p>
                )}
                 {record.status === 'verified' && (
                  <p className="mt-1 text-xs text-green-400">Successfully verified!</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

const DnsConfigurationModal: React.FC<DnsConfigurationModalProps> = ({
  isOpen,
  onOpenChange,
  selectedProvider,
  emailSetupData,
  displayedDnsRecords,
  onVerifyDns,
  isVerifyingDns,
  copyToClipboard,
  getStatusIcon
}) => {
  if (!selectedProvider) return null; // Or some fallback UI if the modal is open without a provider

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent className="bg-green-800 border-green-600 text-white sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 max-h-[90vh]">
        <DialogHeader className="px-6 py-4 bg-green-700 border-b border-green-600 rounded-t-lg">
          <DialogTitle className="text-2xl text-yellow-400 flex items-center">
            {selectedProvider.logo && <img src={selectedProvider.logo} alt={`${selectedProvider.name} logo`} className="h-8 w-auto mr-3 rounded-sm" />}
            Configure DNS with {selectedProvider.name}
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Follow these instructions to add the required DNS records to your domain <span className="font-semibold text-yellow-300">{emailSetupData?.domain || 'your domain'}</span> using {selectedProvider.name}.
            {selectedProvider.instructionsUrl && (
              <a href={selectedProvider.instructionsUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-yellow-400 hover:text-yellow-300 underline inline-flex items-center">
                {selectedProvider.name} Help <ExternalLink size={14} className="ml-1" />
              </a>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4">
          {displayedDnsRecords.length > 0 ? (
              <DnsRecordsDisplay 
                records={displayedDnsRecords} 
                providerName={selectedProvider?.name}
                copyToClipboard={copyToClipboard}
                getStatusIcon={getStatusIcon}
              />
          ) : (
              <div className="text-center py-8">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-400 mb-4" />
                  <p className="text-lg text-gray-300">Loading DNS records...</p>
                  {(!emailSetupData || !emailSetupData.dkim_public_key) && 
                      <p className="text-sm text-gray-400 mt-2">If this persists, there might have been an issue during the initial DNS setup step.</p>}
              </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-green-700 border-t border-green-600 rounded-b-lg flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <div className="text-xs text-gray-400 text-center sm:text-left">
              DNS changes can take up to 48 hours to propagate fully.
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                  variant="outline"
                  onClick={onVerifyDns} 
                  disabled={isVerifyingDns || !emailSetupData?.id}
                  className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900"
              >
                  {isVerifyingDns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isVerifyingDns ? 'Verifying...' : 'Verify My DNS Records'}
              </Button>
              <DialogClose asChild>
                  <Button type="button" variant="secondary" className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white">
                      Close
                  </Button>
              </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DnsConfigurationModal; 