// =============================================================
// IT-Access V2 — Types globaux de l'application
// Tous les types partagés entre les features sont définis ici.
// Chaque feature peut avoir ses propres types locaux en plus.
// =============================================================

// ----- Rôles utilisateur -----
// Hiérarchie : sudo > admin > entreprise | technicien
export type UserRole = 'sudo' | 'admin' | 'entreprise' | 'technicien'

// ----- Profil utilisateur (table: profiles) -----
export interface UserProfile {
  id: string               // UUID Supabase Auth
  email: string
  full_name: string
  phone?: string | null
  avatar_url?: string | null
  role: UserRole
  is_active: boolean
  is_validated: boolean
  created_at: string
  updated_at: string
}

// ----- Entreprise cliente (table: companies) -----
export interface Company {
  id: string
  user_id: string          // Référence vers profiles.id
  company_name: string
  address?: string
  city?: string
  phone?: string
  sector?: string          // Secteur d'activité
  logo_url?: string
  validation_code: string  // Code unique pour signer les interventions
  contract_id?: string     // Contrat actif
  created_at: string
  updated_at: string
}

// ----- Technicien (table: technicians) -----
export interface Technician {
  id: string
  user_id: string          // Référence vers profiles.id
  specialty?: string       // Spécialité technique
  created_at: string
}

// ----- Affectation technicien ↔ entreprise (table: assignments) -----
export interface Assignment {
  id: string
  technician_id: string    // Référence vers technicians.id
  company_id: string       // Référence vers companies.id
  assigned_at: string
  assigned_by: string      // Admin qui a fait l'affectation
}

// ----- Contrat de maintenance (table: contracts) -----
export type ContractPlan = 'starter' | 'medium' | 'premium' | 'pro' | 'enterprise'

export interface Contract {
  id: string
  company_id: string
  plan: ContractPlan
  max_equipment: number    // Quota équipements selon le plan
  max_technicians: number  // Quota techniciens selon le plan
  price_fcfa: number
  start_date: string       // ISO date
  end_date: string         // start_date + 1 an
  is_active: boolean
  created_at: string
  updated_at: string
}

// Plans disponibles (configuration statique)
export const CONTRACT_PLANS: Record<ContractPlan, { label: string; price: number; maxEquipment: number; maxTechnicians: number }> = {
  starter: {
    label: 'Starter',
    price: 5000,
    maxEquipment: 5,
    maxTechnicians: 2,
  },
  medium: {
    label: 'Medium',
    price: 15000,
    maxEquipment: 15,
    maxTechnicians: 5,
  },
  premium: {
    label: 'Premium',
    price: 45000,
    maxEquipment: 50,
    maxTechnicians: 7,
  },
  pro: {
    label: 'Pro (legacy)',
    price: 15000,
    maxEquipment: 15,
    maxTechnicians: 5,
  },
  enterprise: {
    label: 'Enterprise (legacy)',
    price: 45000,
    maxEquipment: 50,
    maxTechnicians: 7,
  },
}

// ----- Équipement (table: equipment) -----
export type EquipmentStatus = 'operationnel' | 'en_panne'

export interface Equipment {
  id: string
  company_id: string
  name: string             // Nom de l'équipement
  model?: string           // Modèle
  serial_number?: string   // Numéro de série
  category?: string        // Type (PC, imprimante, serveur…)
  location?: string        // Localisation physique
  purchase_date?: string   // Date d'achat
  warranty_end?: string    // Fin de garantie
  status: EquipmentStatus
  qr_code: string          // Contenu du QR Code (URL vers passeport)
  photos: string[]         // URLs Supabase Storage (max 3)
  notes?: string
  created_by: string       // profiles.id qui a créé
  created_at: string
  updated_at: string
}

// Document attaché à un équipement (table: equipment_documents)
export interface EquipmentDocument {
  id: string
  equipment_id: string
  name: string
  file_url: string         // URL Supabase Storage
  file_type: string        // 'pdf' | 'docx' | 'txt'
  file_size: number        // En octets
  uploaded_by: string
  uploaded_at: string
}

// ----- Intervention (table: interventions) -----
export type InterventionStatus =
  | 'active'               // Créée, technicien peut travailler
  | 'en_cours'             // Technicien a démarré
  | 'en_attente_validation'// Technicien a clôturé, attend signature client
  | 'cloturee'             // Client a signé — terminée
  | 'annulee'              // Annulée (disparaît des vues)

export type UrgencyLevel = 'faible' | 'moyenne' | 'critique'

export interface Intervention {
  id: string
  company_id: string
  equipment_ids: string[]  // Un ou plusieurs équipements concernés
  title: string
  description: string
  urgency: UrgencyLevel
  status: InterventionStatus
  created_by: string       // profiles.id (admin ou entreprise)
  technician_ids: string[] // Techniciens affectés
  work_report?: string     // Rapport du technicien (texte libre)
  parts_replaced?: string  // Pièces remplacées (texte libre)
  photos: string[]         // Photos de l'intervention (max 3)
  signature_url?: string   // URL de la signature client (Storage)
  pdf_url?: string         // URL du compte rendu PDF final (Storage)
  signed_at?: string       // Horodatage de la signature
  started_at?: string      // Quand le technicien a démarré
  closed_at?: string       // Quand le technicien a clôturé
  created_at: string
  updated_at: string
}

// Historique des réouvertures (table: intervention_reopens)
export interface InterventionReopen {
  id: string
  intervention_id: string
  reason: string           // Raison de la réouverture
  reopened_by: string      // profiles.id de l'entreprise
  reopened_at: string
}

// ----- Message (table: messages) -----
export interface Message {
  id: string
  conversation_id: string  // ID de la conversation entre 2 utilisateurs
  sender_id: string        // profiles.id
  content: string
  reply_to_id?: string     // Message auquel on répond
  attachments?: MessageAttachment[]
  is_edited: boolean
  edited_at?: string
  created_at: string
}

export interface MessageAttachment {
  id: string
  message_id: string
  name: string
  file_url: string
  file_type: string
  file_size: number
}

// ----- Notification (table: notifications) -----
export type NotificationType =
  | 'new_account_pending'     // Nouveau compte à valider (Admin)
  | 'account_validated'       // Compte validé (Entreprise/Technicien)
  | 'new_intervention'        // Nouvelle intervention créée
  | 'intervention_assigned'   // Technicien affecté à une intervention
  | 'intervention_updated'    // Statut d'une intervention changé
  | 'new_message'             // Nouveau message reçu

export interface Notification {
  id: string
  user_id: string          // Destinataire
  type: NotificationType
  title: string
  body: string
  link?: string            // Route vers laquelle rediriger
  is_read: boolean
  created_at: string
}

// ----- Journal d'audit (table: audit_logs) -----
export interface AuditLog {
  id: string
  actor_id?: string | null
  actor_role?: UserRole | null
  action: string
  entity_type: string
  entity_id?: string | null
  details: Record<string, unknown>
  created_at: string
}

// ----- Helpers génériques -----
// Résultat paginé pour les listes
export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

// État de connexion réseau (pour le banner offline)
export type NetworkStatus = 'online' | 'offline'
