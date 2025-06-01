import React from 'react';
import { useDnsStatus } from '@/contexts/DnsStatusContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, X } from 'lucide-react';

const GlobalDnsNotificationBar: React.FC = () => {
  const { overallDnsStatus, showDnsModal, dnsContextLoaded } = useDnsStatus();

  // Don't show the bar if context isn't loaded yet or if DNS is verified
  if (!dnsContextLoaded || overallDnsStatus === 'verified' || overallDnsStatus === null) {
    return null;
  }

  let barStyle = 'bg-yellow-500 border-yellow-600';
  let icon = <Info size={20} className="mr-3 text-black" />;
  let message = "Your DNS records are pending verification. Click here to complete setup.";

  if (overallDnsStatus === 'failed_to_verify') {
    barStyle = 'bg-red-500 border-red-600';
    icon = <AlertTriangle size={20} className="mr-3 text-white" />;
    message = "DNS verification failed. Please review your records and try again.";
  } else if (overallDnsStatus === 'partially_verified') {
    barStyle = 'bg-yellow-500 border-yellow-600';
    icon = <Info size={20} className="mr-3 text-black" />;
    message = "Some DNS records are still pending. Click here to review and complete setup.";
  }

  return (
    <div 
        className={`fixed top-0 left-0 right-0 z-[100] p-3 border-b text-sm flex items-center justify-between shadow-lg ${barStyle} text-black cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={showDnsModal}
    >
        <div className="flex items-center">
            {icon}
            <span>{message} <span className="font-semibold">This can take a few hours, but if you haven't added the records, please do so now.</span></span>
        </div>
        {/* 
          The hideDnsModal function is part of the context, but this bar itself doesn't have a close button.
          It disappears if status becomes verified or if context is not loaded.
          If a manual close for the bar itself is needed, we can add a state here and a button.
        */}
    </div>
  );
};

export default GlobalDnsNotificationBar; 