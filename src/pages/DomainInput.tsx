import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getInstructionsForProvider,
  type ProviderInstruction,
  type ProviderInstructionStep
} from '../backend/functions/_shared/lib/dns-provider-instructions'; // Adjust path as necessary

// Define the total number of data input steps in the form
const TOTAL_STEPS = 6; // 1: Area of Business, 2: SubCategory, 3: Goals, 4: Email Scenarios, 5: Sending Addresses, 6: Domain

// Define options for subcategories based on area of business
const subCategoryOptions: Record<string, { value: string; label: string }[]> = {
  ecommerce: [
    { value: "fashion_apparel", label: "Fashion & Apparel" },
    { value: "electronics", label: "Electronics" },
    { value: "home_goods", label: "Home Goods" },
    { value: "health_beauty", label: "Health & Beauty" },
    { value: "courses_digital_products", label: "Courses & Digital Products" },
    { value: "other", label: "Other Ecommerce" },
  ],
  blogging: [
    { value: "tech", label: "Tech Blog" },
    { value: "travel", label: "Travel Blog" },
    { value: "food", label: "Food Blog" },
    { value: "lifestyle", label: "Lifestyle Blog" },
    { value: "finance", label: "Finance Blog" },
    { value: "other", label: "Other Blog Topic" },
  ],
  software_saas: [
    { value: "b2b", label: "B2B SaaS" },
    { value: "b2c", label: "B2C SaaS" },
    { value: "developer_tools", label: "Developer Tools" },
    { value: "productivity", label: "Productivity Software" },
    { value: "other", label: "Other SaaS" },
  ],
  services: [
    { value: "consulting", label: "Consulting" },
    { value: "agency_marketing", label: "Marketing Agency" },
    { value: "agency_design", label: "Design Agency" },
    { value: "freelance_writing", label: "Freelance Writing/Editing" },
    { value: "coaching", label: "Coaching" },
    { value: "other", label: "Other Services" },
  ],
  // local_business, non_profit, other might not have predefined subcategories
  // or might have more generic ones. For now, we can leave them empty or add a generic "General" option.
  local_business: [{ value: "general", label: "General Local Business" }],
  non_profit: [{ value: "general", label: "General Non-Profit Operations" }],
  // "other" area of business might not have subcategories, or we skip this step for it.
};

// Define options for specific goals
const goalOptions: { id: string; label: string }[] = [
  { id: "marketing_newsletters", label: "Sending marketing newsletters" },
  { id: "transactional_emails", label: "Transactional emails (order confirmations, password resets, etc.)" },
  { id: "cold_outreach", label: "Cold outreach / Sales prospecting" },
  { id: "internal_comms", label: "Internal team communications" },
  { id: "deliverability_improvement", label: "Improving email deliverability" },
  { id: "automation_sequences", label: "Automating email sequences (welcome series, drip campaigns)" },
  { id: "other", label: "Other specific goal" },
];

// Define options for EMAIL SENDING SCENARIOS (New Step 4)
const emailScenarioOptions: { id: string; label: string; category: string }[] = [
  // User Actions / Transactional
  { id: "welcome_account", label: "Welcome email / Account confirmation", category: "User Actions" },
  { id: "password_reset", label: "Password reset requests", category: "User Actions" },
  { id: "order_confirmation", label: "Order confirmation / Receipts", category: "User Actions" },
  { id: "shipping_notification", label: "Shipping notifications", category: "User Actions" },
  { id: "abandoned_cart", label: "Abandoned cart reminders", category: "User Actions" },
  { id: "form_submission_ack", label: "Form submission acknowledgments (e.g., contact, lead magnet)", category: "User Actions" },
  
  // Marketing & Engagement
  { id: "newsletter_regular", label: "Regular newsletter (e.g., weekly, monthly)", category: "Marketing & Engagement" },
  { id: "product_updates", label: "Product updates / New feature announcements", category: "Marketing & Engagement" },
  { id: "promotional_campaigns", label: "Promotional campaigns / Sales offers", category: "Marketing & Engagement" },
  { id: "event_invitations", label: "Event invitations / Reminders", category: "Marketing & Engagement" },
  { id: "blog_updates", label: "Blog post updates / New content notifications", category: "Marketing & Engagement" },

  // Automated / Other
  { id: "automated_sequences", label: "Automated email sequences (drip campaigns, onboarding series)", category: "Automated" },
  { id: "scheduled_reports", label: "Scheduled reports or summaries", category: "Automated" },
  { id: "other", label: "Other specific email scenario", category: "Other" },
];

// NEW: Interface for scenario-specific sender configuration
interface ScenarioSenderConfig {
  scenarioId: string; // Corresponds to the id from emailScenarioOptions
  fromName?: string;
  fromEmail?: string;
}

interface EmailSetupFormData {
  areaOfBusiness?: string;
  subCategory?: string;
  goals?: string[];
  emailScenarios?: string[]; // IDs of selected scenarios from Step 4
  defaultFromName?: string; // Global default
  defaultFromEmail?: string; // Global default
  scenarioSenders?: ScenarioSenderConfig[]; // Specific overrides for selected scenarios
  domain?: string;
  sendTimeline?: string; // Ensure this matches the backend if it's used in save-email-setup-form
}

interface DomainCheckResult {
  provider?: string;
  nameservers?: string[];
  error?: string;
  domain?: string;
}

interface DnsRecord {
  type: "MX" | "TXT" | "CNAME";
  host: string;
  value: string;
  priority?: number;
  ttl?: number;
}

interface InitiateEmailSetupResult {
  dnsSetupStrategy: 'manual';
  dkimSelector: string;
  requiredDnsRecords: DnsRecord[];
  message: string;
}

// NEW: Types for DNS Verification
interface DnsVerificationStatusItem {
  recordType: "MX" | "SPF" | "DKIM" | "DMARC";
  status: "verified" | "failed" | "pending" | "error";
  queriedValue?: string | string[];
  expectedValue?: string;
  message?: string;
}

interface DnsVerificationState {
  overall: "pending" | "partially_verified" | "verified" | "failed_to_verify" | "not_started";
  mx: DnsVerificationStatusItem | null;
  spf: DnsVerificationStatusItem | null;
  dkim: DnsVerificationStatusItem | null;
  dmarc: DnsVerificationStatusItem | null;
}

interface VerifyDnsResponse {
  overallDnsStatus: DnsVerificationState['overall'];
  mxStatus: DnsVerificationStatusItem;
  spfStatus: DnsVerificationStatusItem;
  dkimStatus: DnsVerificationStatusItem;
  dmarcStatus: DnsVerificationStatusItem;
  lastVerificationAttemptAt: string;
  verificationFailureReason?: string;
}

const DomainInputPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmailSetupFormData>({});
  
  // const [domain, setDomain] = useState(''); // Keep this commented or remove, as domain is in formData
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [dnsRecordsToDisplay, setDnsRecordsToDisplay] = useState<DnsRecord[]>([]);
  const [currentProviderInstructions, setCurrentProviderInstructions] = useState<ProviderInstruction | null>(null);
  const [errorOccurred, setErrorOccurred] = useState(false);
  // NEW: State for DNS Verification
  const [verificationStatus, setVerificationStatus] = useState<DnsVerificationState>({
    overall: "not_started",
    mx: null,
    spf: null,
    dkim: null,
    dmarc: null,
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerificationTime, setLastVerificationTime] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [emailSetupId, setEmailSetupId] = useState<string | null>(null); // To store the ID for verification
  const { toast } = useToast();

  // Effect for initial load of verification status and polling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined = undefined;

    const initialLoadAndPoll = async () => {
      if (emailSetupId && verificationStatus.overall === "not_started") {
        // If we have an ID but haven't started verification, trigger it once.
        // This covers page reloads where setup was done but verification state isn't loaded yet.
        console.log("[useEffect] Initial verification triggered for emailSetupId:", emailSetupId);
        await handleVerifyDns(); // await to get the first status before potentially polling
      }

      // Setup polling only if appropriate conditions are met after the potential initial load
      // Need to read the LATEST verificationStatus after handleVerifyDns might have updated it.
      // This is tricky because handleVerifyDns updates state asynchronously.
      // A better way might be to let handleVerifyDns itself schedule the next poll if needed.
      // For now, let's rely on the state being updated by the first call if it happened.
    };

    initialLoadAndPoll(); // Call it once to check for initial load.

    // This useEffect will re-run if verificationStatus.overall or emailSetupId changes.
    // We'll set up or clear the interval based on the new state.
    if (emailSetupId && (verificationStatus.overall === "pending" || verificationStatus.overall === "partially_verified")) {
      console.log(`[useEffect] Starting polling for ${emailSetupId} with status ${verificationStatus.overall}`);
      pollInterval = setInterval(() => {
        console.log(`[Polling] Verifying DNS for ${emailSetupId}`);
        handleVerifyDns();
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      if (pollInterval) {
        console.log(`[useEffect] Clearing polling for ${emailSetupId} (status: ${verificationStatus.overall})`);
        clearInterval(pollInterval);
      }
    }

    return () => {
      if (pollInterval) {
        console.log(`[useEffect] Cleanup: Clearing polling for ${emailSetupId}`);
        clearInterval(pollInterval);
      }
    };
  }, [emailSetupId, verificationStatus.overall]); // Dependencies: emailSetupId and overall status

  const handleInputChange = (field: keyof EmailSetupFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSelectChange = (field: keyof EmailSetupFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler for scenario-specific sender input changes
  const handleScenarioSenderChange = (
    scenarioId: string, 
    field: 'fromName' | 'fromEmail', 
    value: string
  ) => {
    setFormData(prev => {
      const existingSenders = prev.scenarioSenders || [];
      const scenarioIndex = existingSenders.findIndex(s => s.scenarioId === scenarioId);
      let newSenders = [...existingSenders];

      if (scenarioIndex > -1) {
        // Update existing scenario sender config
        newSenders[scenarioIndex] = { ...newSenders[scenarioIndex], [field]: value };
      } else {
        // Add new scenario sender config
        newSenders.push({ scenarioId, [field]: value });
      }
      return { ...prev, scenarioSenders: newSenders };
    });
  };

  // Handler for checkbox changes (for multi-select like goals and emailScenarios)
  const handleCheckboxChange = (field: keyof EmailSetupFormData, goalId: string, checked: boolean | 'indeterminate') => {
    setFormData(prev => {
      const existingGoals = prev[field] as string[] || [];
      if (checked) {
        return { ...prev, [field]: [...existingGoals, goalId] };
      }
      return { ...prev, [field]: existingGoals.filter(g => g !== goalId) };
    });
  };

  const nextStep = () => {
    // Basic validation example: Ensure area of business is selected before proceeding from step 1
    if (currentStep === 1 && !formData.areaOfBusiness) {
      toast({
        title: "Missing Information",
        description: "Please select your area of business.",
        variant: "destructive",
      });
      return;
    }
    // Validation for Step 2: SubCategory
    if (currentStep === 2) {
      const selectedArea = formData.areaOfBusiness;
      // Check if the selected area has subcategories defined and if one has been chosen
      if (selectedArea && subCategoryOptions[selectedArea] && subCategoryOptions[selectedArea].length > 0 && !formData.subCategory) {
        toast({
          title: "Missing Information",
          description: "Please select your business subcategory.",
          variant: "destructive",
        });
        return;
      }
    }
    // Validation for Step 3: Goals
    if (currentStep === 3) {
      if (!formData.goals || formData.goals.length === 0) {
        toast({
          title: "Missing Information",
          description: "Please select at least one goal.",
          variant: "destructive",
        });
        return;
      }
    }
    // Validation for Step 4: Email Scenarios
    if (currentStep === 4) {
      if (!formData.emailScenarios || formData.emailScenarios.length === 0) {
        toast({
          title: "Missing Information",
          description: "Please select at least one email sending scenario.",
          variant: "destructive",
        });
        return;
      }
    }
    // Validation for Step 5: Sending Addresses (now includes scenario-specific)
    if (currentStep === 5) {
      // Validate global defaults first
      if (!formData.defaultFromName?.trim()) {
        toast({ title: "Missing Information", description: "Please enter a global default 'From' name.", variant: "destructive" });
        return;
      }
      if (!formData.defaultFromEmail?.trim()) {
        toast({ title: "Missing Information", description: "Please enter a global default 'From' email address.", variant: "destructive" });
        return;
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.defaultFromEmail.trim())) {
        toast({ title: "Invalid Email", description: "Please enter a valid global default 'From' email address.", variant: "destructive" });
        return;
      }

      // Validate scenario-specific senders if any scenarios were selected
      if (formData.emailScenarios && formData.emailScenarios.length > 0) {
        for (const scenarioId of formData.emailScenarios) {
          const senderConfig = formData.scenarioSenders?.find(s => s.scenarioId === scenarioId);
          const scenarioLabel = emailScenarioOptions.find(opt => opt.id === scenarioId)?.label || scenarioId;

          // Use global default if specific is not set, or enforce specific entry?
          // For now, let's ensure specific entries are made if the scenario was selected.
          // This could be changed to fallback to global defaults if desired.
          const fromName = senderConfig?.fromName || formData.defaultFromName;
          const fromEmail = senderConfig?.fromEmail || formData.defaultFromEmail;

          if (!fromName?.trim()) {
            toast({ title: "Missing Information", description: `Please enter a 'From' name for scenario: ${scenarioLabel}.`, variant: "destructive" });
            return;
          }
          if (!fromEmail?.trim()) {
            toast({ title: "Missing Information", description: `Please enter a 'From' email for scenario: ${scenarioLabel}.`, variant: "destructive" });
            return;
          }
          if (!emailRegex.test(fromEmail.trim())) {
            toast({ title: "Invalid Email", description: `Please enter a valid 'From' email for scenario: ${scenarioLabel}.`, variant: "destructive" });
            return;
          }
        }
      }
    }
    
    // Prevent going beyond the last data input step with "Next"
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep !== TOTAL_STEPS || !formData.domain?.trim()) {
        toast({
            title: "Missing Domain",
            description: "Please enter a domain name on the final step.",
            variant: "destructive",
        });
        return;
    }

    const domainToSubmit = formData.domain.trim();
    setIsLoading(true);
    setResultText(null);
    setDnsRecordsToDisplay([]);
    setCurrentProviderInstructions(null);
    setErrorOccurred(false);

    try {
      // Step 1: Save form data
      const { data: saveData, error: saveError } = await supabase.functions.invoke<{success: boolean, emailSetupId: string, message: string}>(
        'save-email-setup-form',
        { body: { ...formData, domain: domainToSubmit } }
      );

      if (saveError || !saveData?.success || !saveData?.emailSetupId) {
        console.error("Error saving email setup form data:", saveError, saveData);
        toast({
          title: "Save Failed",
          description: `Could not save your setup preferences: ${saveError?.message || saveData?.message || 'Unknown error'}. Please try again.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      console.log("Form data saved successfully:", saveData);
      const retrievedEmailSetupId = saveData.emailSetupId;
      setEmailSetupId(retrievedEmailSetupId);

      // Step 2: Get domain provider information
      const { data: providerData, error: providerError } = await supabase.functions.invoke<DomainCheckResult>(
        'get-domain-provider',
        // Send only the domain name, not the entire formData for get-domain-provider
        { body: { domainName: domainToSubmit } } 
      );

      if (providerError) {
        console.error("Error fetching domain provider:", providerError);
        toast({
          title: 'Provider Check Failed',
          description: `Error fetching provider: ${providerError.message}`,
          variant: 'destructive',
        });
        setResultText(`Error fetching provider for ${domainToSubmit}: ${providerError.message}`);
        setErrorOccurred(true);
        setIsLoading(false);
        return;
      }
      
      console.log('[DomainInputPage] Full response from get-domain-provider:', providerData);

      if (providerData?.error) {
        setResultText(`Domain: ${providerData.domain || domainToSubmit}
Error from provider check: ${providerData.error}`);
        toast({
          title: 'Provider Check Failed',
          description: providerData.error,
          variant: 'destructive',
        });
        setErrorOccurred(true);
        setIsLoading(false); // Stop here if provider check itself returns an error
        return;
      }
      
      if (!providerData?.provider || !providerData?.nameservers) {
        setResultText(`Domain: ${providerData?.domain || domainToSubmit}
Could not reliably determine DNS provider. Please ensure your domain is correctly configured and publicly accessible.`);
        toast({
          title: 'Provider Check Uncertain',
          description: 'Could not reliably determine DNS provider.',
          variant: 'default',
        });
        setErrorOccurred(true);
        setIsLoading(false); // Stop if provider cannot be determined
        return;
      }

      // Step 3: Initiate email setup to get DNS records
      const providerInfoForBackend = {
        name: providerData.provider,
        nameservers: providerData.nameservers,
      };

      console.log(`[DomainInputPage] Calling initiate-email-setup with emailSetupId: ${retrievedEmailSetupId} and providerInfo:`, providerInfoForBackend);

      const { data: initiateData, error: initiateError } = await supabase.functions.invoke<InitiateEmailSetupResult>(
        'initiate-email-setup',
        { body: { emailSetupId: retrievedEmailSetupId, providerInfo: providerInfoForBackend } }
      );

      if (initiateError || !initiateData) {
        console.error("Error initiating email setup:", initiateError, initiateData);
        toast({
          title: "DNS Setup Failed",
          description: `Could not retrieve DNS setup instructions: ${initiateError?.message || 'Unknown error'}.`,
          variant: "destructive",
        });
        setResultText(`Failed to get DNS setup instructions for ${domainToSubmit}. Error: ${initiateError?.message || 'Function returned no data.'}`);
        setErrorOccurred(true);
        setIsLoading(false);
        return;
      }

      console.log('[DomainInputPage] Response from initiate-email-setup:', initiateData);
      
      // Successfully got DNS records and message
      setResultText(initiateData.message); // General status message
      setDnsRecordsToDisplay(initiateData.requiredDnsRecords);
      
      // Get provider-specific instructions
      const instructions = getInstructionsForProvider(providerData.provider);
      setCurrentProviderInstructions(instructions);
      setErrorOccurred(false); // Clear error state on success

      toast({
        title: "DNS Configuration Ready",
        description: initiateData.message, 
        duration: 7000,
      });

    } catch (error) { 
      console.error('Generic error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during the setup process.';
      setResultText(`Domain: ${domainToSubmit}\nError: ${errorMessage}`);
      setErrorOccurred(true);
      toast({
        title: 'Setup Process Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle DNS verification call
  const handleVerifyDns = async () => {
    if (!emailSetupId) {
      toast({
        title: "Error",
        description: "Email Setup ID is missing. Cannot verify DNS.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    // Optimistically set individual statuses to pending if not already set, or keep current.
    setVerificationStatus(prev => ({
      overall: prev.overall === "not_started" || prev.overall === "failed_to_verify" ? "pending" : prev.overall,
      mx: prev.mx || { recordType: "MX", status: "pending" },
      spf: prev.spf || { recordType: "SPF", status: "pending" },
      dkim: prev.dkim || { recordType: "DKIM", status: "pending" },
      dmarc: prev.dmarc || { recordType: "DMARC", status: "pending" },
    }));

    try {
      const { data, error } = await supabase.functions.invoke<VerifyDnsResponse>(
        'verify-dns-records',
        { body: { emailSetupId } }
      );

      if (error || !data) {
        console.error("Error verifying DNS records:", error);
        const errorMsg = error?.message || data?.verificationFailureReason || "Failed to verify DNS. Unknown error.";
        setVerificationError(errorMsg);
        setVerificationStatus(prev => ({ ...prev, overall: "failed_to_verify" }));
        toast({
          title: "DNS Verification Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      console.log("DNS Verification successful:", data);
      setVerificationStatus({
        overall: data.overallDnsStatus,
        mx: data.mxStatus,
        spf: data.spfStatus,
        dkim: data.dkimStatus,
        dmarc: data.dmarcStatus,
      });
      setLastVerificationTime(new Date(data.lastVerificationAttemptAt).toLocaleString());
      if (data.verificationFailureReason) {
        setVerificationError(data.verificationFailureReason);
      }
      
      toast({
        title: `DNS Verification: ${data.overallDnsStatus.replace('_', ' ').toUpperCase()}`,
        description: data.verificationFailureReason || "DNS status updated.",
        variant: data.overallDnsStatus === "verified" ? "default" : (data.overallDnsStatus === "failed_to_verify" ? "destructive" : "default"),
        duration: 7000,
      });

    } catch (e) {
      console.error("Exception verifying DNS:", e);
      const errorMsg = e instanceof Error ? e.message : "An unexpected error occurred during DNS verification.";
      setVerificationError(errorMsg);
      setVerificationStatus(prev => ({ ...prev, overall: "failed_to_verify" }));
      toast({
        title: "DNS Verification Exception",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper to get the title for the current step
  const getStepTitle = () => {
    if (currentProviderInstructions || dnsRecordsToDisplay.length > 0 || errorOccurred) return "DNS Setup Instructions";
    switch (currentStep) {
      case 1: return "Step 1: Your Business";
      case 2: return "Step 2: Business Details";
      case 3: return "Step 3: Your Goals";
      case 4: return "Step 4: Email Sending Scenarios";
      case 5: return "Step 5: Configure Sending Address";
      case 6: return "Step 6: Domain Information";
      default: return "Email Setup";
    }
  };

  // Helper to get the description for the current step
  const getStepDescription = () => {
    if (currentProviderInstructions || dnsRecordsToDisplay.length > 0 || errorOccurred) {
      return `Follow these steps to configure DNS for ${formData.domain || 'your domain'}.`;
    }
    switch (currentStep) {
      case 1: return "Tell us about your primary area of business.";
      case 2: return "Provide more details about your specific business category.";
      case 3: return "What are your main goals for using our email platform?";
      case 4: return "What types of emails or for which scenarios do you primarily intend to send? Select all that apply.";
      case 5: return "Configure the 'From' name and email address for your emails. You can set defaults and then customize for specific scenarios.";
      case 6: return "Enter the domain name you wish to set up for email sending.";
      default: return "Follow the steps to set up your email.";
    }
  };

  // NEW: Function to render DNS Verification UI
  const renderVerificationUI = () => {
    if (!dnsRecordsToDisplay.length || !currentProviderInstructions || !emailSetupId) {
      return null; // Only show if initial setup is done and DNS records are displayed
    }

    let bannerClass = "p-4 rounded-md mb-4 text-sm ";
    let bannerText = "DNS Verification Status: Unknown";

    switch (verificationStatus.overall) {
      case "not_started":
        bannerClass += "bg-gray-100 text-gray-700";
        bannerText = "DNS verification has not started. Click 'Verify DNS Records' to check.";
        break;
      case "pending":
        bannerClass += "bg-yellow-100 text-yellow-700";
        bannerText = "DNS Verification Pending... Click 'Verify DNS Records' or wait for automatic check.";
        break;
      case "partially_verified":
        bannerClass += "bg-blue-100 text-blue-700";
        bannerText = "DNS Verification Partially Complete. Some records are verified, some are pending or failed.";
        break;
      case "verified":
        bannerClass += "bg-green-100 text-green-700";
        bannerText = "All DNS records verified successfully!";
        break;
      case "failed_to_verify":
        bannerClass += "bg-red-100 text-red-700";
        bannerText = "DNS Verification Failed. Please check the errors below and your DNS settings.";
        break;
      default:
        bannerClass += "bg-gray-100 text-gray-700";
    }

    const renderStatusItem = (item: DnsVerificationStatusItem | null, type: string) => {
      if (!item) return <p>{type}: Status not yet available.</p>;
      let itemClass = "";
      switch (item.status) {
        case "verified": itemClass = "text-green-600 font-semibold"; break;
        case "failed": itemClass = "text-red-600 font-semibold"; break;
        case "pending": itemClass = "text-yellow-600 font-semibold"; break;
        case "error": itemClass = "text-orange-600 font-semibold"; break;
      }
      return (
        <div className="mb-1">
          <span className={itemClass}>{type}: {item.status.toUpperCase()}</span>
          {item.message && <span className="text-xs block text-gray-500">Details: {item.message}</span>}
          {item.queriedValue && <span className="text-xs block text-gray-500">Queried: {Array.isArray(item.queriedValue) ? item.queriedValue.join(', ') : item.queriedValue}</span>}
        </div>
      );
    };

    return (
      <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">DNS Verification</h3>
        <div className={bannerClass} role="alert">
          {bannerText}
        </div>
        
        {verificationStatus.overall !== "not_started" && (
          <div className="mb-4 space-y-2">
            {renderStatusItem(verificationStatus.mx, "MX")}
            {renderStatusItem(verificationStatus.spf, "SPF")}
            {renderStatusItem(verificationStatus.dkim, "DKIM")}
            {renderStatusItem(verificationStatus.dmarc, "DMARC")}
          </div>
        )}

        {verificationError && (
          <p className="text-red-600 text-sm mb-3">Error: {verificationError}</p>
        )}
        {lastVerificationTime && (
          <p className="text-gray-500 text-xs mb-3">Last checked: {lastVerificationTime}</p>
        )}

        <Button 
          onClick={handleVerifyDns} 
          disabled={isVerifying || !emailSetupId}
          className="w-full sm:w-auto"
        >
          {isVerifying ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </>
          ) : "Verify DNS Records"}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-background pt-12 px-4 md:pt-20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>{getStepTitle()}</CardTitle>
            {!resultText && currentStep <= TOTAL_STEPS && (
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
            )}
          </div>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="areaOfBusiness">Area of Business</Label>
                <Select
                  value={formData.areaOfBusiness || ''}
                  onValueChange={(value) => {
                    handleSelectChange('areaOfBusiness')(value);
                    const newAreaSubcategories = subCategoryOptions[value];
                    if (!newAreaSubcategories || !newAreaSubcategories.find(sc => sc.value === formData.subCategory)) {
                        handleInputChange('subCategory', '');
                    }
                  }}
                >
                  <SelectTrigger id="areaOfBusiness">
                    <SelectValue placeholder="Select your primary area of business" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">Ecommerce</SelectItem>
                    <SelectItem value="blogging">Blogging</SelectItem>
                    <SelectItem value="software_saas">Software/SaaS</SelectItem>
                    <SelectItem value="services">Services (Consulting, Agency)</SelectItem>
                    <SelectItem value="local_business">Local Business</SelectItem>
                    <SelectItem value="non_profit">Non-Profit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="subCategory">Business Subcategory</Label>
                {formData.areaOfBusiness && subCategoryOptions[formData.areaOfBusiness] && subCategoryOptions[formData.areaOfBusiness].length > 0 ? (
                  <Select
                    value={formData.subCategory || ''}
                    onValueChange={handleSelectChange('subCategory')}
                  >
                    <SelectTrigger id="subCategory">
                      <SelectValue placeholder={`Select subcategory for ${formData.areaOfBusiness.replace("_", " ")}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategoryOptions[formData.areaOfBusiness].map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formData.areaOfBusiness ? "No specific subcategories for this area, or select an area first." : "Please select an area of business in Step 1."}
                  </p>
                )}
              </div>
            )}
            {currentStep === 3 && (
                 <div className="space-y-2">
                    <Label className="mb-2 block">What are your specific goals?</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Select all that apply. This helps us tailor your experience.
                    </p>
                    <div className="space-y-3">
                        {goalOptions.map((goal) => (
                            <div key={goal.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`goal-${goal.id}`}
                                    checked={(formData.goals || []).includes(goal.id)}
                                    onCheckedChange={(checked) => handleCheckboxChange('goals', goal.id, checked)}
                                />
                                <Label htmlFor={`goal-${goal.id}`} className="font-normal">
                                    {goal.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {currentStep === 4 && (
                 <div className="space-y-2">
                    <Label className="mb-2 block">Key Email Sending Scenarios</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        What types of emails will you be sending? Select all that apply.
                    </p>
                    {["User Actions", "Marketing & Engagement", "Automated", "Other"].map(category => (
                        <div key={category} className="mb-4">
                            <h4 className="font-semibold text-md mb-2 text-foreground/80">{category}</h4>
                            <div className="space-y-3 pl-2">
                                {emailScenarioOptions.filter(opt => opt.category === category).map((scenario) => (
                                    <div key={scenario.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`scenario-${scenario.id}`}
                                            checked={(formData.emailScenarios || []).includes(scenario.id)}
                                            onCheckedChange={(checked) => handleCheckboxChange('emailScenarios', scenario.id, checked)}
                                        />
                                        <Label htmlFor={`scenario-${scenario.id}`} className="font-normal">
                                            {scenario.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {currentStep === 5 && (
                <div className="space-y-6">
                    <div className="p-4 border rounded-md bg-muted/40">
                        <h4 className="font-semibold text-lg mb-3">Global Default Sender</h4>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="defaultFromName">Default "From" Name</Label>
                                <Input 
                                    id="defaultFromName"
                                    placeholder="e.g., Your Company or Your Name"
                                    value={formData.defaultFromName || ''}
                                    onChange={(e) => handleInputChange('defaultFromName', e.target.value)}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    This name will be the default sender for your emails.
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="defaultFromEmail">Default "From" Email Address</Label>
                                <Input 
                                    id="defaultFromEmail"
                                    type="email"
                                    placeholder="e.g., info@yourdomain.com"
                                    value={formData.defaultFromEmail || ''}
                                    onChange={(e) => handleInputChange('defaultFromEmail', e.target.value)}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    This email will be the default sender. We recommend using an address at the domain you'll enter in the next step.
                                </p>
                            </div>
                        </div>
                    </div>

                    {formData.emailScenarios && formData.emailScenarios.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h4 className="font-semibold text-lg mb-3">Customize Sender for Specific Scenarios (Optional)</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                For each type of email you selected in the previous step, you can specify a different "From" name and email. 
                                If left blank, the global defaults above will be used.
                            </p>
                            {formData.emailScenarios.map(scenarioId => {
                                const scenario = emailScenarioOptions.find(opt => opt.id === scenarioId);
                                const senderConfig = formData.scenarioSenders?.find(s => s.scenarioId === scenarioId);
                                if (!scenario) return null;

                                return (
                                    <div key={scenarioId} className="p-4 border rounded-md space-y-3">
                                        <h5 className="font-medium text-md">Scenario: <span className="text-primary">{scenario.label}</span></h5>
                                        <div>
                                            <Label htmlFor={`scenarioFromName-${scenarioId}`}>"From" Name for this scenario</Label>
                                            <Input 
                                                id={`scenarioFromName-${scenarioId}`}
                                                placeholder={`Default: ${formData.defaultFromName || "Not set"}`}
                                                value={senderConfig?.fromName || ''}
                                                onChange={(e) => handleScenarioSenderChange(scenarioId, 'fromName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`scenarioFromEmail-${scenarioId}`}>"From" Email for this scenario</Label>
                                            <Input 
                                                id={`scenarioFromEmail-${scenarioId}`}
                                                type="email"
                                                placeholder={`Default: ${formData.defaultFromEmail || "Not set"}`}
                                                value={senderConfig?.fromEmail || ''}
                                                onChange={(e) => handleScenarioSenderChange(scenarioId, 'fromEmail', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            
            {currentStep === TOTAL_STEPS && !(currentProviderInstructions || dnsRecordsToDisplay.length > 0 || errorOccurred) && (
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="e.g., example.com"
                  value={formData.domain || ''}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {(currentProviderInstructions || dnsRecordsToDisplay.length > 0 || errorOccurred) && (
              <div className="mt-6 space-y-6">
                {resultText && (
                  <div className={`p-4 rounded-md ${errorOccurred ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                    <h4 className="font-semibold mb-1">Status:</h4>
                    <p className="text-sm whitespace-pre-wrap">{resultText}</p>
                  </div>
                )}

                {currentProviderInstructions && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Instructions for: {currentProviderInstructions.displayName}
                      </CardTitle>
                      {currentProviderInstructions.dnsManagementUrl && (
                        <a 
                          href={currentProviderInstructions.dnsManagementUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Go to {currentProviderInstructions.displayName} DNS Management
                        </a>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentProviderInstructions.generalNotes && currentProviderInstructions.generalNotes.length > 0 && (
                        <div>
                          <h5 className="font-semibold mb-1">General Notes:</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {currentProviderInstructions.generalNotes.map((note, idx) => <li key={idx}>{note}</li>)}
                          </ul>
                        </div>
                      )}
                      <div>
                        <h5 className="font-semibold mb-2">Setup Steps:</h5>
                        <ol className="list-decimal list-inside space-y-3">
                          {currentProviderInstructions.instructionSteps.map((step, idx) => (
                            <li key={idx}>
                              <strong className="block">{step.title}</strong>
                              <p className="text-sm text-muted-foreground">{step.description} 
                                {step.link && <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Learn more</a>}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {dnsRecordsToDisplay.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>DNS Records to Add</CardTitle>
                      <CardDescription>
                        Add the following DNS records to your provider ({currentProviderInstructions?.displayName || formData.domain}). 
                        The 'Host' field might also be called 'Name' or 'Hostname'. The 'Value' might be 'Content' or 'Points to'.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                                {currentProviderInstructions?.uiFieldNames?.host || 'Host/Name'}
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                                {currentProviderInstructions?.uiFieldNames?.value || 'Value/Points To'}
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Copy</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dnsRecordsToDisplay.map((record, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 whitespace-nowrap">{record.type}</td>
                                <td className="px-3 py-2 whitespace-nowrap font-mono bg-gray-50 rounded">{record.host}</td>
                                <td className="px-3 py-2">
                                  <pre className="whitespace-pre-wrap break-all font-mono bg-gray-50 p-1 rounded">{record.value}</pre>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">{record.priority || 'N/A'}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{record.ttl || 'Default'}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${record.type} ${record.host} ${record.value}${record.priority ? ' ' + record.priority : ''}`);
                                      toast({ title: "Copied!", description: "Record details copied to clipboard." });
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {currentProviderInstructions?.recordSpecificTips && (
                        <div className="mt-4 space-y-2">
                          {dnsRecordsToDisplay.map(record => {
                            const tips = currentProviderInstructions.recordSpecificTips?.[record.type as keyof ProviderInstruction['recordSpecificTips']];
                            if (tips && tips.length > 0) {
                              return (
                                <div key={`${record.type}-${record.host}-tips`} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <h6 className="font-semibold text-blue-700">Tips for {record.type} records with {currentProviderInstructions.displayName}:</h6>
                                  <ul className="list-disc list-inside text-xs text-blue-600 space-y-1">
                                    {tips.map((tip, tipIdx) => <li key={tipIdx}>{tip}</li>)}
                                  </ul>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {renderVerificationUI()}

                {(currentProviderInstructions || dnsRecordsToDisplay.length > 0) && (
                     <Button 
                        type="button" 
                        className="w-full mt-4" 
                        onClick={() => { 
                            setCurrentStep(1);
                            setFormData({});
                            setResultText(null);
                            setDnsRecordsToDisplay([]);
                            setCurrentProviderInstructions(null);
                            setErrorOccurred(false);
                        }}
                    >
                        Configure Another Domain / Start Over
                    </Button>
                )}

              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start pt-6">
            {!resultText && (
              <div className="flex w-full justify-between mb-4">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < TOTAL_STEPS && (
                  <Button type="button" onClick={nextStep} disabled={isLoading}>
                    Next
                  </Button>
                )}
              </div>
            )}

            {(currentStep === TOTAL_STEPS || resultText) && (
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || (currentStep === TOTAL_STEPS && !formData.domain?.trim())}
                >
                  {isLoading ? 'Checking...' : (resultText ? 'Start Over / Check Another' : 'Check Domain Provider')}
                </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default DomainInputPage;
