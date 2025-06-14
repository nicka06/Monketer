/**
 * Supabase Database Type Definitions
 * 
 * This module provides TypeScript type definitions that mirror the Supabase database schema.
 * These types enable type-safe database operations throughout the application,
 * ensuring compile-time verification of database interactions.
 * 
 * Note: This file is typically generated by the Supabase CLI and should be
 * updated when database schema changes occur.
 */

/**
 * JSON type definition
 * Represents valid JSON values in Supabase's PostgreSQL JSON columns
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database Schema Type
 * 
 * Complete type representation of the application's database schema:
 * - Tables: Structure and relationships between database tables
 * - Views: Database views (if any)
 * - Functions: Database functions (if any)
 * - Enums: PostgreSQL enum types (if any)
 * - CompositeTypes: PostgreSQL composite types (if any)
 * 
 * This nested type structure maps directly to the Supabase PostgreSQL schema.
 */
export type Database = {
  public: {
    Tables: {
      /**
       * Chat Messages Table
       * Stores conversation history between users and AI
       */
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          role: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          role?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string | null
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
      /**
       * Email Versions Table
       * Stores version history for email projects
       */
      email_versions: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_published: boolean | null
          project_id: string
          version_number: number
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          project_id: string
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          project_id?: string
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
      /**
       * Pending Changes Table
       * Tracks changes that are staged but not yet committed to an email
       */
      pending_changes: {
        Row: {
          change_type: string
          created_at: string | null
          element_id: string
          id: string
          new_content: Json | null
          old_content: Json | null
          project_id: string
          status: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          element_id: string
          id?: string
          new_content?: Json | null
          old_content?: Json | null
          project_id: string
          status?: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          element_id?: string
          id?: string
          new_content?: Json | null
          old_content?: Json | null
          project_id?: string
          status?: string
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
      /**
       * Projects Table
       * Main table storing email projects
       */
      projects: {
        Row: {
          created_at: string | null
          current_html: string | null
          id: string
          is_archived: boolean | null
          last_edited_at: string | null
          name: string
          semantic_email: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_html?: string | null
          id?: string
          is_archived?: boolean | null
          last_edited_at?: string | null
          name?: string
          semantic_email?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_html?: string | null
          id?: string
          is_archived?: boolean | null
          last_edited_at?: string | null
          name?: string
          semantic_email?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      /**
       * User Info Table
       * Stores additional user profile information
       */
      user_info: {
        Row: {
          created_at: string
          id: number
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          username?: string | null
        }
        Relationships: []
      }
      /**
       * Blog Posts Table
       * Stores blog post content and metadata
       */
      blog_posts: {
        Row: {
          id: string
          created_at: string
          title: string
          slug: string
          content: string
          author: string | null
          category: string | null
          image_url: string | null
          excerpt: string | null
          published_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          slug: string
          content: string
          author?: string | null
          category?: string | null
          image_url?: string | null
          excerpt?: string | null
          published_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          slug?: string
          content?: string
          author?: string | null
          category?: string | null
          image_url?: string | null
          excerpt?: string | null
          published_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/**
 * Default Schema Type
 * Convenience type alias for the main public schema
 */
type DefaultSchema = Database[Extract<keyof Database, "public">]

/**
 * Tables Type Helper
 * 
 * Type helper to extract row types for a specific table.
 * Enables strongly-typed database queries using the Row type.
 * 
 * @example
 * type Project = Tables<'projects'>
 * const project: Project = { id: '123', name: 'My Email', ... }
 */
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

/**
 * Tables Insert Type Helper
 * 
 * Type helper to extract insert types for a specific table.
 * Ensures type safety when inserting records into the database.
 * 
 * @example
 * type ProjectInsert = TablesInsert<'projects'>
 * const newProject: ProjectInsert = { name: 'New Email', user_id: '123' }
 * await supabase.from('projects').insert(newProject)
 */
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

/**
 * Tables Update Type Helper
 * 
 * Type helper to extract update types for a specific table.
 * Ensures type safety when updating records in the database.
 * 
 * @example
 * type ProjectUpdate = TablesUpdate<'projects'>
 * const projectUpdate: ProjectUpdate = { name: 'Updated Email' }
 * await supabase.from('projects').update(projectUpdate).eq('id', '123')
 */
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

/**
 * Enums Type Helper
 * 
 * Type helper to extract PostgreSQL enum types.
 * Ensures type safety when working with database enums.
 */
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

/**
 * Composite Types Helper
 * 
 * Type helper to extract PostgreSQL composite types.
 * Ensures type safety when working with database composite types.
 */
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

/**
 * Database Constants
 * 
 * Constants related to database schema
 * Useful for static references to enum values
 */
export const Constants = {
  public: {
    Enums: {},
  },
} as const
