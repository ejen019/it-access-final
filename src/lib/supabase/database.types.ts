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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abonnements: {
        Row: {
          id: string
          max_equipements: number
          max_techniciens: number
          montant: number
          plan: string
        }
        Insert: {
          id?: string
          max_equipements: number
          max_techniciens: number
          montant?: number
          plan: string
        }
        Update: {
          id?: string
          max_equipements?: number
          max_techniciens?: number
          montant?: number
          plan?: string
        }
        Relationships: []
      }
      affectations: {
        Row: {
          affecte_le: string
          affecte_par: string
          client_id: string
          id: string
          technicien_id: string
        }
        Insert: {
          affecte_le?: string
          affecte_par: string
          client_id: string
          id?: string
          technicien_id: string
        }
        Update: {
          affecte_le?: string
          affecte_par?: string
          client_id?: string
          id?: string
          technicien_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_affecte_par_fkey"
            columns: ["affecte_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_technicien_id_fkey"
            columns: ["technicien_id"]
            isOneToOne: false
            referencedRelation: "techniciens"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          code_signature: string
          cree_le: string
          id: string
          logo_url: string | null
          modifie_le: string
          nom_entreprise: string
          secteur: string | null
          telephone: string | null
          utilisateur_id: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_signature?: string
          cree_le?: string
          id?: string
          logo_url?: string | null
          modifie_le?: string
          nom_entreprise: string
          secteur?: string | null
          telephone?: string | null
          utilisateur_id: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_signature?: string
          cree_le?: string
          id?: string
          logo_url?: string | null
          modifie_le?: string
          nom_entreprise?: string
          secteur?: string | null
          telephone?: string | null
          utilisateur_id?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: true
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats: {
        Row: {
          abonnement_id: string | null
          client_id: string
          cree_le: string
          date_debut: string
          date_fin: string
          est_actif: boolean
          id: string
          modifie_le: string
          nbr_equip_actuel: number
          nbr_techniciens_actuel: number
          raison: string | null
        }
        Insert: {
          abonnement_id?: string | null
          client_id: string
          cree_le?: string
          date_debut?: string
          date_fin?: string
          est_actif?: boolean
          id?: string
          modifie_le?: string
          nbr_equip_actuel?: number
          nbr_techniciens_actuel?: number
          raison?: string | null
        }
        Update: {
          abonnement_id?: string | null
          client_id?: string
          cree_le?: string
          date_debut?: string
          date_fin?: string
          est_actif?: boolean
          id?: string
          modifie_le?: string
          nbr_equip_actuel?: number
          nbr_techniciens_actuel?: number
          raison?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_abonnement_id_fkey"
            columns: ["abonnement_id"]
            isOneToOne: false
            referencedRelation: "abonnements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_maintenance: {
        Row: {
          client_id: string
          cree_le: string
          cree_par: string
          description: string
          equipement_id: string
          etat: string
          id: string
          intervention_planifiee_id: string | null
          modifie_le: string
          urgence: string
        }
        Insert: {
          client_id: string
          cree_le?: string
          cree_par: string
          description: string
          equipement_id: string
          etat?: string
          id?: string
          intervention_planifiee_id?: string | null
          modifie_le?: string
          urgence?: string
        }
        Update: {
          client_id?: string
          cree_le?: string
          cree_par?: string
          description?: string
          equipement_id?: string
          etat?: string
          id?: string
          intervention_planifiee_id?: string | null
          modifie_le?: string
          urgence?: string
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
            foreignKeyName: "demandes_maintenance_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_maintenance_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_intervention_planifiee"
            columns: ["intervention_planifiee_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_modification: {
        Row: {
          action: string
          client_id: string
          cree_le: string
          demande_par: string
          donnees: Json
          equipement_id: string | null
          id: string
          modifie_le: string
          note_revision: string | null
          revise_le: string | null
          revise_par: string | null
          statut: string
        }
        Insert: {
          action: string
          client_id: string
          cree_le?: string
          demande_par: string
          donnees?: Json
          equipement_id?: string | null
          id?: string
          modifie_le?: string
          note_revision?: string | null
          revise_le?: string | null
          revise_par?: string | null
          statut?: string
        }
        Update: {
          action?: string
          client_id?: string
          cree_le?: string
          demande_par?: string
          donnees?: Json
          equipement_id?: string | null
          id?: string
          modifie_le?: string
          note_revision?: string | null
          revise_le?: string | null
          revise_par?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_modification_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_modification_demande_par_fkey"
            columns: ["demande_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_modification_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_modification_revise_par_fkey"
            columns: ["revise_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_equipement: {
        Row: {
          equipement_id: string
          id: string
          nom: string
          taille_fichier: number
          type_fichier: string
          uploade_le: string
          uploade_par: string
          url_fichier: string
        }
        Insert: {
          equipement_id: string
          id?: string
          nom: string
          taille_fichier: number
          type_fichier: string
          uploade_le?: string
          uploade_par: string
          url_fichier: string
        }
        Update: {
          equipement_id?: string
          id?: string
          nom?: string
          taille_fichier?: number
          type_fichier?: string
          uploade_le?: string
          uploade_par?: string
          url_fichier?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_equipement_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_equipement_uploade_par_fkey"
            columns: ["uploade_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      equipements: {
        Row: {
          categorie: string | null
          client_id: string
          cree_le: string
          cree_par: string
          date_achat: string | null
          emplacement: string | null
          etat: string
          fin_garantie: string | null
          id: string
          modele: string | null
          modifie_le: string
          nom: string
          notes: string | null
          numero_serie: string | null
          photos: string[]
          qr_code: string
        }
        Insert: {
          categorie?: string | null
          client_id: string
          cree_le?: string
          cree_par: string
          date_achat?: string | null
          emplacement?: string | null
          etat?: string
          fin_garantie?: string | null
          id?: string
          modele?: string | null
          modifie_le?: string
          nom: string
          notes?: string | null
          numero_serie?: string | null
          photos?: string[]
          qr_code: string
        }
        Update: {
          categorie?: string | null
          client_id?: string
          cree_le?: string
          cree_par?: string
          date_achat?: string | null
          emplacement?: string | null
          etat?: string
          fin_garantie?: string | null
          id?: string
          modele?: string | null
          modifie_le?: string
          nom?: string
          notes?: string | null
          numero_serie?: string | null
          photos?: string[]
          qr_code?: string
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
          },
        ]
      }
      interventions: {
        Row: {
          client_id: string
          cloturee_le: string | null
          cree_le: string
          cree_par: string
          description: string
          id: string
          modifie_le: string
          note_commentaire: string | null
          note_satisfaction: number | null
          photos: string[]
          planifie_le: string | null
          signee_le: string | null
          statut: string
          titre: string
          type_planification: string
          urgence: string
        }
        Insert: {
          client_id: string
          cloturee_le?: string | null
          cree_le?: string
          cree_par: string
          description: string
          id?: string
          modifie_le?: string
          note_commentaire?: string | null
          note_satisfaction?: number | null
          photos?: string[]
          planifie_le?: string | null
          signee_le?: string | null
          statut?: string
          titre: string
          type_planification?: string
          urgence?: string
        }
        Update: {
          client_id?: string
          cloturee_le?: string | null
          cree_le?: string
          cree_par?: string
          description?: string
          id?: string
          modifie_le?: string
          note_commentaire?: string | null
          note_satisfaction?: number | null
          photos?: string[]
          planifie_le?: string | null
          signee_le?: string | null
          statut?: string
          titre?: string
          type_planification?: string
          urgence?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions_equipements: {
        Row: {
          equipement_id: string
          intervention_id: string
        }
        Insert: {
          equipement_id: string
          intervention_id: string
        }
        Update: {
          equipement_id?: string
          intervention_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_equipements_equipement_id_fkey"
            columns: ["equipement_id"]
            isOneToOne: false
            referencedRelation: "equipements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_equipements_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions_techniciens: {
        Row: {
          intervention_id: string
          technicien_id: string
          statut_affectation: string
        }
        Insert: {
          intervention_id: string
          technicien_id: string
          statut_affectation?: string
        }
        Update: {
          intervention_id?: string
          technicien_id?: string
          statut_affectation?: string
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
          },
        ]
      }
      journaux_audit: {
        Row: {
          acteur_id: string | null
          action: string
          cree_le: string
          details: Json
          entite_id: string | null
          id: string
          role_acteur: string | null
          type_entite: string
        }
        Insert: {
          acteur_id?: string | null
          action: string
          cree_le?: string
          details?: Json
          entite_id?: string | null
          id?: string
          role_acteur?: string | null
          type_entite: string
        }
        Update: {
          acteur_id?: string | null
          action?: string
          cree_le?: string
          details?: Json
          entite_id?: string | null
          id?: string
          role_acteur?: string | null
          type_entite?: string
        }
        Relationships: [
          {
            foreignKeyName: "journaux_audit_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contenu: string
          conversation_id: string
          cree_le: string
          edite_le: string | null
          est_modifie: boolean
          expediteur_id: string
          id: string
          lu: boolean
          reponse_a_id: string | null
        }
        Insert: {
          contenu: string
          conversation_id: string
          cree_le?: string
          edite_le?: string | null
          est_modifie?: boolean
          expediteur_id: string
          id?: string
          lu?: boolean
          reponse_a_id?: string | null
        }
        Update: {
          contenu?: string
          conversation_id?: string
          cree_le?: string
          edite_le?: string | null
          est_modifie?: boolean
          expediteur_id?: string
          id?: string
          lu?: boolean
          reponse_a_id?: string | null
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
          },
        ]
      }
      notifications: {
        Row: {
          corps: string
          cree_le: string
          est_lu: boolean
          id: string
          lien: string | null
          titre: string
          type: string
          utilisateur_id: string
        }
        Insert: {
          corps: string
          cree_le?: string
          est_lu?: boolean
          id?: string
          lien?: string | null
          titre: string
          type: string
          utilisateur_id: string
        }
        Update: {
          corps?: string
          cree_le?: string
          est_lu?: boolean
          id?: string
          lien?: string | null
          titre?: string
          type?: string
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres_application: {
        Row: {
          cle: string
          modifie_le: string
          valeur: Json
        }
        Insert: {
          cle: string
          modifie_le?: string
          valeur?: Json
        }
        Update: {
          cle?: string
          modifie_le?: string
          valeur?: Json
        }
        Relationships: []
      }
      pieces_jointes_message: {
        Row: {
          id: string
          message_id: string
          nom: string
          taille_fichier: number
          type_fichier: string
          url_fichier: string
        }
        Insert: {
          id?: string
          message_id: string
          nom: string
          taille_fichier: number
          type_fichier: string
          url_fichier: string
        }
        Update: {
          id?: string
          message_id?: string
          nom?: string
          taille_fichier?: number
          type_fichier?: string
          url_fichier?: string
        }
        Relationships: [
          {
            foreignKeyName: "pieces_jointes_message_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports_intervention: {
        Row: {
          cree_le: string
          date_debut: string | null
          date_fin: string | null
          description: string | null
          id: string
          intervention_id: string
          notes_complementaires: string | null
          pieces_remplacees: string | null
          rapport_travaux: string | null
          resultat: string | null
          url_pdf: string | null
          url_signature: string | null
        }
        Insert: {
          cree_le?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          intervention_id: string
          notes_complementaires?: string | null
          pieces_remplacees?: string | null
          rapport_travaux?: string | null
          resultat?: string | null
          url_pdf?: string | null
          url_signature?: string | null
        }
        Update: {
          cree_le?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          intervention_id?: string
          notes_complementaires?: string | null
          pieces_remplacees?: string | null
          rapport_travaux?: string | null
          resultat?: string | null
          url_pdf?: string | null
          url_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapports_intervention_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: true
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      techniciens: {
        Row: {
          cree_le: string
          id: string
          specialite: string | null
          utilisateur_id: string
        }
        Insert: {
          cree_le?: string
          id?: string
          specialite?: string | null
          utilisateur_id: string
        }
        Update: {
          cree_le?: string
          id?: string
          specialite?: string | null
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "techniciens_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: true
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      utilisateurs: {
        Row: {
          compte_valide: boolean
          cree_le: string
          email: string
          est_actif: boolean
          id: string
          modifie_le: string
          nom: string
          photo_url: string | null
          prenom: string | null
          role: string
          telephone: string | null
        }
        Insert: {
          compte_valide?: boolean
          cree_le?: string
          email: string
          est_actif?: boolean
          id: string
          modifie_le?: string
          nom: string
          photo_url?: string | null
          prenom?: string | null
          role: string
          telephone?: string | null
        }
        Update: {
          compte_valide?: boolean
          cree_le?: string
          email?: string
          est_actif?: boolean
          id?: string
          modifie_le?: string
          nom?: string
          photo_url?: string | null
          prenom?: string | null
          role?: string
          telephone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mes_clients: { Args: Record<PropertyKey, never>; Returns: string[] }
      mes_contacts_messagerie: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          id: string
          nom: string
          prenom: string
          role: string
        }[]
      }
      mes_interventions_client: { Args: Record<PropertyKey, never>; Returns: string[] }
      mes_interventions_tech: { Args: Record<PropertyKey, never>; Returns: string[] }
      mon_role: { Args: Record<PropertyKey, never>; Returns: string }
      mon_technicien_id: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
