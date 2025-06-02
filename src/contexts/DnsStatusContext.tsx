import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { DNS_PROVIDER_DISPLAY_OPTIONS } from '@/core/constants'; // Import for type

type DnsStatus = 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify' | null;
// Define a type for the DNS provider, using one of the display options as a template
type DnsProviderOption = typeof DNS_PROVIDER_DISPLAY_OPTIONS[0];

interface DnsStatusContextType {
  overallDnsStatus: DnsStatus;
  setOverallDnsStatus: (status: DnsStatus) => void;
  isDnsModalOpenGlobally: boolean;
  showDnsModal: (provider?: DnsProviderOption) => void;
  hideDnsModal: () => void;
  selectedDnsProvider: DnsProviderOption | null; 
  setSelectedDnsProvider: (provider: DnsProviderOption | null) => void; 
  dnsContextLoaded: boolean;
  setDnsContextLoaded: (loaded: boolean) => void;
}

const DnsStatusContext = createContext<DnsStatusContextType | undefined>(undefined);

export const DnsStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [overallDnsStatus, setOverallDnsStatus] = useState<DnsStatus>(null);
  const [isDnsModalOpenGlobally, setIsDnsModalOpenGlobally] = useState(false);
  const [selectedDnsProvider, setSelectedDnsProvider] = useState<DnsProviderOption | null>(null);
  const [dnsContextLoaded, setDnsContextLoaded] = useState(false);

  const showDnsModal = useCallback((provider?: DnsProviderOption) => {
    if (provider) {
      setSelectedDnsProvider(provider);
    } else if (!selectedDnsProvider) {
      // If no provider is given and none is selected, default to "other"
      const otherProvider = DNS_PROVIDER_DISPLAY_OPTIONS.find(p => p.id === 'other');
      setSelectedDnsProvider(otherProvider || null);
    }
    setIsDnsModalOpenGlobally(true);
  }, [selectedDnsProvider]);

  const hideDnsModal = useCallback(() => {
    setIsDnsModalOpenGlobally(false);
    // Optionally, you might want to clear the selectedDnsProvider when modal is hidden
    // setSelectedDnsProvider(null);
  }, []);

  return (
    <DnsStatusContext.Provider 
      value={{
        overallDnsStatus, 
        setOverallDnsStatus, 
        isDnsModalOpenGlobally, 
        showDnsModal, 
        hideDnsModal,
        selectedDnsProvider,
        setSelectedDnsProvider,
        dnsContextLoaded,
        setDnsContextLoaded
      }}
    >
      {children}
    </DnsStatusContext.Provider>
  );
};

export const useDnsStatus = (): DnsStatusContextType => {
  const context = useContext(DnsStatusContext);
  if (context === undefined) {
    throw new Error('useDnsStatus must be used within a DnsStatusProvider');
  }
  return context;
}; 