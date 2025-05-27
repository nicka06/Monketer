export interface EmailCampaign {
  id: string; // Unique identifier, e.g., 'welcome_new_subscriber'
  name: string; // Display name, e.g., 'Welcome New Subscriber'
  description: string; // Short explanation shown to the user
}

export interface EmailCategory {
  id: string; // Unique identifier for the category, e.g., 'welcome_onboarding'
  name: string; // Display name for the category, e.g., 'Welcome & Onboarding'
  campaigns: EmailCampaign[];
}

export const EMAIL_CAMPAIGN_CATEGORIES: EmailCategory[] = [
  {
    id: 'welcome_onboarding',
    name: 'Welcome & Onboarding',
    campaigns: [
      { id: 'welcome_new_subscriber', name: 'Welcome New Subscriber', description: 'Sent when someone signs up for your mailing list.' },
      { id: 'welcome_new_customer', name: 'Welcome New Customer', description: 'Sent after a customer makes their first purchase.' },
      { id: 'onboarding_series_1', name: 'Onboarding Email 1 (Intro)', description: 'First email in a series to introduce your brand/service.' },
      { id: 'onboarding_series_2', name: 'Onboarding Email 2 (Features/Benefits)', description: 'Second email highlighting key features or benefits.' },
      { id: 'onboarding_series_3', name: 'Onboarding Email 3 (Call to Action)', description: 'Third email encouraging a specific action (e.g., complete profile, make a purchase).' },
    ],
  },
  {
    id: 'ecommerce_triggers',
    name: 'E-commerce Triggers (User Actions)',
    campaigns: [
      { id: 'abandoned_cart_1', name: 'Abandoned Cart Reminder (1st)', description: 'Reminds users of items left in their cart (sent after a few hours).' },
      { id: 'abandoned_cart_2_incentive', name: 'Abandoned Cart Reminder (2nd w/ Incentive)', description: 'Second reminder, possibly with a discount (sent after 24-48 hours).' },
      { id: 'browse_abandonment', name: 'Browse Abandonment', description: 'Sent if a user viewed products but didn\'t add to cart or purchase.' },
      { id: 'post_purchase_thank_you', name: 'Post-Purchase Thank You & Order Confirmation', description: 'Confirms order and thanks the customer.' },
      { id: 'post_purchase_review_request', name: 'Post-Purchase Review Request', description: 'Asks customers to leave a review for their purchased items.' },
      { id: 'wishlist_back_in_stock', name: 'Wishlist Item - Back in Stock', description: 'Notifies user when an item they showed interest in is available again.' },
      { id: 'wishlist_price_drop', name: 'Wishlist Item - Price Drop', description: 'Notifies user when an item they showed interest in has a price reduction.' },
    ],
  },
  {
    id: 'engagement_re_engagement',
    name: 'Engagement & Re-engagement',
    campaigns: [
      { id: 're_engagement_inactive_1', name: 'Re-engagement for Inactive Subscribers (1st)', description: 'Attempts to win back subscribers who haven\'t opened emails recently.' },
      { id: 're_engagement_inactive_2_offer', name: 'Re-engagement for Inactive Subscribers (2nd w/ Offer)', description: 'Second attempt with a special offer or incentive.' },
      { id: 'birthday_greeting', name: 'Birthday/Anniversary Greeting', description: 'Sends a personalized message on a special date.' },
      { id: 'feedback_survey_request', name: 'Feedback/Survey Request', description: 'Asks subscribers for their opinion or to complete a survey.' },
    ],
  },
  {
    id: 'scheduled_promotional',
    name: 'Scheduled & Promotional',
    campaigns: [
      { id: 'weekly_newsletter', name: 'Weekly Newsletter', description: 'Regular updates, news, or curated content.' },
      { id: 'monthly_newsletter', name: 'Monthly Newsletter', description: 'Less frequent regular updates or summaries.' },
      { id: 'new_product_announcement', name: 'New Product/Service Announcement', description: 'Informs subscribers about new offerings.' },
      { id: 'general_sale_promotion', name: 'General Sale Promotion', description: 'Announces a site-wide or category-wide sale.' },
      { id: 'holiday_promotion_bfcm', name: 'Holiday Promotion (e.g., Black Friday)', description: 'Specific campaign for major shopping holidays.' },
      { id: 'event_webinar_invitation', name: 'Event/Webinar Invitation', description: 'Invites subscribers to an upcoming event or webinar.' },
      { id: 'event_webinar_reminder', name: 'Event/Webinar Reminder', description: 'Reminds registered users or interested parties about an event.' },
    ],
  },
  {
    id: 'informational_updates',
    name: 'Informational & Updates',
    campaigns: [
      { id: 'new_blog_post_notification', name: 'New Blog Post Notification', description: 'Alerts subscribers to new content on your blog.' },
      { id: 'policy_update_terms', name: 'Policy Update (Terms of Service)', description: 'Informs users about changes to your terms.' },
      { id: 'policy_update_privacy', name: 'Policy Update (Privacy Policy)', description: 'Informs users about changes to your privacy policy.' },
      { id: 'important_account_notification', name: 'Important Account Notification', description: 'For critical updates regarding their account or services.' },
    ],
  },
]; 