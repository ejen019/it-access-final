// Ce fichier est normalement généré via : supabase gen types typescript --project-id <id>
// Ne pas modifier à la main — régénérer depuis le schéma Supabase à jour.
// Version manuelle provisoire basée sur schema.sql.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: 'sudo' | 'admin' | 'technicien' | 'entreprise';
          is_active: boolean;
          is_validated: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role: 'sudo' | 'admin' | 'technicien' | 'entreprise';
          is_active?: boolean;
          is_validated?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          role?: 'sudo' | 'admin' | 'technicien' | 'entreprise';
          is_active?: boolean;
          is_validated?: boolean;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          siret: string | null;
          address: string | null;
          validation_code: string;
          contract_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          siret?: string | null;
          address?: string | null;
          validation_code?: string;
          contract_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          siret?: string | null;
          address?: string | null;
          validation_code?: string;
          contract_id?: string | null;
          updated_at?: string;
        };
      };
      technicians: {
        Row: {
          id: string;
          profile_id: string;
          speciality: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          speciality?: string | null;
          created_at?: string;
        };
        Update: {
          speciality?: string | null;
        };
      };
      assignments: {
        Row: {
          id: string;
          technician_id: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          technician_id: string;
          company_id: string;
          created_at?: string;
        };
        Update: never;
      };
      contracts: {
        Row: {
          id: string;
          company_id: string;
          plan: 'starter' | 'pro' | 'enterprise';
          max_equipment: number;
          max_interventions_per_month: number;
          max_technicians: number;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          plan: 'starter' | 'pro' | 'enterprise';
          max_equipment: number;
          max_interventions_per_month: number;
          max_technicians: number;
          starts_at?: string;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          plan?: 'starter' | 'pro' | 'enterprise';
          max_equipment?: number;
          max_interventions_per_month?: number;
          max_technicians?: number;
          ends_at?: string | null;
          is_active?: boolean;
        };
      };
      equipment: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          serial_number: string | null;
          category: string | null;
          brand: string | null;
          model: string | null;
          status: 'actif' | 'en_panne' | 'en_maintenance' | 'retire';
          location: string | null;
          photos: string[];
          qr_code_url: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          serial_number?: string | null;
          category?: string | null;
          brand?: string | null;
          model?: string | null;
          status?: 'actif' | 'en_panne' | 'en_maintenance' | 'retire';
          location?: string | null;
          photos?: string[];
          qr_code_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          serial_number?: string | null;
          category?: string | null;
          brand?: string | null;
          model?: string | null;
          status?: 'actif' | 'en_panne' | 'en_maintenance' | 'retire';
          location?: string | null;
          photos?: string[];
          qr_code_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      equipment_documents: {
        Row: {
          id: string;
          equipment_id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      interventions: {
        Row: {
          id: string;
          company_id: string;
          equipment_ids: string[];
          technician_ids: string[];
          title: string;
          description: string | null;
          status: 'active' | 'en_cours' | 'en_attente_validation' | 'cloturee' | 'annulee';
          urgency: 'normale' | 'haute' | 'critique';
          report: string | null;
          media_urls: string[];
          signature_url: string | null;
          pdf_url: string | null;
          validation_code_used: string | null;
          started_at: string | null;
          closed_at: string | null;
          validated_at: string | null;
          cancelled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          equipment_ids?: string[];
          technician_ids?: string[];
          title: string;
          description?: string | null;
          status?: 'active' | 'en_cours' | 'en_attente_validation' | 'cloturee' | 'annulee';
          urgency?: 'normale' | 'haute' | 'critique';
          report?: string | null;
          media_urls?: string[];
          signature_url?: string | null;
          pdf_url?: string | null;
          validation_code_used?: string | null;
          started_at?: string | null;
          closed_at?: string | null;
          validated_at?: string | null;
          cancelled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: 'active' | 'en_cours' | 'en_attente_validation' | 'cloturee' | 'annulee';
          urgency?: 'normale' | 'haute' | 'critique';
          equipment_ids?: string[];
          technician_ids?: string[];
          report?: string | null;
          media_urls?: string[];
          signature_url?: string | null;
          pdf_url?: string | null;
          validation_code_used?: string | null;
          started_at?: string | null;
          closed_at?: string | null;
          validated_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
      };
      intervention_reopens: {
        Row: {
          id: string;
          intervention_id: string;
          reopened_by: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          intervention_id: string;
          reopened_by: string;
          reason: string;
          created_at?: string;
        };
        Update: never;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          reply_to_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          reply_to_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          redirect_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          redirect_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      write_audit_log: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string;
          p_details?: Json;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
