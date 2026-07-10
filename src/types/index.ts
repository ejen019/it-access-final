// =============================================================
// IT-Access Final — Types globaux de l'application
// =============================================================

// ----- Rôles utilisateur -----
export type UserRole = 'super_admin' | 'admin' | 'client' | 'technicien'

// ----- Profil utilisateur (table: utilisateurs) -----
export interface UserProfile {
  id: string
  email: string
  nom: string
  prenom?: string | null
  telephone?: string | null
  photo_url?: string | null
  role: UserRole
  compte_valide: boolean
  est_actif: boolean
  cree_le: string
  modifie_le: string
}

// ----- Client / Entreprise (table: clients) -----
export interface ClientProfile {
  id: string
  utilisateur_id: string
  nom_entreprise: string
  adresse?: string | null
  ville?: string | null
  telephone?: string | null
  secteur?: string | null
  logo_url?: string | null
  code_signature: string
  cree_le: string
  modifie_le: string
}

// ----- Technicien (table: techniciens) -----
export interface TechnicienProfile {
  id: string
  utilisateur_id: string
  specialite?: string | null
  cree_le: string
}

// ----- Affectation technicien ↔ client (table: affectations) -----
export interface Affectation {
  id: string
  technicien_id: string
  client_id: string
  affecte_par: string
  affecte_le: string
}

// ----- Abonnement / Plan (table: abonnements) -----
export type TypePlan = 'starter' | 'medium' | 'premium'

export interface Abonnement {
  id: string
  plan: TypePlan
  montant: number
  max_equipements: number
  max_techniciens: number
}

// ----- Contrat (table: contrats) -----
export interface Contrat {
  id: string
  client_id: string
  abonnement_id?: string | null
  date_debut: string
  date_fin: string
  nbr_equip_actuel: number
  nbr_techniciens_actuel: number
  est_actif: boolean
  raison?: string | null
  cree_le: string
  modifie_le: string
}

// ----- Équipement (table: equipements) -----
export type EtatEquipement = 'operationnel' | 'maintenance' | 'en_panne' | 'detruit'

export interface Equipement {
  id: string
  client_id: string
  nom: string
  modele?: string | null
  numero_serie?: string | null
  categorie?: string | null
  emplacement?: string | null
  date_achat?: string | null
  fin_garantie?: string | null
  etat: EtatEquipement
  qr_code: string
  photos: string[]
  notes?: string | null
  cree_par: string
  cree_le: string
  modifie_le: string
}

// Document attaché à un équipement (table: documents_equipement)
export interface DocumentEquipement {
  id: string
  equipement_id: string
  nom: string
  url_fichier: string
  type_fichier: 'docx' | 'pdf' | 'txt'
  taille_fichier: number
  uploade_par: string
  uploade_le: string
}

// ----- Demande de maintenance (table: demandes_maintenance) -----
export type EtatDemandeMaintenance = 'en_attente' | 'planifiee' | 'rejetee' | 'annulee'
export type NiveauUrgence = 'faible' | 'moyenne' | 'critique'

export interface DemandeMaintenance {
  id: string
  client_id: string
  equipement_id: string
  description: string
  urgence: NiveauUrgence
  etat: EtatDemandeMaintenance
  cree_par: string
  intervention_planifiee_id?: string | null
  cree_le: string
  modifie_le: string
}

// ----- Demande de modification d'équipement (table: demandes_modification) -----
export type TypeAction = 'ajout' | 'modifier' | 'supprimer'
export type StatutDemande = 'en_attente' | 'approuvee' | 'rejetee'

export interface DemandeModification {
  id: string
  client_id: string
  equipement_id?: string | null
  demande_par: string
  action: TypeAction
  donnees: Record<string, unknown>
  statut: StatutDemande
  note_revision?: string | null
  revise_par?: string | null
  revise_le?: string | null
  cree_le: string
  modifie_le: string
}

// ----- Intervention (table: interventions) -----
export type StatutIntervention =
  | 'planifiee'
  | 'en_cours'
  | 'terminee'
  | 'signee'
  | 'annulee'

export type TypePlanification = 'reparation' | 'periodique'

export interface Intervention {
  id: string
  client_id: string
  titre: string
  description: string
  type_planification: TypePlanification
  statut: StatutIntervention
  urgence: NiveauUrgence
  photos: string[]
  planifie_le?: string | null
  signee_le?: string | null
  cree_par: string
  cloturee_le?: string | null
  cree_le: string
  modifie_le: string
}

// ----- Rapport d'intervention (table: rapports_intervention) -----
export interface RapportIntervention {
  id: string
  intervention_id: string
  description: string
  pieces_remplacees?: string | null
  rapport_travaux?: string | null
  url_signature?: string | null
  url_pdf?: string | null
  date_debut?: string | null
  date_fin?: string | null
  cree_le: string
}

// ----- Message (table: messages) -----
export interface Message {
  id: string
  conversation_id: string
  expediteur_id: string
  contenu: string
  reponse_a_id?: string | null
  lu: boolean
  est_modifie: boolean
  edite_le?: string | null
  cree_le: string
}

export interface PieceJointeMessage {
  id: string
  message_id: string
  nom: string
  url_fichier: string
  type_fichier: string
  taille_fichier: number
}

// ----- Notification (table: notifications) -----
export type TypeNotification =
  | 'nouveau_compte_en_attente'
  | 'compte_valide'
  | 'nouvelle_intervention'
  | 'intervention_assignee'
  | 'intervention_mise_a_jour'
  | 'demande_maintenance_creee'
  | 'demande_maintenance_planifiee'
  | 'demande_modification_creee'
  | 'demande_modification_approuvee'
  | 'demande_modification_rejetee'
  | 'nouveau_message'

export interface Notification {
  id: string
  utilisateur_id: string
  type: TypeNotification
  titre: string
  corps: string
  lien?: string | null
  est_lu: boolean
  cree_le: string
}

// ----- Journal d'audit (table: journaux_audit) -----
export interface JournalAudit {
  id: string
  acteur_id?: string | null
  role_acteur?: UserRole | null
  action: string
  type_entite: string
  entite_id?: string | null
  details: Record<string, unknown>
  cree_le: string
}

// ----- Helpers -----
export interface ResultatPagine<T> {
  data: T[]
  total: number
  page: number
  parPage: number
}

export type StatutReseau = 'en_ligne' | 'hors_ligne'
