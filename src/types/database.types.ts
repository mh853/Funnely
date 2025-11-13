/**
 * Database Types for MediSync
 * Auto-generated from Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'hospital_owner'
  | 'hospital_admin'
  | 'marketing_manager'
  | 'marketing_staff'
  | 'viewer'

export type AdPlatform = 'meta' | 'kakao' | 'google'

export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft'

export type BudgetType = 'daily' | 'lifetime'

export interface Database {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string
          name: string
          business_number: string
          address: string | null
          phone: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          business_number: string
          address?: string | null
          phone?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          business_number?: string
          address?: string | null
          phone?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          hospital_id: string
          email: string
          full_name: string
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          last_login: string | null
        }
        Insert: {
          id: string
          hospital_id: string
          email: string
          full_name: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          hospital_id?: string
          email?: string
          full_name?: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
      }
      ad_accounts: {
        Row: {
          id: string
          hospital_id: string
          platform: AdPlatform
          account_id: string
          account_name: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          is_active: boolean
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          platform: AdPlatform
          account_id: string
          account_name: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          is_active?: boolean
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          platform?: AdPlatform
          account_id?: string
          account_name?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          is_active?: boolean
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          ad_account_id: string
          platform_campaign_id: string
          name: string
          status: CampaignStatus
          objective: string | null
          budget: number | null
          budget_type: BudgetType | null
          start_date: string | null
          end_date: string | null
          targeting: Json | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ad_account_id: string
          platform_campaign_id: string
          name: string
          status?: CampaignStatus
          objective?: string | null
          budget?: number | null
          budget_type?: BudgetType | null
          start_date?: string | null
          end_date?: string | null
          targeting?: Json | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ad_account_id?: string
          platform_campaign_id?: string
          name?: string
          status?: CampaignStatus
          objective?: string | null
          budget?: number | null
          budget_type?: BudgetType | null
          start_date?: string | null
          end_date?: string | null
          targeting?: Json | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_metrics: {
        Row: {
          id: string
          campaign_id: string
          date: string
          impressions: number
          clicks: number
          conversions: number
          spend: number
          ctr: number | null
          cpc: number | null
          cpa: number | null
          roas: number | null
          reach: number | null
          frequency: number | null
          raw_data: Json | null
          synced_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          date: string
          impressions?: number
          clicks?: number
          conversions?: number
          spend?: number
          ctr?: number | null
          cpc?: number | null
          cpa?: number | null
          roas?: number | null
          reach?: number | null
          frequency?: number | null
          raw_data?: Json | null
          synced_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          date?: string
          impressions?: number
          clicks?: number
          conversions?: number
          spend?: number
          ctr?: number | null
          cpc?: number | null
          cpa?: number | null
          roas?: number | null
          reach?: number | null
          frequency?: number | null
          raw_data?: Json | null
          synced_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          hospital_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      saved_reports: {
        Row: {
          id: string
          hospital_id: string
          created_by: string
          name: string
          description: string | null
          config: Json
          schedule: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          created_by: string
          name: string
          description?: string | null
          config: Json
          schedule?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          created_by?: string
          name?: string
          description?: string | null
          config?: Json
          schedule?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      ad_platform: AdPlatform
      campaign_status: CampaignStatus
      budget_type: BudgetType
    }
  }
}
