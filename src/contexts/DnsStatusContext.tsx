import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type DnsStatus = 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify' | null;

interface DnsStatusContextType {
  overallDnsStatus: DnsStatus;
  setOverallDnsStatus: (status: DnsStatus) => void;
  isDnsModalOpenGlobally: boolean;
  showDnsModal: () => void;
  hideDnsModal: () => void;
  dnsContextLoaded: boolean; // To know if the context has been initialized with data
  setDnsContextLoaded: (loaded: boolean) => void;
}

const DnsStatusContext = createContext<DnsStatusContextType | undefined>(undefined);

export const DnsStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [overallDnsStatus, setOverallDnsStatus] = useState<DnsStatus>(null);
  const [isDnsModalOpenGlobally, setIsDnsModalOpenGlobally] = useState(false);
  const [dnsContextLoaded, setDnsContextLoaded] = useState(false);

  const showDnsModal = useCallback(() => {
    setIsDnsModalOpenGlobally(true);
  }, []);

  const hideDnsModal = useCallback(() => {
    setIsDnsModalOpenGlobally(false);
  }, []);

  return (
    <DnsStatusContext.Provider 
      value={{
        overallDnsStatus, 
        setOverallDnsStatus, 
        isDnsModalOpenGlobally, 
        showDnsModal, 
        hideDnsModal,
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