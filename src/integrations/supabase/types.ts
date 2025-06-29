export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_process_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          project_id: string | null
          run_id: string
          status: string | null
          step_name: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          project_id?: string | null
          run_id: string
          status?: string | null
          step_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          project_id?: string | null
          run_id?: string
          status?: string | null
          step_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_process_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_clarifying_chat: boolean
          is_error: boolean
          message_type: string | null
          mode: string | null
          project_id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_clarifying_chat: boolean
          is_error?: boolean
          message_type?: string | null
          mode?: string | null
          project_id: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_clarifying_chat?: boolean
          is_error?: boolean
          message_type?: string | null
          mode?: string | null
          project_id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_setups: {
        Row: {
          business_area: string | null
          business_description: string | null
          business_subcategory: string | null
          created_at: string
          default_from_email: string | null
          default_from_name: string | null
          dkim_public_key: string | null
          dkim_selector: string | null
          dkim_status: string | null
          dmarc_record_value: string | null
          dmarc_status: string | null
          dns_provider_name: string | null
          dns_records_to_set: Json | null
          dns_setup_strategy: string | null
          domain: string | null
          email_scenarios: string[] | null
          error_message: string | null
          form_complete: boolean
          goals: string[] | null
          goals_form_raw_text: string | null
          id: string
          last_verification_attempt_at: string | null
          mx_record_value: string | null
          mx_status: string | null
          overall_dns_status: string | null
          provider_api_credentials_status: string | null
          selected_campaign_ids: string[] | null
          send_timeline: string | null
          spf_record_value: string | null
          spf_status: string | null
          status: string
          tracking_pixel_id: string | null
          updated_at: string
          user_id: string
          verification_failure_reason: string | null
          website_provider: string | null
        }
        Insert: {
          business_area?: string | null
          business_description?: string | null
          business_subcategory?: string | null
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: string | null
          dmarc_record_value?: string | null
          dmarc_status?: string | null
          dns_provider_name?: string | null
          dns_records_to_set?: Json | null
          dns_setup_strategy?: string | null
          domain?: string | null
          email_scenarios?: string[] | null
          error_message?: string | null
          form_complete?: boolean
          goals?: string[] | null
          goals_form_raw_text?: string | null
          id?: string
          last_verification_attempt_at?: string | null
          mx_record_value?: string | null
          mx_status?: string | null
          overall_dns_status?: string | null
          provider_api_credentials_status?: string | null
          selected_campaign_ids?: string[] | null
          send_timeline?: string | null
          spf_record_value?: string | null
          spf_status?: string | null
          status?: string
          tracking_pixel_id?: string | null
          updated_at?: string
          user_id: string
          verification_failure_reason?: string | null
          website_provider?: string | null
        }
        Update: {
          business_area?: string | null
          business_description?: string | null
          business_subcategory?: string | null
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: string | null
          dmarc_record_value?: string | null
          dmarc_status?: string | null
          dns_provider_name?: string | null
          dns_records_to_set?: Json | null
          dns_setup_strategy?: string | null
          domain?: string | null
          email_scenarios?: string[] | null
          error_message?: string | null
          form_complete?: boolean
          goals?: string[] | null
          goals_form_raw_text?: string | null
          id?: string
          last_verification_attempt_at?: string | null
          mx_record_value?: string | null
          mx_status?: string | null
          overall_dns_status?: string | null
          provider_api_credentials_status?: string | null
          selected_campaign_ids?: string[] | null
          send_timeline?: string | null
          spf_record_value?: string | null
          spf_status?: string | null
          status?: string
          tracking_pixel_id?: string | null
          updated_at?: string
          user_id?: string
          verification_failure_reason?: string | null
          website_provider?: string | null
        }
        Relationships: []
      }
      email_versions: {
        Row: {
          created_at: string | null
          id: string
          is_published: boolean | null
          project_id: string
          semantic_email_v2: Json
          version_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          project_id: string
          semantic_email_v2: Json
          version_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          project_id?: string
          semantic_email_v2?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_changes: {
        Row: {
          ai_rationale: string | null
          batch_id: string
          change_type: string
          created_at: string
          id: string
          new_content: Json | null
          old_content: Json | null
          order_of_application: number | null
          project_id: string
          status: string
          target_id: string
          target_parent_id: string | null
          updated_at: string
        }
        Insert: {
          ai_rationale?: string | null
          batch_id: string
          change_type: string
          created_at?: string
          id?: string
          new_content?: Json | null
          old_content?: Json | null
          order_of_application?: number | null
          project_id: string
          status?: string
          target_id: string
          target_parent_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_rationale?: string | null
          batch_id?: string
          change_type?: string
          created_at?: string
          id?: string
          new_content?: Json | null
          old_content?: Json | null
          order_of_application?: number | null
          project_id?: string
          status?: string
          target_id?: string
          target_parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          current_clarification_context: Json | null
          current_html: string | null
          email_content_structured: Json | null
          id: string
          is_archived: boolean | null
          last_edited_at: string | null
          name: string
          semantic_email_v2_deprecated: Json | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          current_clarification_context?: Json | null
          current_html?: string | null
          email_content_structured?: Json | null
          id?: string
          is_archived?: boolean | null
          last_edited_at?: string | null
          name?: string
          semantic_email_v2_deprecated?: Json | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string | null
          current_clarification_context?: Json | null
          current_html?: string | null
          email_content_structured?: Json | null
          id?: string
          is_archived?: boolean | null
          last_edited_at?: string | null
          name?: string
          semantic_email_v2_deprecated?: Json | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      scenario_sender_configs: {
        Row: {
          created_at: string
          email_setup_id: string
          from_email: string | null
          from_name: string | null
          id: string
          scenario_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_setup_id: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          scenario_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_setup_id?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_sender_configs_email_setup_id_fkey"
            columns: ["email_setup_id"]
            isOneToOne: false
            referencedRelation: "email_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_events: {
        Row: {
          client_timestamp: string | null
          email_setup_id: string | null
          event_data: Json | null
          event_name: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          received_at: string
          user_agent: string | null
        }
        Insert: {
          client_timestamp?: string | null
          email_setup_id?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          received_at?: string
          user_agent?: string | null
        }
        Update: {
          client_timestamp?: string | null
          email_setup_id?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          received_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_events_email_setup_id_fkey_references_tracking_pixel_id"
            columns: ["email_setup_id"]
            isOneToOne: false
            referencedRelation: "email_setups"
            referencedColumns: ["tracking_pixel_id"]
          },
        ]
      }
      user_info: {
        Row: {
          auth_user_uuid: string | null
          created_at: string
          id: number
          project_count: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          username: string | null
        }
        Insert: {
          auth_user_uuid?: string | null
          created_at?: string
          id?: number
          project_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          username?: string | null
        }
        Update: {
          auth_user_uuid?: string | null
          created_at?: string
          id?: number
          project_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_project_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      manage_reject_transaction: {
        Args: {
          _project_id: string
          _reverted_semantic_email: Json
          _reverted_html: string
          _change_ids: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
