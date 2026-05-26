// Rôles utilisateur
export type UserRole = 'sudo' | 'admin' | 'technicien' | 'entreprise';

// Statuts intervention
export type InterventionStatus =
  | 'active'
  | 'en_cours'
  | 'en_attente_validation'
  | 'cloturee'
  | 'annulee';

// Urgence intervention
export type UrgencyLevel = 'normale' | 'haute' | 'critique';

// Statut équipement
export type EquipmentStatus = 'actif' | 'en_panne' | 'en_maintenance' | 'retire';

// Plans tarifaires
export type ContractPlan = 'starter' | 'pro' | 'enterprise';

// Types de notifications
export type NotificationType =
  | 'intervention_created'
  | 'intervention_updated'
  | 'intervention_closed'
  | 'intervention_cancelled'
  | 'intervention_validated'
  | 'message_received'
  | 'account_validated'
  | 'account_deactivated';

// ─── Entités métier ───────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  is_validated: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  profile_id: string;
  name: string;
  siret: string | null;
  address: string | null;
  validation_code: string;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
  // relations jointes
  profile?: Profile;
  contract?: Contract;
}

export interface Technician {
  id: string;
  profile_id: string;
  speciality: string | null;
  created_at: string;
  // relations jointes
  profile?: Profile;
}

export interface Assignment {
  id: string;
  technician_id: string;
  company_id: string;
  created_at: string;
  // relations jointes
  technician?: Technician & { profile: Profile };
  company?: Company;
}

export interface Contract {
  id: string;
  company_id: string;
  plan: ContractPlan;
  max_equipment: number;
  max_interventions_per_month: number;
  max_technicians: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  serial_number: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  status: EquipmentStatus;
  location: string | null;
  photos: string[];
  qr_code_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // relations jointes
  company?: Company;
}

export interface EquipmentDocument {
  id: string;
  equipment_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Intervention {
  id: string;
  company_id: string;
  equipment_ids: string[];
  technician_ids: string[];
  title: string;
  description: string | null;
  status: InterventionStatus;
  urgency: UrgencyLevel;
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
  // relations jointes
  company?: Company;
}

export interface InterventionReopen {
  id: string;
  intervention_id: string;
  reopened_by: string;
  reason: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  reply_to_id: string | null;
  is_read: boolean;
  created_at: string;
  // relations jointes
  sender?: Profile;
  reply_to?: Message;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  redirect_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  // relations jointes
  actor?: Profile;
}

export interface AppSettings {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

// ─── Types utilitaires ────────────────────────────────────────────

export interface PublicConfig {
  app_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  pricing: PricingPlan[];
}

export interface PricingPlan {
  id: ContractPlan;
  label: string;
  price: number;
  features: string[];
}
