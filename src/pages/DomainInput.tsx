import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define the total number of data input steps in the form
const TOTAL_STEPS = 5; // 1: Area of Business, 2: SubCategory, 3: Goals, 4: Email Scenarios, 5: Domain

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

interface EmailSetupFormData {
  areaOfBusiness?: string;
  subCategory?: string;
  goals?: string[];
  emailScenarios?: string[]; // REPLACED sendTimeline
  domain?: string;
}

interface DomainCheckResult {
  provider?: string;
  nameservers?: string[];
  error?: string;
  domain?: string;
}

const DomainInputPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmailSetupFormData>({});
  
  // const [domain, setDomain] = useState(''); // Keep this commented or remove, as domain is in formData
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof EmailSetupFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSelectChange = (field: keyof EmailSetupFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler for checkbox changes (for multi-select like goals)
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
    // This function is now primarily for the final domain submission
    // Ensure all required formData is present before actual submission to backend
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

    try {
      const { data, error: functionError } = await supabase.functions.invoke<DomainCheckResult>(
        'get-domain-provider',
        { body: { domainName: domainToSubmit, ...formData } }
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

  // Helper to get the title for the current step
  const getStepTitle = () => {
    if (resultText) return "Domain Check Result";
    switch (currentStep) {
      case 1: return "Step 1: Your Business";
      case 2: return "Step 2: Business Details"; // Placeholder for SubCategory
      case 3: return "Step 3: Your Goals"; // Placeholder for Goals
      case 4: return "Step 4: Email Sending Scenarios"; // Placeholder for Email Scenarios
      case 5: return "Step 5: Domain Information"; // Domain input step
      default: return "Email Setup";
    }
  };

  // Helper to get the description for the current step
  const getStepDescription = () => {
    if (resultText) return "Details about your domain provider.";
    switch (currentStep) {
      case 1: return "Tell us about your primary area of business.";
      case 2: return "Provide more details about your specific business category.";
      case 3: return "What are your main goals for using our email platform?";
      case 4: return "What types of emails or for which scenarios do you primarily intend to send? Select all that apply."; // UPDATED for Step 4
      case 5: return "Enter the domain name you wish to set up.";
      default: return "Follow the steps to set up your email.";
    }
  };

  return (
    // Adjusted padding-top for better centering of a larger card
    <div className="flex justify-center items-start min-h-screen bg-background pt-12 px-4 md:pt-20">
      {/* Increased max-width for a larger card on medium screens and up */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>{getStepTitle()}</CardTitle>
            {/* Show step progress if not showing results */}
            {!resultText && currentStep <= TOTAL_STEPS && (
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
            )}
          </div>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        {/* Form submission is handled by the button in the footer for the final step */}
        <form onSubmit={handleSubmit}>
          {/* Increased vertical spacing for form elements */}
          <CardContent className="space-y-6">
            {/* Step 1: Area of Business */}
            {currentStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="areaOfBusiness">Area of Business</Label>
                <Select
                  value={formData.areaOfBusiness || ''} // Ensure value is not undefined for Select
                  onValueChange={(value) => {
                    // When area of business changes, reset subCategory if it's no longer valid
                    // or if the new area has different subcategories.
                    handleSelectChange('areaOfBusiness')(value);
                    const newAreaSubcategories = subCategoryOptions[value];
                    if (!newAreaSubcategories || !newAreaSubcategories.find(sc => sc.value === formData.subCategory)) {
                        handleInputChange('subCategory', ''); // Reset subCategory
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

            {/* Step 2: Business Subcategory - Implemented */}
            {currentStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="subCategory">Business Subcategory</Label>
                {formData.areaOfBusiness && subCategoryOptions[formData.areaOfBusiness] && subCategoryOptions[formData.areaOfBusiness].length > 0 ? (
                  <Select
                    value={formData.subCategory || ''} // Ensure value is not undefined
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
            {/* Placeholder for Step 3: Specific Goals - Implemented */}
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
            {/* Step 4: Email Sending Scenarios - REVISED */}
             {currentStep === 4 && (
                 <div className="space-y-2">
                    <Label className="mb-2 block">Key Email Sending Scenarios</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        What types of emails will you be sending? Select all that apply.
                    </p>
                    {/* Grouping checkboxes by category for better readability */}
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
            
            {/* Step 5: Domain Input (Moved to be the last data input step) */}
            {currentStep === TOTAL_STEPS && !resultText && (
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
            
            {resultText && (
              <div className="mt-6 p-4 bg-muted rounded-md w-full">
                <h4 className="font-semibold mb-2">Result:</h4>
                <pre className="text-sm whitespace-pre-wrap">{resultText}</pre>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start pt-6">
            {/* Navigation Buttons Container - ensures consistent layout */}
            {!resultText && (
              <div className="flex w-full justify-between mb-4">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
                    Previous
                  </Button>
                ) : (
                  /* Placeholder div to keep "Next" button to the right if no "Previous" button */
                  <div />
                )}

                {currentStep < TOTAL_STEPS && (
                  <Button type="button" onClick={nextStep} disabled={isLoading}>
                    Next
                  </Button>
                )}
              </div>
            )}

            {/* Submit button - shown on the last data input step or if results are shown */}
            {(currentStep === TOTAL_STEPS || resultText) && (
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || (currentStep === TOTAL_STEPS && !formData.domain?.trim())} // Disable if domain is empty on domain step
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
