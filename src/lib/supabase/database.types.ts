// =============================================================
// Types Supabase générés automatiquement — ne pas modifier manuellement
// Regénérer via : supabase gen types typescript --project-id pynyvznfdajpzbmavpqr
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          company_id: string
          id: string
          technician_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          company_id: string
          id?: string
          technician_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          company_id?: string
          id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contract_id: string | null
          created_at: string
          id: string
          logo_url: string | null
          phone: string | null
          sector: string | null
          updated_at: string
          user_id: string
          validation_code: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contract_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
          user_id: string
          validation_code?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contract_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
          user_id?: string
          validation_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string | null
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          max_equipment: number
          max_technicians: number
          plan: string
          price_fcfa: number
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          max_equipment: number
          max_technicians: number
          plan: string
          price_fcfa?: number
          start_date?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          max_equipment?: number
          max_technicians?: number
          plan?: string
          price_fcfa?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contracts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          photos: string[]
          purchase_date: string | null
          qr_code: string
          serial_number: string | null
          status: string
          updated_at: string
          warranty_end: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photos?: string[]
          purchase_date?: string | null
          qr_code: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_end?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photos?: string[]
          purchase_date?: string | null
          qr_code?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_documents: {
        Row: {
          equipment_id: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          name: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          equipment_id: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          name: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          equipment_id?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_reopens: {
        Row: {
          id: string
          intervention_id: string
          reason: string
          reopened_at: string
          reopened_by: string
        }
        Insert: {
          id?: string
          intervention_id: string
          reason: string
          reopened_at?: string
          reopened_by: string
        }
        Update: {
          id?: string
          intervention_id?: string
          reason?: string
          reopened_at?: string
          reopened_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_reopens_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reopens_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string
          equipment_ids: string[]
          id: string
          parts_replaced: string | null
          pdf_url: string | null
          photos: string[]
          signature_url: string | null
          signed_at: string | null
          started_at: string | null
          status: string
          technician_ids: string[]
          title: string
          updated_at: string
          urgency: string
          work_report: string | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description: string
          equipment_ids?: string[]
          id?: string
          parts_replaced?: string | null
          pdf_url?: string | null
          photos?: string[]
          signature_url?: string | null
          signed_at?: string | null
          started_at?: string | null
          status?: string
          technician_ids?: string[]
          title: string
          updated_at?: string
          urgency?: string
          work_report?: string | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          equipment_ids?: string[]
          id?: string
          parts_replaced?: string | null
          pdf_url?: string | null
          photos?: string[]
          signature_url?: string | null
          signed_at?: string | null
          started_at?: string | null
          status?: string
          technician_ids?: string[]
          title?: string
          updated_at?: string
          urgency?: string
          work_report?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
          name: string
        }
        Insert: {
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
          name: string
        }
        Update: {
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_validated: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_validated?: boolean
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_validated?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          created_at: string
          id: string
          specialty: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialty?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technicians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
