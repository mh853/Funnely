/**
 * Database Types for Funnely
 * supabase gen types typescript --linked --schema public 로 재생성 (2026-08-25)
 * 재생성 명령: npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
 * 파일 하단의 수동유지 타입 블록은 재생성 후에도 다시 이어붙여야 한다.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          access_token: string
          account_id: string
          account_name: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          platform: Database["public"]["Enums"]["ad_platform"]
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          account_name: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform: Database["public"]["Enums"]["ad_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          account_name?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ad_accounts_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean
          published_at: string | null
          target_audience: string
          target_companies: Json | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          target_audience?: string
          target_companies?: Json | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          target_audience?: string
          target_companies?: Json | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          company_id: string
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          platform: string
          updated_at: string | null
          validation_error: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          platform: string
          updated_at?: string | null
          validation_error?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          platform?: string
          updated_at?: string | null
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "api_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: unknown
          method: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "api_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          actions: Json
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_operation_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          entity_ids: string[]
          entity_type: string
          error_details: Json | null
          executed_by: string | null
          failed_count: number | null
          id: string
          operation: string
          parameters: Json
          started_at: string | null
          status: string
          success_count: number | null
          total_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          entity_ids: string[]
          entity_type: string
          error_details?: Json | null
          executed_by?: string | null
          failed_count?: number | null
          id?: string
          operation: string
          parameters?: Json
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_count: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          entity_ids?: string[]
          entity_type?: string
          error_details?: Json | null
          executed_by?: string | null
          failed_count?: number | null
          id?: string
          operation?: string
          parameters?: Json
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operation_logs_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          filters: Json | null
          id: string
          operation_type: string
          progress: number
          result: Json | null
          started_at: string | null
          status: string
          target_count: number
          target_entity: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          operation_type: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          target_count?: number
          target_entity: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          operation_type?: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          target_count?: number
          target_entity?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          assigned_to: string[]
          color: string | null
          counselor_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"]
          hospital_id: string
          id: string
          lead_id: string | null
          location: string | null
          reminder_minutes: number[] | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          assigned_to: string[]
          color?: string | null
          counselor_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"]
          hospital_id: string
          id?: string
          lead_id?: string | null
          location?: string | null
          reminder_minutes?: number[] | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          assigned_to?: string[]
          color?: string | null
          counselor_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          hospital_id?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          reminder_minutes?: number[] | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "calendar_events_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          raw_data: Json | null
          reach: number | null
          roas: number | null
          spend: number | null
          synced_at: string | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          ctr?: number | null
          date: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          synced_at?: string | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_account_id: string
          budget: number | null
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          objective: string | null
          platform_campaign_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeting: Json | null
          updated_at: string | null
        }
        Insert: {
          ad_account_id: string
          budget?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"] | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          objective?: string | null
          platform_campaign_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json | null
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string
          budget?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"] | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          objective?: string | null
          platform_campaign_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_records: {
        Row: {
          churn_date: string
          churn_type: string
          company_id: string
          created_at: string
          id: string
          ltv: number | null
          metadata: Json | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          churn_date: string
          churn_type: string
          company_id: string
          created_at?: string
          id?: string
          ltv?: number | null
          metadata?: Json | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          churn_date?: string
          churn_type?: string
          company_id?: string
          created_at?: string
          id?: string
          ltv?: number | null
          metadata?: Json | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "churn_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_number: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          notification_emails: string[] | null
          phone: string | null
          settings: Json | null
          short_id: string | null
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          address?: string | null
          business_number: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notification_emails?: string[] | null
          phone?: string | null
          settings?: Json | null
          short_id?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          address?: string | null
          business_number?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notification_emails?: string[] | null
          phone?: string | null
          settings?: Json | null
          short_id?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      company_activity_logs: {
        Row: {
          activity_description: string | null
          activity_type: string
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_attribution: {
        Row: {
          company_id: string
          created_at: string | null
          first_fbclid: string | null
          first_gbraid: string | null
          first_gclid: string | null
          first_landing_page: string | null
          first_msclkid: string | null
          first_referrer: string | null
          first_touch_at: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_medium: string | null
          first_utm_source: string | null
          first_utm_term: string | null
          first_wbraid: string | null
          id: string
          last_fbclid: string | null
          last_gbraid: string | null
          last_gclid: string | null
          last_msclkid: string | null
          last_touch_at: string | null
          last_utm_campaign: string | null
          last_utm_content: string | null
          last_utm_medium: string | null
          last_utm_source: string | null
          last_utm_term: string | null
          last_wbraid: string | null
          signup_date: string
          signup_plan: string | null
          trial: boolean
        }
        Insert: {
          company_id: string
          created_at?: string | null
          first_fbclid?: string | null
          first_gbraid?: string | null
          first_gclid?: string | null
          first_landing_page?: string | null
          first_msclkid?: string | null
          first_referrer?: string | null
          first_touch_at?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          first_wbraid?: string | null
          id?: string
          last_fbclid?: string | null
          last_gbraid?: string | null
          last_gclid?: string | null
          last_msclkid?: string | null
          last_touch_at?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          last_wbraid?: string | null
          signup_date?: string
          signup_plan?: string | null
          trial?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string | null
          first_fbclid?: string | null
          first_gbraid?: string | null
          first_gclid?: string | null
          first_landing_page?: string | null
          first_msclkid?: string | null
          first_referrer?: string | null
          first_touch_at?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          first_wbraid?: string | null
          id?: string
          last_fbclid?: string | null
          last_gbraid?: string | null
          last_gclid?: string | null
          last_msclkid?: string | null
          last_touch_at?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          last_wbraid?: string | null
          signup_date?: string
          signup_plan?: string | null
          trial?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_attribution_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_attribution_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_custom_domains: {
        Row: {
          company_id: string
          created_at: string | null
          domain: string
          id: string
          is_company_default: boolean | null
          last_verification_attempt_at: string | null
          ssl_checked_at: string | null
          ssl_status: string | null
          updated_at: string | null
          vercel_config_type: string | null
          vercel_registered: boolean | null
          vercel_registered_at: string | null
          verification_error: string | null
          verification_status: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          domain: string
          id?: string
          is_company_default?: boolean | null
          last_verification_attempt_at?: string | null
          ssl_checked_at?: string | null
          ssl_status?: string | null
          updated_at?: string | null
          vercel_config_type?: string | null
          vercel_registered?: boolean | null
          vercel_registered_at?: string | null
          verification_error?: string | null
          verification_status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_company_default?: boolean | null
          last_verification_attempt_at?: string | null
          ssl_checked_at?: string | null
          ssl_status?: string | null
          updated_at?: string | null
          vercel_config_type?: string | null
          vercel_registered?: boolean | null
          vercel_registered_at?: string | null
          verification_error?: string | null
          verification_status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_custom_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_custom_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string | null
          department: string | null
          email: string | null
          expires_at: string
          id: string
          invitation_code: string
          invited_by: string
          role: Database["public"]["Enums"]["simple_user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          expires_at: string
          id?: string
          invitation_code: string
          invited_by: string
          role?: Database["public"]["Enums"]["simple_user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          invitation_code?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["simple_user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscription_price_locks: {
        Row: {
          first_locked_at: string
          id: string
          plan_id: string
          price_monthly: number
          price_yearly: number
          subscription_id: string
        }
        Insert: {
          first_locked_at?: string
          id?: string
          plan_id: string
          price_monthly: number
          price_yearly: number
          subscription_id: string
        }
        Update: {
          first_locked_at?: string
          id?: string
          plan_id?: string
          price_monthly?: number
          price_yearly?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscription_price_locks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscription_price_locks_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          billing_key: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          card_info: Json | null
          company_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_key: string | null
          grace_period_end: string | null
          has_used_trial: boolean
          id: string
          locked_plan_id: string | null
          locked_price_monthly: number | null
          locked_price_yearly: number | null
          pending_billing_cycle: string | null
          pending_plan_id: string | null
          plan_id: string
          status: string
          trial_end: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle: string
          billing_key?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          card_info?: Json | null
          company_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_key?: string | null
          grace_period_end?: string | null
          has_used_trial?: boolean
          id?: string
          locked_plan_id?: string | null
          locked_price_monthly?: number | null
          locked_price_yearly?: number | null
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          plan_id: string
          status: string
          trial_end?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          billing_key?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          card_info?: Json | null
          company_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_key?: string | null
          grace_period_end?: string | null
          has_used_trial?: boolean
          id?: string
          locked_plan_id?: string | null
          locked_price_monthly?: number | null
          locked_price_yearly?: number | null
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          plan_id?: string
          status?: string
          trial_end?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_locked_plan_id_fkey"
            columns: ["locked_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_health_scores: {
        Row: {
          calculated_at: string
          company_id: string
          created_at: string
          id: string
          metrics: Json
          risk_level: string
          score: number
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          company_id: string
          created_at?: string
          id?: string
          metrics?: Json
          risk_level: string
          score: number
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          company_id?: string
          created_at?: string
          id?: string
          metrics?: Json
          risk_level?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_health_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_health_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body_html: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status: string
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          error_type: string | null
          id: string
          ip_address: unknown
          message: string
          metadata: Json | null
          request_method: string | null
          request_url: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack_trace: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: unknown
          message: string
          metadata?: Json | null
          request_method?: string | null
          request_url?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source: string
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: unknown
          message?: string
          metadata?: Json | null
          request_method?: string | null
          request_url?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "error_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_collection_pages: {
        Row: {
          collect_fields: Json
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          redirect_url: string | null
          slug: string
          submissions_count: number | null
          success_message: string | null
          theme: Json | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          collect_fields?: Json
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          redirect_url?: string | null
          slug: string
          submissions_count?: number | null
          success_message?: string | null
          theme?: Json | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          collect_fields?: Json
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          redirect_url?: string | null
          slug?: string
          submissions_count?: number | null
          success_message?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_collection_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "external_collection_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_tracking: {
        Row: {
          company_id: string
          created_at: string
          feature_name: string
          first_used_at: string
          id: string
          last_used_at: string
          metadata: Json | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          feature_name: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          metadata?: Json | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          feature_name?: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          metadata?: Json | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "feature_usage_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          company_id: string
          counter_current: number | null
          counter_limit: number | null
          created_at: string | null
          description: string | null
          enable_counter: boolean | null
          enable_timer: boolean | null
          fields: Json
          id: string
          is_active: boolean | null
          name: string
          style: Json | null
          success_message: string | null
          timer_deadline: string | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          company_id: string
          counter_current?: number | null
          counter_limit?: number | null
          created_at?: string | null
          description?: string | null
          enable_counter?: boolean | null
          enable_timer?: boolean | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name: string
          style?: Json | null
          success_message?: string | null
          timer_deadline?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          company_id?: string
          counter_current?: number | null
          counter_limit?: number | null
          created_at?: string | null
          description?: string | null
          enable_counter?: boolean | null
          enable_timer?: boolean | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          style?: Json | null
          success_message?: string | null
          timer_deadline?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "form_templates_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          company_id: string | null
          data: Json
          generated_at: string | null
          generated_by: string | null
          id: string
          name: string
          period_end: string
          period_start: string
          template_id: string | null
        }
        Insert: {
          company_id?: string | null
          data?: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          name: string
          period_end: string
          period_start: string
          template_id?: string | null
        }
        Update: {
          company_id?: string | null
          data?: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          name?: string
          period_end?: string
          period_start?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_opportunities: {
        Row: {
          company_id: string
          confidence_score: number
          contacted_at: string | null
          created_at: string
          current_plan: string
          detected_at: string
          estimated_additional_mrr: number | null
          id: string
          notes: string | null
          opportunity_type: string
          potential_lost_mrr: number | null
          recommended_plan: string | null
          resolved_at: string | null
          signals: Json
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          confidence_score: number
          contacted_at?: string | null
          created_at?: string
          current_plan: string
          detected_at?: string
          estimated_additional_mrr?: number | null
          id?: string
          notes?: string | null
          opportunity_type: string
          potential_lost_mrr?: number | null
          recommended_plan?: string | null
          resolved_at?: string | null
          signals?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          confidence_score?: number
          contacted_at?: string | null
          created_at?: string
          current_plan?: string
          detected_at?: string
          estimated_additional_mrr?: number | null
          id?: string
          notes?: string | null
          opportunity_type?: string
          potential_lost_mrr?: number | null
          recommended_plan?: string | null
          resolved_at?: string | null
          signals?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "growth_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_messages: {
        Row: {
          action_label: string | null
          action_url: string | null
          company_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          metadata: Json | null
          read_at: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_app_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "in_app_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json | null
          paid_at: string | null
          payment_id: string | null
          status: string
          subscription_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json | null
          paid_at?: string | null
          payment_id?: string | null
          status: string
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json | null
          paid_at?: string | null
          payment_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_analytics: {
        Row: {
          conversion_rate: number | null
          created_at: string | null
          date: string
          desktop_views: number | null
          form_submissions: number | null
          id: string
          landing_page_id: string
          mobile_views: number | null
          page_views: number | null
          tablet_views: number | null
          unique_visitors: number | null
          utm_breakdown: Json | null
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          desktop_views?: number | null
          form_submissions?: number | null
          id?: string
          landing_page_id: string
          mobile_views?: number | null
          page_views?: number | null
          tablet_views?: number | null
          unique_visitors?: number | null
          utm_breakdown?: Json | null
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          desktop_views?: number | null
          form_submissions?: number | null
          id?: string
          landing_page_id?: string
          mobile_views?: number | null
          page_views?: number | null
          tablet_views?: number | null
          unique_visitors?: number | null
          utm_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_analytics_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          call_button_color: string | null
          call_button_enabled: boolean | null
          call_button_phone: string | null
          call_button_sticky_position: string | null
          collect_data: boolean | null
          collect_fields: Json | null
          collection_mode: string | null
          company_id: string
          completion_bg_color: string | null
          completion_bg_image: string | null
          completion_info_message: string | null
          created_at: string | null
          created_by: string | null
          cta_color: string | null
          cta_enabled: boolean | null
          cta_sticky_position: string | null
          cta_text: string | null
          custom_domain_id: string | null
          description: string | null
          description_enabled: boolean | null
          external_form_fields: Json | null
          external_page_params: Json | null
          external_page_slug: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          marketing_content: string | null
          meta_description: string | null
          meta_image: string | null
          meta_title: string | null
          privacy_content: string | null
          published_at: string | null
          realtime_count: number | null
          realtime_enabled: boolean | null
          realtime_speed: number | null
          realtime_template: string | null
          require_marketing_consent: boolean | null
          require_privacy_consent: boolean | null
          sections: Json | null
          slug: string
          status: string
          submissions_count: number | null
          success_message: string | null
          template_id: string
          theme: Json | null
          timer_auto_update: boolean | null
          timer_auto_update_days: number | null
          timer_color: string | null
          timer_deadline: string | null
          timer_enabled: boolean | null
          timer_sticky_position: string | null
          timer_text: string | null
          title: string
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          views_count: number | null
        }
        Insert: {
          call_button_color?: string | null
          call_button_enabled?: boolean | null
          call_button_phone?: string | null
          call_button_sticky_position?: string | null
          collect_data?: boolean | null
          collect_fields?: Json | null
          collection_mode?: string | null
          company_id: string
          completion_bg_color?: string | null
          completion_bg_image?: string | null
          completion_info_message?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_color?: string | null
          cta_enabled?: boolean | null
          cta_sticky_position?: string | null
          cta_text?: string | null
          custom_domain_id?: string | null
          description?: string | null
          description_enabled?: boolean | null
          external_form_fields?: Json | null
          external_page_params?: Json | null
          external_page_slug?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          marketing_content?: string | null
          meta_description?: string | null
          meta_image?: string | null
          meta_title?: string | null
          privacy_content?: string | null
          published_at?: string | null
          realtime_count?: number | null
          realtime_enabled?: boolean | null
          realtime_speed?: number | null
          realtime_template?: string | null
          require_marketing_consent?: boolean | null
          require_privacy_consent?: boolean | null
          sections?: Json | null
          slug: string
          status?: string
          submissions_count?: number | null
          success_message?: string | null
          template_id?: string
          theme?: Json | null
          timer_auto_update?: boolean | null
          timer_auto_update_days?: number | null
          timer_color?: string | null
          timer_deadline?: string | null
          timer_enabled?: boolean | null
          timer_sticky_position?: string | null
          timer_text?: string | null
          title: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          views_count?: number | null
        }
        Update: {
          call_button_color?: string | null
          call_button_enabled?: boolean | null
          call_button_phone?: string | null
          call_button_sticky_position?: string | null
          collect_data?: boolean | null
          collect_fields?: Json | null
          collection_mode?: string | null
          company_id?: string
          completion_bg_color?: string | null
          completion_bg_image?: string | null
          completion_info_message?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_color?: string | null
          cta_enabled?: boolean | null
          cta_sticky_position?: string | null
          cta_text?: string | null
          custom_domain_id?: string | null
          description?: string | null
          description_enabled?: boolean | null
          external_form_fields?: Json | null
          external_page_params?: Json | null
          external_page_slug?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          marketing_content?: string | null
          meta_description?: string | null
          meta_image?: string | null
          meta_title?: string | null
          privacy_content?: string | null
          published_at?: string | null
          realtime_count?: number | null
          realtime_enabled?: boolean | null
          realtime_speed?: number | null
          realtime_template?: string | null
          require_marketing_consent?: boolean | null
          require_privacy_consent?: boolean | null
          sections?: Json | null
          slug?: string
          status?: string
          submissions_count?: number | null
          success_message?: string | null
          template_id?: string
          theme?: Json | null
          timer_auto_update?: boolean | null
          timer_auto_update_days?: number | null
          timer_color?: string | null
          timer_deadline?: string | null
          timer_enabled?: boolean | null
          timer_sticky_position?: string | null
          timer_text?: string | null
          title?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_custom_domain_id_fkey"
            columns: ["custom_domain_id"]
            isOneToOne: false
            referencedRelation: "company_custom_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "landing_pages_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_deletion_logs: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_by: string | null
          deleted_count: number
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_count: number
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_count?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_deletion_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_deletion_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deletion_logs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string | null
          id: string
          lead_id: string
          status_changed_from: string | null
          status_changed_to: string | null
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
          status_changed_from?: string | null
          status_changed_to?: string | null
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          status_changed_from?: string | null
          status_changed_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notification_logs: {
        Row: {
          company_id: string
          email_provider: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          notification_queue_id: string | null
          recipient_email: string
          sent_at: string | null
          success: boolean
        }
        Insert: {
          company_id: string
          email_provider?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          notification_queue_id?: string | null
          recipient_email: string
          sent_at?: string | null
          success: boolean
        }
        Update: {
          company_id?: string
          email_provider?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          notification_queue_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notification_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notification_logs_notification_queue_id_fkey"
            columns: ["notification_queue_id"]
            isOneToOne: false
            referencedRelation: "lead_notification_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notification_queue: {
        Row: {
          company_id: string
          created_at: string | null
          error: string | null
          id: string
          lead_data: Json
          lead_id: string
          recipient_emails: string[]
          retry_count: number | null
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error?: string | null
          id?: string
          lead_data: Json
          lead_id: string
          recipient_emails: string[]
          retry_count?: number | null
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error?: string | null
          id?: string
          lead_data?: Json
          lead_id?: string
          recipient_emails?: string[]
          retry_count?: number | null
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notification_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_notification_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notification_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          payment_date: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_logs: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string | null
          field_type: string | null
          id: string
          lead_id: string
          new_status: string
          new_value: string | null
          notes: string | null
          previous_status: string | null
          previous_value: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string | null
          field_type?: string | null
          id?: string
          lead_id: string
          new_status: string
          new_value?: string | null
          notes?: string | null
          previous_status?: string | null
          previous_value?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string | null
          field_type?: string | null
          id?: string
          lead_id?: string
          new_status?: string
          new_value?: string | null
          notes?: string | null
          previous_status?: string | null
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_status_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_statuses: {
        Row: {
          category: string
          code: string
          color: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lead_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          birth_date: string | null
          call_assigned_to: string | null
          collection_source: string | null
          company_id: string
          completed_at: string | null
          consented_at: string | null
          consultation_items: string[] | null
          consultation_type: string | null
          contract_completed_at: string | null
          counselor_assigned_to: string | null
          created_at: string | null
          custom_field_1: string | null
          custom_field_2: string | null
          custom_field_3: string | null
          custom_field_4: string | null
          custom_field_5: string | null
          custom_fields: Json | null
          detailed_message: string | null
          device_type: string | null
          email: string | null
          external_page_id: string | null
          first_contact_at: string | null
          gender: string | null
          id: string
          ip_address: unknown
          landing_page_id: string | null
          last_contact_at: string | null
          marketing_consent_agreed: boolean | null
          message: string | null
          name: string
          notes: string | null
          payment_amount: number | null
          phone: string
          phone_hash: string
          preferred_date: string | null
          preferred_time: string | null
          previous_contract_completed_at: string | null
          priority: Database["public"]["Enums"]["lead_priority"] | null
          privacy_consent_agreed: boolean | null
          referrer: string | null
          referrer_company_id: string | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          call_assigned_to?: string | null
          collection_source?: string | null
          company_id: string
          completed_at?: string | null
          consented_at?: string | null
          consultation_items?: string[] | null
          consultation_type?: string | null
          contract_completed_at?: string | null
          counselor_assigned_to?: string | null
          created_at?: string | null
          custom_field_1?: string | null
          custom_field_2?: string | null
          custom_field_3?: string | null
          custom_field_4?: string | null
          custom_field_5?: string | null
          custom_fields?: Json | null
          detailed_message?: string | null
          device_type?: string | null
          email?: string | null
          external_page_id?: string | null
          first_contact_at?: string | null
          gender?: string | null
          id?: string
          ip_address?: unknown
          landing_page_id?: string | null
          last_contact_at?: string | null
          marketing_consent_agreed?: boolean | null
          message?: string | null
          name: string
          notes?: string | null
          payment_amount?: number | null
          phone: string
          phone_hash: string
          preferred_date?: string | null
          preferred_time?: string | null
          previous_contract_completed_at?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"] | null
          privacy_consent_agreed?: boolean | null
          referrer?: string | null
          referrer_company_id?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          call_assigned_to?: string | null
          collection_source?: string | null
          company_id?: string
          completed_at?: string | null
          consented_at?: string | null
          consultation_items?: string[] | null
          consultation_type?: string | null
          contract_completed_at?: string | null
          counselor_assigned_to?: string | null
          created_at?: string | null
          custom_field_1?: string | null
          custom_field_2?: string | null
          custom_field_3?: string | null
          custom_field_4?: string | null
          custom_field_5?: string | null
          custom_fields?: Json | null
          detailed_message?: string | null
          device_type?: string | null
          email?: string | null
          external_page_id?: string | null
          first_contact_at?: string | null
          gender?: string | null
          id?: string
          ip_address?: unknown
          landing_page_id?: string | null
          last_contact_at?: string | null
          marketing_consent_agreed?: boolean | null
          message?: string | null
          name?: string
          notes?: string | null
          payment_amount?: number | null
          phone?: string
          phone_hash?: string
          preferred_date?: string | null
          preferred_time?: string | null
          previous_contract_completed_at?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"] | null
          privacy_consent_agreed?: boolean | null
          referrer?: string | null
          referrer_company_id?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_call_assigned_to_fkey"
            columns: ["call_assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_counselor_assigned_to_fkey"
            columns: ["counselor_assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_external_page_id_fkey"
            columns: ["external_page_id"]
            isOneToOne: false
            referencedRelation: "external_collection_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referrer_company_id_fkey"
            columns: ["referrer_company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_referrer_company_id_fkey"
            columns: ["referrer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sent_logs: {
        Row: {
          created_at: string | null
          id: string
          notification_type: string
          period_end: string
          sent_at: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_type: string
          period_end: string
          sent_at?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_type?: string
          period_end?: string
          sent_at?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_sent_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          channel: string
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          campaign_id: string | null
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_steps: Json
          completion_percentage: number
          created_at: string
          current_step: string
          id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_steps?: Json
          completion_percentage?: number
          created_at?: string
          current_step: string
          id?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_steps?: Json
          completion_percentage?: number
          created_at?: string
          current_step?: string
          id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "onboarding_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lead_id: string
          new_amount: number | null
          new_notes: string | null
          new_payment_date: string | null
          old_amount: number | null
          old_notes: string | null
          old_payment_date: string | null
          payment_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id: string
          new_amount?: number | null
          new_notes?: string | null
          new_payment_date?: string | null
          old_amount?: number | null
          old_notes?: string | null
          old_payment_date?: string | null
          payment_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          new_amount?: number | null
          new_notes?: string | null
          new_payment_date?: string | null
          old_amount?: number | null
          old_notes?: string | null
          old_payment_date?: string | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "lead_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          recipient_email: string
          recipient_name: string | null
          retry_count: number
          sent_at: string | null
          status: string
          subject: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_notifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          cancel_reason: string | null
          canceled_at: string | null
          company_id: string
          created_at: string | null
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          order_id: string
          payment_key: string | null
          payment_method: string
          payment_method_detail: Json | null
          plan_id: string | null
          previous_plan_id: string | null
          receipt_data: Json | null
          receipt_url: string | null
          requested_at: string | null
          status: string
          subscription_id: string | null
          tax_invoice_data: Json | null
          tax_invoice_issued_at: string | null
          tax_invoice_requested: boolean | null
          total_amount: number
          updated_at: string | null
          vat: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          company_id: string
          created_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          order_id: string
          payment_key?: string | null
          payment_method: string
          payment_method_detail?: Json | null
          plan_id?: string | null
          previous_plan_id?: string | null
          receipt_data?: Json | null
          receipt_url?: string | null
          requested_at?: string | null
          status: string
          subscription_id?: string | null
          tax_invoice_data?: Json | null
          tax_invoice_issued_at?: string | null
          tax_invoice_requested?: boolean | null
          total_amount: number
          updated_at?: string | null
          vat?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          company_id?: string
          created_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          order_id?: string
          payment_key?: string | null
          payment_method?: string
          payment_method_detail?: Json | null
          plan_id?: string | null
          previous_plan_id?: string | null
          receipt_data?: Json | null
          receipt_url?: string | null
          requested_at?: string | null
          status?: string
          subscription_id?: string | null
          tax_invoice_data?: Json | null
          tax_invoice_issued_at?: string | null
          tax_invoice_requested?: boolean | null
          total_amount?: number
          updated_at?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          provider_payment_id: string | null
          refunded_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          current_value: number | null
          id: string
          metric: string
          name: string
          period_end: string
          period_start: string
          status: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          id?: string
          metric: string
          name: string
          period_end: string
          period_start: string
          status?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          id?: string
          metric?: string
          name?: string
          period_end?: string
          period_start?: string
          status?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "performance_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          measured_at: string
          metric_name: string
          tags: Json | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          measured_at: string
          metric_name: string
          tags?: Json | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          measured_at?: string
          metric_name?: string
          tags?: Json | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      phone_blacklist: {
        Row: {
          blocked_at: string | null
          blocked_by_user_id: string | null
          company_id: string
          created_at: string | null
          id: string
          phone_number: string
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by_user_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          phone_number: string
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by_user_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          phone_number?: string
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_blacklist_blocked_by_user_id_fkey"
            columns: ["blocked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_blacklist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phone_blacklist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_policies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          marketing_consent_content: string
          marketing_consent_title: string | null
          privacy_consent_content: string
          privacy_consent_title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          marketing_consent_content?: string
          marketing_consent_title?: string | null
          privacy_consent_content?: string
          privacy_consent_title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          marketing_consent_content?: string
          marketing_consent_title?: string | null
          privacy_consent_content?: string
          privacy_consent_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "privacy_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_data: Json | null
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          requested_data?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_data?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "privacy_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          inquiry_type: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_type: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_date_logs: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string | null
          id: string
          lead_id: string
          new_date: string
          notes: string | null
          previous_date: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          lead_id: string
          new_date: string
          notes?: string | null
          previous_date?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          new_date?: string
          notes?: string | null
          previous_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_date_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_date_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reservation_date_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_date_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_metrics: {
        Row: {
          arr: number
          company_id: string
          created_at: string
          id: string
          metrics: Json | null
          mrr: number
          period_end: string
          period_start: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          arr?: number
          company_id: string
          created_at?: string
          id?: string
          metrics?: Json | null
          mrr?: number
          period_end: string
          period_start: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          arr?: number
          company_id?: string
          created_at?: string
          id?: string
          metrics?: Json | null
          mrr?: number
          period_end?: string
          period_start?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "revenue_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          company_id: string
          config: Json
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          schedule: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          config: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schedule?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schedule?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saved_reports_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_sync_configs: {
        Row: {
          column_mapping: Json | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          landing_page_id: string | null
          last_synced_at: string | null
          sheet_name: string | null
          spreadsheet_id: string
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          column_mapping?: Json | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          landing_page_id?: string | null
          last_synced_at?: string | null
          sheet_name?: string | null
          spreadsheet_id: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          column_mapping?: Json | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          landing_page_id?: string | null
          last_synced_at?: string | null
          sheet_name?: string | null
          spreadsheet_id?: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sync_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sheet_sync_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_sync_configs_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_sync_logs: {
        Row: {
          company_id: string
          created_at: string | null
          duplicates_skipped: number | null
          error_message: string | null
          id: string
          imported_count: number | null
          sheet_name: string | null
          spreadsheet_id: string
          total_rows: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          duplicates_skipped?: number | null
          error_message?: string | null
          id?: string
          imported_count?: number | null
          sheet_name?: string | null
          spreadsheet_id: string
          total_rows?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          duplicates_skipped?: number | null
          error_message?: string | null
          id?: string
          imported_count?: number | null
          sheet_name?: string | null
          spreadsheet_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sheet_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_campaigns: number | null
          max_landing_pages: number | null
          max_leads: number | null
          max_users: number | null
          name: string
          plan_type: string
          price_monthly: number
          price_yearly: number | null
          sort_order: number | null
          tier: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_campaigns?: number | null
          max_landing_pages?: number | null
          max_leads?: number | null
          max_users?: number | null
          name: string
          plan_type?: string
          price_monthly: number
          price_yearly?: number | null
          sort_order?: number | null
          tier?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_campaigns?: number | null
          max_landing_pages?: number | null
          max_leads?: number | null
          max_users?: number | null
          name?: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          tier?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_replies: {
        Row: {
          created_at: string | null
          id: string
          reply_by_user_id: string
          reply_message: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply_by_user_id: string
          reply_message: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reply_by_user_id?: string
          reply_message?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_reply_by_user_id_fkey"
            columns: ["reply_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_status_history: {
        Row: {
          changed_by_user_id: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          ticket_id: string
        }
        Insert: {
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          ticket_id: string
        }
        Update: {
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          attachments: Json | null
          category: string | null
          closed_at: string | null
          company_id: string
          created_at: string | null
          created_by_user_id: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          attachments?: Json | null
          category?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          attachments?: Json | null
          category?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          checked_at: string | null
          cpu_usage: number | null
          created_at: string | null
          error_rate: number | null
          id: string
          memory_usage: number | null
          metadata: Json | null
          response_time_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          cpu_usage?: number | null
          created_at?: string | null
          error_rate?: number | null
          id?: string
          memory_usage?: number | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string | null
          cpu_usage?: number | null
          created_at?: string | null
          error_rate?: number | null
          id?: string
          memory_usage?: number | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          company_id: string
          created_at: string | null
          facebook_pixel_id: string | null
          google_ads_id: string | null
          google_analytics_id: string | null
          id: string
          is_active: boolean | null
          kakao_pixel_id: string | null
          karrot_pixel_id: string | null
          naver_pixel_id: string | null
          tiktok_pixel_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          facebook_pixel_id?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          kakao_pixel_id?: string | null
          karrot_pixel_id?: string | null
          naver_pixel_id?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          facebook_pixel_id?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          kakao_pixel_id?: string | null
          karrot_pixel_id?: string | null
          naver_pixel_id?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_pixels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tracking_pixels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          quantity: number
          resource_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          quantity: number
          resource_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          quantity?: number
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          active_days_count: number | null
          api_calls_count: number | null
          company_id: string
          created_at: string
          id: string
          last_activity_at: string | null
          metric_month: string
          total_landing_pages: number | null
          total_leads: number | null
          total_users: number | null
        }
        Insert: {
          active_days_count?: number | null
          api_calls_count?: number | null
          company_id: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          metric_month: string
          total_landing_pages?: number | null
          total_leads?: number | null
          total_users?: number | null
        }
        Update: {
          active_days_count?: number | null
          api_calls_count?: number | null
          company_id?: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          metric_month?: string
          total_landing_pages?: number | null
          total_leads?: number | null
          total_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "usage_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string | null
          deactivated_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          is_super_admin: boolean | null
          last_login: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          short_id: string | null
          simple_role: Database["public"]["Enums"]["simple_user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string | null
          deactivated_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          short_id?: string | null
          simple_role?: Database["public"]["Enums"]["simple_user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string | null
          deactivated_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          short_id?: string | null
          simple_role?: Database["public"]["Enums"]["simple_user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "users_hospital_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_logs: {
        Row: {
          action_config: Json
          action_index: number
          action_type: string
          completed_at: string | null
          error_message: string | null
          execution_id: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          action_config: Json
          action_index: number
          action_type: string
          completed_at?: string | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status: string
        }
        Update: {
          action_config?: Json
          action_index?: number
          action_type?: string
          completed_at?: string | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          execution_result: Json | null
          id: string
          started_at: string | null
          status: string
          trigger_data: Json | null
          triggered_by: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          started_at?: string | null
          status: string
          trigger_data?: Json | null
          triggered_by: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          triggered_by?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_company_stats: {
        Row: {
          active_users: number | null
          active_users_30d: number | null
          company_id: string | null
          company_name: string | null
          conversion_rate: number | null
          is_active: boolean | null
          joined_at: string | null
          last_lead_created: string | null
          last_user_activity: string | null
          leads_30d: number | null
          leads_7d: number | null
          new_tickets: number | null
          open_tickets: number | null
          published_landing_pages: number | null
          stats_updated_at: string | null
          total_landing_pages: number | null
          total_leads: number | null
          total_page_views: number | null
          total_submissions: number | null
          total_users: number | null
          urgent_tickets: number | null
        }
        Relationships: []
      }
      unassigned_leads_stats: {
        Row: {
          company_id: string | null
          newest_lead: string | null
          oldest_lead: string | null
          unassigned_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_company_note: {
        Args: { p_company_id: string; p_created_by: string; p_note: string }
        Returns: undefined
      }
      am_i_active_in_active_company: { Args: never; Returns: boolean }
      am_i_admin_or_legacy_owner: { Args: never; Returns: boolean }
      am_i_super_admin: { Args: never; Returns: boolean }
      assign_company_cs_manager: {
        Args: { p_company_id: string; p_cs_manager_id: string }
        Returns: undefined
      }
      auto_assign_call_staff: {
        Args: { p_company_id: string }
        Returns: string
      }
      auto_assign_lead: {
        Args: { p_hospital_id: string; p_lead_id: string }
        Returns: string
      }
      bulk_add_company_tags: {
        Args: { p_company_id: string; p_tags: string[] }
        Returns: undefined
      }
      bulk_add_lead_tags: {
        Args: { p_lead_id: string; p_tags: string[] }
        Returns: undefined
      }
      bulk_remove_company_tags: {
        Args: { p_company_id: string; p_tags: string[] }
        Returns: undefined
      }
      bulk_remove_lead_tags: {
        Args: { p_lead_id: string; p_tags: string[] }
        Returns: undefined
      }
      cleanup_expired_invitations: { Args: never; Returns: number }
      generate_invitation_code: { Args: never; Returns: string }
      generate_short_id: { Args: { length?: number }; Returns: string }
      get_company_name: {
        Args: { ticket: Database["public"]["Tables"]["support_tickets"]["Row"] }
        Returns: string
      }
      get_my_company_id: { Args: never; Returns: string }
      increment_external_page_submissions: {
        Args: { page_id: string }
        Returns: undefined
      }
      increment_external_page_views: {
        Args: { page_id: string }
        Returns: undefined
      }
      increment_landing_page_analytics: {
        Args: {
          p_date: string
          p_device_type: string
          p_landing_page_id: string
        }
        Returns: undefined
      }
      increment_landing_page_submissions: {
        Args: { page_id: string }
        Returns: undefined
      }
      increment_landing_page_views: {
        Args: { page_id: string }
        Returns: undefined
      }
      insert_default_lead_statuses: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      is_super_admin_via_role_assignment: { Args: never; Returns: boolean }
    }
    Enums: {
      ad_platform: "meta" | "kakao" | "google"
      budget_type: "daily" | "lifetime"
      campaign_status: "active" | "paused" | "ended" | "draft"
      event_type: "consultation" | "callback" | "meeting" | "task" | "reminder"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      lead_priority: "low" | "medium" | "high" | "urgent"
      lead_status:
        | "new"
        | "assigned"
        | "contacting"
        | "consulting"
        | "completed"
        | "on_hold"
        | "cancelled"
        | "pending"
        | "rejected"
        | "contacted"
        | "converted"
        | "contract_completed"
        | "needs_followup"
        | "other"
      simple_user_role: "admin" | "manager" | "user"
      user_role:
        | "hospital_owner"
        | "hospital_admin"
        | "marketing_manager"
        | "marketing_staff"
        | "viewer"
        | "company_owner"
        | "company_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ad_platform: ["meta", "kakao", "google"],
      budget_type: ["daily", "lifetime"],
      campaign_status: ["active", "paused", "ended", "draft"],
      event_type: ["consultation", "callback", "meeting", "task", "reminder"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      lead_priority: ["low", "medium", "high", "urgent"],
      lead_status: [
        "new",
        "assigned",
        "contacting",
        "consulting",
        "completed",
        "on_hold",
        "cancelled",
        "pending",
        "rejected",
        "contacted",
        "converted",
        "contract_completed",
        "needs_followup",
        "other",
      ],
      simple_user_role: ["admin", "manager", "user"],
      user_role: [
        "hospital_owner",
        "hospital_admin",
        "marketing_manager",
        "marketing_staff",
        "viewer",
        "company_owner",
        "company_admin",
      ],
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────
// 아래는 수동 유지 타입. `supabase gen types`는 jsonb 컬럼(api_credentials.
// credentials)의 실제 모양을 알 수 없으므로 재생성해도 지워지지 않는다.
// 다음에 다시 생성할 때도 이 블록은 그대로 파일 끝에 이어붙이면 된다.
// ─────────────────────────────────────────────────────────────────────────

export type ApiPlatform = 'meta' | 'kakao' | 'google'

export interface MetaCredentials {
  app_id: string
  app_secret: string
}

export interface KakaoCredentials {
  rest_api_key: string
  javascript_key: string
}

export interface GoogleCredentials {
  client_id: string
  client_secret: string
  developer_token: string
}

export type PlatformCredentials = MetaCredentials | KakaoCredentials | GoogleCredentials
