import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDnsStatus } from '@/contexts/DnsStatusContext';
import { AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { FORM_FLOW_ORDER } from '@/core/constants';

// Define pages that do not have the standard top navigation bar
const PAGES_WITHOUT_NAVBAR = [
  '/subscription-plan', // Add other pages as needed, e.g., /dashboard, /editor
  '/editor',
  '/dashboard',
  // Add '/login', '/signup' if they also don't have the *main* app navbar and the bar should be at top-0
];

const GlobalDnsNotificationBar: React.FC = () => {
  const { overallDnsStatus, showDnsModal, dnsContextLoaded, isDnsModalOpenGlobally } = useDnsStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const dnsConfirmationPath = '/dns-confirmation';
  
  // Determine if the current page is eligible for showing the bar
  const locationPath = location.pathname;
  const dnsConfirmationIndex = FORM_FLOW_ORDER.indexOf(dnsConfirmationPath);
  const currentIndexInFlow = FORM_FLOW_ORDER.indexOf(locationPath);

  // Page is eligible if:
  // 1. It's not part of the defined flow (e.g., /dashboard, /editor) - currentIndexInFlow === -1
  // OR
  // 2. It is the dns-confirmation page or any page after it in the flow - currentIndexInFlow >= dnsConfirmationIndex
  // We must ensure dnsConfirmationIndex is valid (i.e., dnsConfirmationPath is in FORM_FLOW_ORDER)
  const shouldShowBasedOnPageEligibility = dnsConfirmationIndex !== -1 && 
                                           (currentIndexInFlow === -1 || currentIndexInFlow >= dnsConfirmationIndex);

  // Final conditions for showing the bar
  if (
    !dnsContextLoaded || 
    overallDnsStatus === 'verified' || 
    overallDnsStatus === null || 
    !shouldShowBasedOnPageEligibility || 
    isDnsModalOpenGlobally
  ) {
    return null;
  }

  let barStyle = 'bg-yellow-500 border-yellow-600';
  let icon = <Info size={20} className="mr-3 text-black shrink-0" />;
  let message = "DNS records pending.";

  if (overallDnsStatus === 'failed_to_verify') {
    barStyle = 'bg-red-500 border-red-600';
    icon = <AlertTriangle size={20} className="mr-3 text-white shrink-0" />;
    message = "DNS verification failed. Please review.";
  } else if (overallDnsStatus === 'partially_verified') {
    barStyle = 'bg-yellow-500 border-yellow-600';
    icon = <Info size={20} className="mr-3 text-black shrink-0" />;
    message = "Some DNS records still pending.";
  }

  const handleBarClick = () => {
    showDnsModal();
  };

  // Determine top position based on navbar presence
  const hasNavbar = !PAGES_WITHOUT_NAVBAR.includes(location.pathname);
  const topPositionClass = hasNavbar ? 'top-16' : 'top-0';

  return (
    <div 
        className={`fixed ${topPositionClass} left-0 right-0 z-[100] p-3 border-b text-sm flex items-center justify-center shadow-lg ${barStyle} text-black cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={handleBarClick}
    >
        <div className="flex items-center text-center">
            {icon}
            <span>
              {message} 
              <span className="font-semibold ml-1">This can take a few hours, but if you haven't added the records, please do so now.</span>
            </span>
            <ChevronRight size={20} className="ml-2 shrink-0" />
        </div>
    </div>
  );
};

export default GlobalDnsNotificationBar; 