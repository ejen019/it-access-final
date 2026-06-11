// =============================================================
// Types Supabase — schéma IT-Access Final (français)
// Regénérer via : supabase gen types typescript --project-id lpsjnyrpltkrxsfwldbe
// =============================================================

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
      utilisateurs: {
        Row: {
          id: string
          email: string
          nom: string
          prenom: string | null
          telephone: string | null
          photo_url: string | null
          role: 'super_admin' | 'admin' | 'technicien' | 'client'
          compte_valide: boolean
          est_actif: boolean
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id: string
          email: string
          nom: string
          prenom?: string | null
          telephone?: string | null
          photo_url?: string | null
          role: 'super_admin' | 'admin' | 'technicien' | 'client'
          compte_valide?: boolean
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          email?: string
          nom?: string
          prenom?: string | null
          telephone?: string | null
          photo_url?: string | null
          role?: 'super_admin' | 'admin' | 'technicien' | 'client'
          compte_valide?: boolean
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Relationships: []
      }
      abonnements: {
        Row: {
          id: string
          plan: 'starter' | 'medium' | 'premium'
          montant: number
          max_equipements: number
          max_techniciens: number
        }
        Insert: {
          id?: string
          plan: 'starter' | 'medium' | 'premium'
          montant?: number
          max_equipements: number
          max_techniciens: number
        }
        Update: {
          id?: string
          plan?: 'starter' | 'medium' | 'premium'
          montant?: number
          max_equipements?: number
          max_techniciens?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          utilisateur_id: string
          nom_entreprise: string
          adresse: string | null
          ville: string | null
          telephone: string | null
          secteur: string | null
          logo_url: string | null
          code_signature: string
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          utilisateur_id: string
          nom_entreprise: string
          adresse?: string | null
          ville?: string | null
          telephone?: string | null
          secteur?: string | null
          logo_url?: string | null
          code_signature?: string
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string
          nom_entreprise?: string
          adresse?: string | null
          ville?: string | null
          telephone?: string | null
          secteur?: string | null
          logo_url?: string | null
          code_signature?: string
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: true
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          }
        ]
      }
      techniciens: {
        Row: {
          id: string
          utilisateur_id: string
          specialite: string | null
          cree_le: string
        }
        Insert: {
          id?: string
          utilisateur_id: string
          specialite?: string | null
          cree_le?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string
          specialite?: string | null
          cree_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "techniciens_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: true
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          }
        ]
      }
      contrats: {
        Row: {
          id: string
          client_id: string
          abonnement_id: string | null
          date_debut: string
          date_fin: string
          nbr_equip_actuel: number
          nbr_techniciens_actuel: number
          est_actif: boolean
          raison: string | null
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          client_id: string
          abonnement_id?: string | null
          date_debut?: string
          date_fin?: string
          nbr_equip_actuel?: number
          nbr_techniciens_actuel?: number
          est_actif?: boolean
          raison?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          client_id?: string
          abonnement_id?: string | null
          date_debut?: string
          date_fin?: string
          nbr_equip_actuel?: number
          nbr_techniciens_actuel?: number
          est_actif?: boolean
          raison?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_abonnement_id_fkey"
            columns: ["abonnement_id"]
            isOneToOne: false
            referencedRelation: "abonnements"
            referencedColumns: ["id"]
          }
        ]
      }
      affectations: {
        Row: {
          id: string
          technicien_id: string
          client_id: string
          affecte_par: string
          affecte_le: string
        }
        Insert: {
          id?: string
          technicien_id: string
          client_id: string
          affecte_par: string
          affecte_le?: string
        }
        Update: {
          id?: string
          technicien_id?: string
          client_id?: string
          affecte_par?: string
          affecte_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_technicien_id_fkey"
            columns: ["technicien_id"]
            isOneToOne: false
            referencedRelation: "techniciens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      equipements: {
        Row: {
          id: string
          client_id: string
          nom: string
          modele: string | null
          numero_serie: string | null
          categorie: string | null
          emplacement: string | null
          date_achat: string | null
          fin_garantie: string | null
          etat: 'operationnel' | 'maintenance' | 'en_panne'
          qr_code: string
          photos: string[]
          notes: string | null
          cree_par: string
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          client_id: string
          nom: string
          modele?: string | null
          numero_serie?: string | null
          categorie?: string | null
          emplacement?: string | null
          date_achat?: string | null
          fin_garantie?: string | null
          etat?: 'operationnel' | 'maintenance' | 'en_panne'
          qr_code: string
          photos?: string[]
          notes?: string | null
          cree_par: string
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          client_id?: string
          nom?: string
          modele?: string | null
          numero_serie?: string | null
          categorie?: string | null
          emplacement?: string | null
          date_achat?: string | null
          fin_garantie?: string | null
          etat?: 'operationnel' | 'maintenance' | 'en_panne'
          qr_code?: string
          photos?: string[]
          notes?: string | null
          cree_par?: string
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipements_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          }
        ]
      }
      documents_equipement: {
        Row: {
          id: string
          equipement_id: string
          nom: string
          url_fichier: string
          type_fichier: 'docx' | 'pdf' | 'txt'
          taille_fichier: number
          uploade_par: string
          uploade_le: string
        }
        Insert: {
          id?: string
          equipement_id: string
          nom: string
          url_fichier: string
          type_fichier: 'docx' | 'pdf' | 'txt'
          taille_fichier: number
          uploade_par: string
          uploade_le?: string
        }
        Update: {
          id?: string
          equipement_id?: string
          nom?: string
          url_fichier?: string
          type_fichier?: 'docx' | 'pdf' | 'txt'
          taille_fichier?: number
          uploade_par?: string
          uploade_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_equipement_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          }
        ]
      }
      demandes_modification: {
        Row: {
          id: string
          client_id: string
          equipement_id: string | null
          demande_par: string
          action: 'ajout' | 'modifier' | 'supprimer'
          donnees: Json
          statut: 'en_attente' | 'approuvee' | 'rejetee'
          note_revision: string | null
          revise_par: string | null
          revise_le: string | null
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          client_id: string
          equipement_id?: string | null
          demande_par: string
          action: 'ajout' | 'modifier' | 'supprimer'
          donnees?: Json
          statut?: 'en_attente' | 'approuvee' | 'rejetee'
          note_revision?: string | null
          revise_par?: string | null
          revise_le?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          client_id?: string
          equipement_id?: string | null
          demande_par?: string
          action?: 'ajout' | 'modifier' | 'supprimer'
          donnees?: Json
          statut?: 'en_attente' | 'approuvee' | 'rejetee'
          note_revision?: string | null
          revise_par?: string | null
          revise_le?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_modification_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      demandes_maintenance: {
        Row: {
          id: string
          client_id: string
          equipement_id: string
          description: string
          urgence: 'faible' | 'moyenne' | 'critique'
          etat: 'en_attente' | 'planifiee' | 'rejetee' | 'annulee'
          cree_par: string
          intervention_planifiee_id: string | null
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          client_id: string
          equipement_id: string
          description: string
          urgence?: 'faible' | 'moyenne' | 'critique'
          etat?: 'en_attente' | 'planifiee' | 'rejetee' | 'annulee'
          cree_par: string
          intervention_planifiee_id?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          client_id?: string
          equipement_id?: string
          description?: string
          urgence?: 'faible' | 'moyenne' | 'critique'
          etat?: 'en_attente' | 'planifiee' | 'rejetee' | 'annulee'
          cree_par?: string
          intervention_planifiee_id?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_maintenance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_maintenance_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          }
        ]
      }
      interventions: {
        Row: {
          id: string
          client_id: string
          titre: string
          description: string
          type_planification: 'reparation' | 'periodique'
          statut: 'planifiee' | 'en_cours' | 'terminee' | 'signee' | 'annulee'
          urgence: 'faible' | 'moyenne' | 'critique'
          photos: string[]
          planifie_le: string | null
          signee_le: string | null
          cree_par: string
          cloturee_le: string | null
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          client_id: string
          titre: string
          description: string
          type_planification?: 'reparation' | 'periodique'
          statut?: 'planifiee' | 'en_cours' | 'terminee' | 'signee' | 'annulee'
          urgence?: 'faible' | 'moyenne' | 'critique'
          photos?: string[]
          planifie_le?: string | null
          signee_le?: string | null
          cree_par: string
          cloturee_le?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          client_id?: string
          titre?: string
          description?: string
          type_planification?: 'reparation' | 'periodique'
          statut?: 'planifiee' | 'en_cours' | 'terminee' | 'signee' | 'annulee'
          urgence?: 'faible' | 'moyenne' | 'critique'
          photos?: string[]
          planifie_le?: string | null
          signee_le?: string | null
          cree_par?: string
          cloturee_le?: string | null
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      interventions_equipements: {
        Row: {
          intervention_id: string
          equipement_id: string
        }
        Insert: {
          intervention_id: string
          equipement_id: string
        }
        Update: {
          intervention_id?: string
          equipement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_equipements_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_equipements_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          }
        ]
      }
      interventions_techniciens: {
        Row: {
          intervention_id: string
          technicien_id: string
        }
        Insert: {
          intervention_id: string
          technicien_id: string
        }
        Update: {
          intervention_id?: string
          technicien_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_techniciens_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_techniciens_technicien_id_fkey"
            columns: ["technicien_id"]
            isOneToOne: false
            referencedRelation: "techniciens"
            referencedColumns: ["id"]
          }
        ]
      }
      rapports_intervention: {
        Row: {
          id: string
          intervention_id: string
          description: string
          pieces_remplacees: string | null
          rapport_travaux: string | null
          url_signature: string | null
          url_pdf: string | null
          date_debut: string | null
          date_fin: string | null
          cree_le: string
        }
        Insert: {
          id?: string
          intervention_id: string
          description: string
          pieces_remplacees?: string | null
          rapport_travaux?: string | null
          url_signature?: string | null
          url_pdf?: string | null
          date_debut?: string | null
          date_fin?: string | null
          cree_le?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          description?: string
          pieces_remplacees?: string | null
          rapport_travaux?: string | null
          url_signature?: string | null
          url_pdf?: string | null
          date_debut?: string | null
          date_fin?: string | null
          cree_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapports_intervention_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: true
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          expediteur_id: string
          contenu: string
          reponse_a_id: string | null
          lu: boolean
          est_modifie: boolean
          edite_le: string | null
          cree_le: string
        }
        Insert: {
          id?: string
          conversation_id: string
          expediteur_id: string
          contenu: string
          reponse_a_id?: string | null
          lu?: boolean
          est_modifie?: boolean
          edite_le?: string | null
          cree_le?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          expediteur_id?: string
          contenu?: string
          reponse_a_id?: string | null
          lu?: boolean
          est_modifie?: boolean
          edite_le?: string | null
          cree_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_expediteur_id_fkey"
            columns: ["expediteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reponse_a_id_fkey"
            columns: ["reponse_a_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      pieces_jointes_message: {
        Row: {
          id: string
          message_id: string
          nom: string
          url_fichier: string
          type_fichier: string
          taille_fichier: number
        }
        Insert: {
          id?: string
          message_id: string
          nom: string
          url_fichier: string
          type_fichier: string
          taille_fichier: number
        }
        Update: {
          id?: string
          message_id?: string
          nom?: string
          url_fichier?: string
          type_fichier?: string
          taille_fichier?: number
        }
        Relationships: [
          {
            foreignKeyName: "pieces_jointes_message_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          utilisateur_id: string
          type: string
          titre: string
          corps: string
          lien: string | null
          est_lu: boolean
          cree_le: string
        }
        Insert: {
          id?: string
          utilisateur_id: string
          type: string
          titre: string
          corps: string
          lien?: string | null
          est_lu?: boolean
          cree_le?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string
          type?: string
          titre?: string
          corps?: string
          lien?: string | null
          est_lu?: boolean
          cree_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          }
        ]
      }
      journaux_audit: {
        Row: {
          id: string
          acteur_id: string | null
          role_acteur: string | null
          action: string
          type_entite: string
          entite_id: string | null
          details: Json
          cree_le: string
        }
        Insert: {
          id?: string
          acteur_id?: string | null
          role_acteur?: string | null
          action: string
          type_entite: string
          entite_id?: string | null
          details?: Json
          cree_le?: string
        }
        Update: {
          id?: string
          acteur_id?: string | null
          role_acteur?: string | null
          action?: string
          type_entite?: string
          entite_id?: string | null
          details?: Json
          cree_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "journaux_audit_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          }
        ]
      }
      parametres_application: {
        Row: {
          cle: string
          valeur: Json
          modifie_le: string
        }
        Insert: {
          cle: string
          valeur?: Json
          modifie_le?: string
        }
        Update: {
          cle?: string
          valeur?: Json
          modifie_le?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mon_role: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

// Raccourcis pratiques
export type Utilisateur    = Tables<'utilisateurs'>
export type Client         = Tables<'clients'>
export type Technicien     = Tables<'techniciens'>
export type Contrat        = Tables<'contrats'>
export type Abonnement     = Tables<'abonnements'>
export type Affectation    = Tables<'affectations'>
export type Equipement     = Tables<'equipements'>
export type DocumentEquipement = Tables<'documents_equipement'>
export type DemandeModification = Tables<'demandes_modification'>
export type DemandeMaintenance  = Tables<'demandes_maintenance'>
export type Intervention   = Tables<'interventions'>
export type RapportIntervention = Tables<'rapports_intervention'>
export type Message        = Tables<'messages'>
export type Notification   = Tables<'notifications'>
export type JournalAudit   = Tables<'journaux_audit'>
