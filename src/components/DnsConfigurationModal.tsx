import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Copy, Loader2 } from 'lucide-react';
import { DNS_PROVIDER_DISPLAY_OPTIONS } from '@/core/constants';

// Interfaces
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
  domain: string | null;
  dkim_public_key: string | null;
  overall_dns_status?: 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify';
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

// DetailView Component
const DetailView: React.FC<{
  record: DnsRecord;
  onBack: () => void;
  copyToClipboard: (text: string, type: string) => void;
}> = ({ record, onBack, copyToClipboard }) => {

  const DataRow: React.FC<{ label: string; value: string; type: string }> = ({ label, value, type }) => (
    <div className="mb-4">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="flex items-center bg-green-900/70 p-2 rounded-md">
        <span className="font-mono text-xs md:text-sm text-gray-200 break-all flex-grow">{value}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(value, type)}
          className="ml-2 text-gray-300 hover:text-yellow-300"
        >
          <Copy size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 text-gray-300 hover:text-white shrink-0 self-start">
        <ArrowLeft size={14} className="mr-1" />
        Back to Summary
      </Button>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-yellow-300">Setting up your {record.type} Record</h3>
          </div>
          
          <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center mb-4">
            <p className="text-gray-400">Instructional Video Placeholder</p>
          </div>

          <div className="space-y-2 text-gray-200 text-sm mb-6 text-center">
              <p>Follow the video instructions or the steps below. The exact terms might vary slightly between DNS providers, but the values to input will be the same.</p>
          </div>
          
          <h4 className="text-lg font-semibold text-yellow-400 mb-2">Record Details</h4>
          <DataRow label="Type" value={record.type} type={`${record.type} Type`} />
          <DataRow label="Name / Host / Alias" value={record.name} type={`${record.type} Name`} />
          <DataRow label="Value / Points To / Target" value={record.value} type={`${record.type} Value`} />
          {record.priority !== undefined && <DataRow label="Priority" value={String(record.priority)} type={`${record.type} Priority`} />}
        </div>
      </ScrollArea>
    </div>
  );
};

// SummaryView Component
const SummaryView: React.FC<{
  records: DnsRecord[];
  onSelectRecord: (id: string) => void;
  getStatusIcon: (status?: DnsRecord['status']) => JSX.Element;
  onVerifyDns: () => void;
  isVerifyingDns: boolean;
}> = ({ records, onSelectRecord, getStatusIcon, onVerifyDns, isVerifyingDns }) => (
  <div className="flex flex-col h-full">
    <ScrollArea className="h-[400px] pr-2 -mr-2">
      <div className="space-y-3">
        {records.map(record => (
          <Card 
            key={record.id} 
            className="bg-green-700/40 border-green-600 hover:bg-green-700/80 hover:border-yellow-500 cursor-pointer transition-all"
            onClick={() => onSelectRecord(record.id)}
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center">
                {getStatusIcon(record.status)}
                <div className="ml-4">
                  <p className="font-semibold text-base text-yellow-400">{record.type} Record</p>
                  <p className="text-xs text-gray-300">{record.purpose}</p>
                </div>
              </div>
              <div className="text-right">
                 {record.status === 'verified' && <p className="text-sm font-medium text-green-400">Verified</p>}
                 {record.status === 'pending' && <p className="text-sm font-medium text-gray-400">Pending</p>}
                 {record.status === 'failed' && <p className="text-sm font-medium text-red-400">Failed</p>}
                 <p className="text-xs text-gray-400 mt-1">Click to view details</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
    <div className="pt-6 text-center shrink-0">
      <Button 
          variant="outline"
          onClick={onVerifyDns} 
          disabled={isVerifyingDns}
          className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 px-6 py-2 text-base"
      >
          {isVerifyingDns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isVerifyingDns ? 'Verifying...' : 'Verify All Records'}
      </Button>
      <p className="text-xs text-gray-400 mt-3">
          DNS changes can take time. After adding the records, click verify.
      </p>
    </div>
  </div>
);

// Main Modal Component
const DnsConfigurationModal: React.FC<DnsConfigurationModalProps> = ({
  isOpen,
  onOpenChange,
  selectedProvider,
  emailSetupData,
  displayedDnsRecords,
  onVerifyDns,
  isVerifyingDns,
  copyToClipboard,
  getStatusIcon,
}) => {
  const [view, setView] = useState<'summary' | string>('summary');

  React.useEffect(() => {
    if (isOpen) {
      setView('summary');
    }
  }, [isOpen, selectedProvider]);

  if (!selectedProvider) return null;

  const currentRecord = view !== 'summary' ? displayedDnsRecords.find(r => r.id === view) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-green-800 border-green-600 text-white sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 bg-green-700 border-b border-green-600 rounded-t-lg shrink-0">
          <DialogTitle className="text-2xl text-yellow-400 flex items-center">
            {selectedProvider.logo && <img src={selectedProvider.logo} alt={`${selectedProvider.name} logo`} className="h-8 w-auto mr-3 rounded-sm" />}
            Configure DNS with {selectedProvider.name}
          </DialogTitle>
           {view === 'summary' && (
            <DialogDescription className="text-gray-300 mt-1">
                Here are the records you need to add. Click on each one for detailed instructions.
            </DialogDescription>
           )}
        </DialogHeader>
        
        <div className="flex flex-col flex-grow px-6 py-4 min-h-0">
            {emailSetupData === null ? (
              <div className="text-center py-8">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-400 mb-4" />
                  <p className="text-lg text-gray-300">Loading DNS records...</p>
              </div>
            ) : view === 'summary' ? (
              <SummaryView 
                records={displayedDnsRecords} 
                onSelectRecord={setView}
                getStatusIcon={getStatusIcon}
                onVerifyDns={onVerifyDns}
                isVerifyingDns={isVerifyingDns}
              />
            ) : currentRecord ? (
              <DetailView 
                record={currentRecord} 
                onBack={() => setView('summary')}
                copyToClipboard={copyToClipboard}
              />
            ) : (
                <div className="text-center py-8">
                    <p className="text-lg text-red-400">Error: Could not find record details.</p>
                    <Button variant="link" onClick={() => setView('summary')}>Back to summary</Button>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DnsConfigurationModal;