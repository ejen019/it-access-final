-- =============================================================
-- IT-Access Final — Schéma base de données Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Exécuter ce fichier en une seule fois
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLE : utilisateurs
-- Étend auth.users avec les données métier
-- =============================================================
CREATE TABLE IF NOT EXISTS utilisateurs (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  nom           TEXT NOT NULL,
  prenom        TEXT,
  telephone     TEXT,
  photo_url     TEXT,
  role          TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'technicien', 'client')),
  compte_valide BOOLEAN NOT NULL DEFAULT false,
  est_actif     BOOLEAN NOT NULL DEFAULT true,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : abonnements
-- Catalogue des formules disponibles (géré par super_admin)
-- =============================================================
CREATE TABLE IF NOT EXISTS abonnements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan             TEXT NOT NULL UNIQUE CHECK (plan IN ('starter', 'medium', 'premium')),
  montant          INTEGER NOT NULL DEFAULT 0,
  max_equipements  INTEGER NOT NULL,
  max_techniciens  INTEGER NOT NULL
);

-- Données initiales des formules
INSERT INTO abonnements (plan, montant, max_equipements, max_techniciens) VALUES
  ('starter',  0,     10,  2),
  ('medium',   50000, 50,  5),
  ('premium',  120000, 200, 20)
ON CONFLICT (plan) DO NOTHING;

-- =============================================================
-- TABLE : clients
-- Profil entreprise cliente (1 utilisateur = 1 client)
-- =============================================================
CREATE TABLE IF NOT EXISTS clients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id   UUID NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nom_entreprise   TEXT NOT NULL,
  adresse          TEXT,
  ville            TEXT,
  telephone        TEXT,
  secteur          TEXT,
  logo_url         TEXT,
  code_signature   TEXT NOT NULL UNIQUE DEFAULT LEFT(MD5(RANDOM()::TEXT), 8),
  cree_le          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : techniciens
-- Profil étendu pour les utilisateurs techniciens
-- =============================================================
CREATE TABLE IF NOT EXISTS techniciens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id UUID NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  specialite     TEXT,
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : contrats
-- Contrat actif d'un client avec un abonnement
-- =============================================================
CREATE TABLE IF NOT EXISTS contrats (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  abonnement_id         UUID REFERENCES abonnements(id) ON DELETE SET NULL,
  date_debut            DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin              DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  nbr_equip_actuel      INTEGER NOT NULL DEFAULT 0,
  nbr_techniciens_actuel INTEGER NOT NULL DEFAULT 0,
  est_actif             BOOLEAN NOT NULL DEFAULT true,
  raison                TEXT,
  cree_le               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : affectations
-- Affectation d'un technicien à un client
-- =============================================================
CREATE TABLE IF NOT EXISTS affectations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technicien_id  UUID NOT NULL REFERENCES techniciens(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  affecte_par    UUID NOT NULL REFERENCES utilisateurs(id),
  affecte_le     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(technicien_id, client_id)
);

-- =============================================================
-- TABLE : equipements
-- Parc matériel d'un client
-- =============================================================
CREATE TABLE IF NOT EXISTS equipements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  modele        TEXT,
  numero_serie  TEXT,
  categorie     TEXT,
  emplacement   TEXT,
  date_achat    DATE,
  fin_garantie  DATE,
  etat          TEXT NOT NULL DEFAULT 'operationnel'
                  CHECK (etat IN ('operationnel', 'maintenance', 'en_panne')),
  qr_code       TEXT NOT NULL,
  photos        TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  cree_par      UUID NOT NULL REFERENCES utilisateurs(id),
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : documents_equipement
-- Fichiers joints à un équipement
-- =============================================================
CREATE TABLE IF NOT EXISTS documents_equipement (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipement_id UUID NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  url_fichier   TEXT NOT NULL,
  type_fichier  TEXT NOT NULL CHECK (type_fichier IN ('docx', 'pdf', 'txt')),
  taille_fichier INTEGER NOT NULL,
  uploade_par   UUID NOT NULL REFERENCES utilisateurs(id),
  uploade_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : demandes_modification
-- Demandes de création / modification / suppression d'équipement
-- =============================================================
CREATE TABLE IF NOT EXISTS demandes_modification (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  equipement_id UUID REFERENCES equipements(id) ON DELETE CASCADE,
  demande_par   UUID NOT NULL REFERENCES utilisateurs(id),
  action        TEXT NOT NULL CHECK (action IN ('ajout', 'modifier', 'supprimer')),
  donnees       JSONB NOT NULL DEFAULT '{}',
  statut        TEXT NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
  note_revision TEXT,
  revise_par    UUID REFERENCES utilisateurs(id),
  revise_le     TIMESTAMPTZ,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : demandes_maintenance
-- Signalements de panne soumis par les clients
-- =============================================================
CREATE TABLE IF NOT EXISTS demandes_maintenance (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  equipement_id           UUID NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
  description             TEXT NOT NULL,
  urgence                 TEXT NOT NULL DEFAULT 'moyenne'
                            CHECK (urgence IN ('faible', 'moyenne', 'critique')),
  etat                    TEXT NOT NULL DEFAULT 'en_attente'
                            CHECK (etat IN ('en_attente', 'planifiee', 'rejetee', 'annulee')),
  cree_par                UUID NOT NULL REFERENCES utilisateurs(id),
  intervention_planifiee_id UUID,
  cree_le                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : interventions
-- Ordre de travail planifié par l'admin
-- =============================================================
CREATE TABLE IF NOT EXISTS interventions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  titre               TEXT NOT NULL,
  description         TEXT NOT NULL,
  type_planification  TEXT NOT NULL DEFAULT 'reparation'
                        CHECK (type_planification IN ('reparation', 'periodique')),
  statut              TEXT NOT NULL DEFAULT 'planifiee'
                        CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'signee', 'annulee')),
  urgence             TEXT NOT NULL DEFAULT 'moyenne'
                        CHECK (urgence IN ('faible', 'moyenne', 'critique')),
  photos              TEXT[] NOT NULL DEFAULT '{}',
  planifie_le         TIMESTAMPTZ,
  signee_le           TIMESTAMPTZ,
  cree_par            UUID NOT NULL REFERENCES utilisateurs(id),
  cloturee_le         TIMESTAMPTZ,
  cree_le             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK circulaire : demandes_maintenance → interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_intervention_planifiee'
  ) THEN
    ALTER TABLE demandes_maintenance ADD CONSTRAINT fk_intervention_planifiee
      FOREIGN KEY (intervention_planifiee_id) REFERENCES interventions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================
-- TABLE : interventions_equipements
-- Équipements concernés par une intervention (n-n)
-- =============================================================
CREATE TABLE IF NOT EXISTS interventions_equipements (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  equipement_id   UUID NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, equipement_id)
);

-- =============================================================
-- TABLE : interventions_techniciens
-- Techniciens affectés à une intervention (n-n)
-- =============================================================
CREATE TABLE IF NOT EXISTS interventions_techniciens (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  technicien_id   UUID NOT NULL REFERENCES techniciens(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, technicien_id)
);

-- =============================================================
-- TABLE : rapports_intervention
-- Compte rendu rédigé après clôture
-- =============================================================
CREATE TABLE IF NOT EXISTS rapports_intervention (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id  UUID NOT NULL UNIQUE REFERENCES interventions(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  pieces_remplacees TEXT,
  rapport_travaux  TEXT,
  url_signature    TEXT,
  url_pdf          TEXT,
  date_debut       TIMESTAMPTZ,
  date_fin         TIMESTAMPTZ,
  cree_le          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : messages
-- Messagerie interne entre utilisateurs
-- =============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  expediteur_id   UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  contenu         TEXT NOT NULL,
  reponse_a_id    UUID REFERENCES messages(id) ON DELETE SET NULL,
  lu              BOOLEAN NOT NULL DEFAULT false,
  est_modifie     BOOLEAN NOT NULL DEFAULT false,
  edite_le        TIMESTAMPTZ,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : pieces_jointes_message
-- =============================================================
CREATE TABLE IF NOT EXISTS pieces_jointes_message (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id     UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  url_fichier    TEXT NOT NULL,
  type_fichier   TEXT NOT NULL,
  taille_fichier INTEGER NOT NULL
);

-- =============================================================
-- TABLE : notifications
-- Notifications in-app
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id   UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN (
    'nouveau_compte_en_attente',
    'compte_valide',
    'nouvelle_intervention',
    'intervention_assignee',
    'intervention_mise_a_jour',
    'demande_maintenance_creee',
    'demande_maintenance_planifiee',
    'demande_modification_creee',
    'demande_modification_approuvee',
    'demande_modification_rejetee',
    'nouveau_message'
  )),
  titre            TEXT NOT NULL,
  corps            TEXT NOT NULL,
  lien             TEXT,
  est_lu           BOOLEAN NOT NULL DEFAULT false,
  cree_le          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : journaux_audit
-- Journal d'audit global (admin / super_admin uniquement)
-- =============================================================
CREATE TABLE IF NOT EXISTS journaux_audit (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acteur_id    UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  role_acteur  TEXT,
  action       TEXT NOT NULL,
  type_entite  TEXT NOT NULL,
  entite_id    TEXT,
  details      JSONB NOT NULL DEFAULT '{}',
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE : parametres_application
-- Configuration globale éditable par super_admin
-- =============================================================
CREATE TABLE IF NOT EXISTS parametres_application (
  cle        TEXT PRIMARY KEY,
  valeur     JSONB NOT NULL DEFAULT '{}',
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEX
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_equipements_client        ON equipements(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client      ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_statut      ON interventions(statut);
CREATE INDEX IF NOT EXISTS idx_messages_conversation     ON messages(conversation_id, cree_le);
CREATE INDEX IF NOT EXISTS idx_notifications_utilisateur ON notifications(utilisateur_id, est_lu);
CREATE INDEX IF NOT EXISTS idx_affectations_technicien   ON affectations(technicien_id);
CREATE INDEX IF NOT EXISTS idx_affectations_client       ON affectations(client_id);
CREATE INDEX IF NOT EXISTS idx_journaux_audit_cree_le    ON journaux_audit(cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_journaux_audit_acteur     ON journaux_audit(acteur_id);
CREATE INDEX IF NOT EXISTS idx_journaux_audit_entite     ON journaux_audit(type_entite, entite_id);
CREATE INDEX IF NOT EXISTS idx_demandes_maintenance_client ON demandes_maintenance(client_id);
CREATE INDEX IF NOT EXISTS idx_demandes_modif_client     ON demandes_modification(client_id);
CREATE INDEX IF NOT EXISTS idx_contrats_client           ON contrats(client_id);

-- =============================================================
-- TRIGGERS — modifie_le automatique
-- =============================================================
CREATE OR REPLACE FUNCTION maj_modifie_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modifie_le = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utilisateurs_modifie_le
  BEFORE UPDATE ON utilisateurs FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_clients_modifie_le
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_contrats_modifie_le
  BEFORE UPDATE ON contrats FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_equipements_modifie_le
  BEFORE UPDATE ON equipements FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_interventions_modifie_le
  BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_demandes_maintenance_modifie_le
  BEFORE UPDATE ON demandes_maintenance FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_demandes_modification_modifie_le
  BEFORE UPDATE ON demandes_modification FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();
CREATE TRIGGER trg_parametres_modifie_le
  BEFORE UPDATE ON parametres_application FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE utilisateurs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE techniciens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_equipement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_modification  ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_maintenance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions_equipements ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions_techniciens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_intervention  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pieces_jointes_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE journaux_audit         ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements            ENABLE ROW LEVEL SECURITY;

-- Fonction helper : rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION mon_role()
RETURNS TEXT AS $$
  SELECT role FROM utilisateurs WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Contacts de messagerie selon le rôle (contourne la RLS util_select de façon contrôlée).
-- admin/super_admin : clients + techniciens valides.
-- technicien : admins seulement (pas super_admin) + entreprises liées à une intervention active assignée.
-- client : admins seulement (pas super_admin) + techniciens affectés à une intervention active.
CREATE OR REPLACE FUNCTION mes_contacts_messagerie()
RETURNS TABLE(id uuid, nom text, prenom text, role text, email text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
  caller_id   uuid;
BEGIN
  caller_id   := auth.uid();
  caller_role := mon_role();

  IF caller_role IN ('admin', 'super_admin') THEN
    RETURN QUERY
      SELECT u.id, u.nom, u.prenom, u.role::text, u.email
      FROM utilisateurs u
      WHERE u.role IN ('client', 'technicien')
        AND u.est_actif = true
        AND u.compte_valide = true
        AND u.id <> caller_id;

  ELSIF caller_role = 'technicien' THEN
    RETURN QUERY
      SELECT u.id, u.nom, u.prenom, u.role::text, u.email
      FROM utilisateurs u
      WHERE u.role = 'admin'
        AND u.est_actif = true
        AND u.compte_valide = true
      UNION
      SELECT DISTINCT u.id, u.nom, u.prenom, u.role::text, u.email
      FROM utilisateurs u
      JOIN clients c ON c.utilisateur_id = u.id
      JOIN interventions i ON i.client_id = c.id
      JOIN interventions_techniciens it ON it.intervention_id = i.id
      JOIN techniciens t ON t.utilisateur_id = caller_id AND t.id = it.technicien_id
      WHERE u.role = 'client'
        AND i.statut NOT IN ('signee', 'annulee')
        AND u.est_actif = true;

  ELSIF caller_role = 'client' THEN
    RETURN QUERY
      SELECT u.id, u.nom, u.prenom, u.role::text, u.email
      FROM utilisateurs u
      WHERE u.role = 'admin'
        AND u.est_actif = true
        AND u.compte_valide = true
      UNION
      SELECT DISTINCT u.id, u.nom, u.prenom, u.role::text, u.email
      FROM utilisateurs u
      JOIN techniciens t ON t.utilisateur_id = u.id
      JOIN interventions_techniciens it ON it.technicien_id = t.id
      JOIN interventions i ON i.id = it.intervention_id
      JOIN clients cl ON cl.id = i.client_id AND cl.utilisateur_id = caller_id
      WHERE u.role = 'technicien'
        AND i.statut NOT IN ('signee', 'annulee')
        AND u.est_actif = true;

  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION mes_contacts_messagerie() TO authenticated;

-- ----- utilisateurs -----
CREATE POLICY "util_select" ON utilisateurs FOR SELECT USING (
  id = auth.uid() OR mon_role() IN ('admin', 'super_admin')
);
CREATE POLICY "util_update_own" ON utilisateurs FOR UPDATE USING (id = auth.uid());
CREATE POLICY "util_admin_all"  ON utilisateurs FOR ALL   USING (mon_role() IN ('admin', 'super_admin'));

-- ----- abonnements : lecture publique, écriture super_admin -----
CREATE POLICY "abo_select" ON abonnements FOR SELECT USING (true);
CREATE POLICY "abo_admin"  ON abonnements FOR ALL   USING (mon_role() = 'super_admin');

-- ----- clients -----
CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin') OR utilisateur_id = auth.uid()
);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  mon_role() IN ('admin', 'super_admin')
);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  mon_role() IN ('admin', 'super_admin') OR utilisateur_id = auth.uid()
);

-- ----- techniciens -----
CREATE POLICY "tech_select" ON techniciens FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin') OR utilisateur_id = auth.uid()
);
CREATE POLICY "tech_insert" ON techniciens FOR INSERT WITH CHECK (
  mon_role() IN ('admin', 'super_admin')
);
CREATE POLICY "tech_update" ON techniciens FOR UPDATE USING (
  mon_role() IN ('admin', 'super_admin') OR utilisateur_id = auth.uid()
);

-- ----- contrats -----
CREATE POLICY "contrats_select" ON contrats FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "contrats_admin" ON contrats FOR ALL USING (mon_role() IN ('admin', 'super_admin'));

-- ----- affectations -----
CREATE POLICY "affect_select" ON affectations FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR technicien_id IN (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "affect_admin" ON affectations FOR ALL USING (mon_role() IN ('admin', 'super_admin'));

-- ----- equipements -----
CREATE POLICY "equip_select" ON equipements FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
  OR client_id IN (
    SELECT client_id FROM affectations
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);
CREATE POLICY "equip_insert" ON equipements FOR INSERT WITH CHECK (
  mon_role() IN ('admin', 'super_admin', 'client')
);
CREATE POLICY "equip_update" ON equipements FOR UPDATE USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);

-- ----- documents_equipement -----
CREATE POLICY "docs_equip_select" ON documents_equipement FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR equipement_id IN (
    SELECT id FROM equipements WHERE client_id IN (
      SELECT id FROM clients WHERE utilisateur_id = auth.uid()
    )
  )
);
CREATE POLICY "docs_equip_insert" ON documents_equipement FOR INSERT WITH CHECK (
  mon_role() IN ('admin', 'super_admin')
  OR equipement_id IN (
    SELECT id FROM equipements WHERE client_id IN (
      SELECT id FROM clients WHERE utilisateur_id = auth.uid()
    )
  )
);

-- ----- demandes_modification -----
CREATE POLICY "dmd_modif_insert" ON demandes_modification FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "dmd_modif_select" ON demandes_modification FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "dmd_modif_update" ON demandes_modification FOR UPDATE USING (
  mon_role() IN ('admin', 'super_admin')
);

-- ----- demandes_maintenance -----
CREATE POLICY "dmd_maint_insert" ON demandes_maintenance FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "dmd_maint_select" ON demandes_maintenance FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
);
CREATE POLICY "dmd_maint_update" ON demandes_maintenance FOR UPDATE USING (
  mon_role() IN ('admin', 'super_admin')
);

-- ----- interventions -----
CREATE POLICY "interv_select" ON interventions FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
  OR id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);
CREATE POLICY "interv_all" ON interventions FOR ALL USING (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
  OR id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
) WITH CHECK (
  mon_role() IN ('admin', 'super_admin')
  OR client_id IN (SELECT id FROM clients WHERE utilisateur_id = auth.uid())
  OR id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);

-- ----- interventions_equipements -----
CREATE POLICY "interv_equip_select" ON interventions_equipements FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR intervention_id IN (SELECT id FROM interventions WHERE client_id IN (
    SELECT id FROM clients WHERE utilisateur_id = auth.uid()
  ))
  OR intervention_id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);
CREATE POLICY "interv_equip_admin" ON interventions_equipements FOR ALL USING (
  mon_role() IN ('admin', 'super_admin')
);

-- ----- interventions_techniciens -----
CREATE POLICY "interv_tech_select" ON interventions_techniciens FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  OR intervention_id IN (SELECT id FROM interventions WHERE client_id IN (
    SELECT id FROM clients WHERE utilisateur_id = auth.uid()
  ))
);
CREATE POLICY "interv_tech_admin" ON interventions_techniciens FOR ALL USING (
  mon_role() IN ('admin', 'super_admin')
);

-- ----- rapports_intervention -----
CREATE POLICY "rapport_select" ON rapports_intervention FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
  OR intervention_id IN (SELECT id FROM interventions WHERE client_id IN (
    SELECT id FROM clients WHERE utilisateur_id = auth.uid()
  ))
  OR intervention_id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);
CREATE POLICY "rapport_all" ON rapports_intervention FOR ALL USING (
  mon_role() IN ('admin', 'super_admin')
  OR intervention_id IN (
    SELECT intervention_id FROM interventions_techniciens
      WHERE technicien_id = (SELECT id FROM techniciens WHERE utilisateur_id = auth.uid())
  )
);

-- ----- messages -----
CREATE POLICY "msg_own" ON messages FOR ALL USING (
  expediteur_id = auth.uid()
  OR conversation_id LIKE '%' || auth.uid()::TEXT || '%'
);

-- ----- pieces_jointes_message -----
CREATE POLICY "pj_select" ON pieces_jointes_message FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages WHERE
      expediteur_id = auth.uid()
      OR conversation_id LIKE '%' || auth.uid()::TEXT || '%'
  )
);

-- ----- notifications -----
CREATE POLICY "notif_own" ON notifications FOR ALL USING (utilisateur_id = auth.uid());

-- ----- journaux_audit -----
CREATE POLICY "audit_insert" ON journaux_audit FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_select" ON journaux_audit FOR SELECT USING (
  mon_role() IN ('admin', 'super_admin')
);

-- ----- parametres_application -----
CREATE POLICY "params_select" ON parametres_application FOR SELECT USING (true);
CREATE POLICY "params_write"  ON parametres_application FOR ALL USING (
  mon_role() = 'super_admin'
) WITH CHECK (mon_role() = 'super_admin');

-- =============================================================
-- TRIGGERS D'AUDIT
-- =============================================================
CREATE OR REPLACE FUNCTION ecrire_journal_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_acteur UUID := auth.uid();
  v_role TEXT;
  v_entite_id TEXT;
  v_action TEXT;
  v_avant JSONB := '{}';
  v_apres JSONB := '{}';
BEGIN
  IF v_acteur IS NOT NULL THEN
    SELECT role INTO v_role FROM utilisateurs WHERE id = v_acteur;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_entite_id := (to_jsonb(NEW)->>'id');
    v_action    := TG_TABLE_NAME || '.creation';
    v_apres     := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_entite_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'));
    v_action    := TG_TABLE_NAME || '.modification';
    v_avant     := to_jsonb(OLD);
    v_apres     := to_jsonb(NEW);
  ELSE
    v_entite_id := (to_jsonb(OLD)->>'id');
    v_action    := TG_TABLE_NAME || '.suppression';
    v_avant     := to_jsonb(OLD);
  END IF;

  INSERT INTO journaux_audit (acteur_id, role_acteur, action, type_entite, entite_id, details)
  VALUES (
    v_acteur, v_role, v_action, TG_TABLE_NAME, v_entite_id,
    jsonb_build_object('operation', TG_OP, 'avant', v_avant, 'apres', v_apres)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_utilisateurs         ON utilisateurs;
DROP TRIGGER IF EXISTS trg_audit_clients              ON clients;
DROP TRIGGER IF EXISTS trg_audit_contrats             ON contrats;
DROP TRIGGER IF EXISTS trg_audit_techniciens          ON techniciens;
DROP TRIGGER IF EXISTS trg_audit_affectations         ON affectations;
DROP TRIGGER IF EXISTS trg_audit_equipements          ON equipements;
DROP TRIGGER IF EXISTS trg_audit_demandes_modif       ON demandes_modification;
DROP TRIGGER IF EXISTS trg_audit_demandes_maint       ON demandes_maintenance;
DROP TRIGGER IF EXISTS trg_audit_documents_equip      ON documents_equipement;
DROP TRIGGER IF EXISTS trg_audit_interventions        ON interventions;
DROP TRIGGER IF EXISTS trg_audit_rapports             ON rapports_intervention;
DROP TRIGGER IF EXISTS trg_audit_messages             ON messages;
DROP TRIGGER IF EXISTS trg_audit_notifications        ON notifications;
DROP TRIGGER IF EXISTS trg_audit_parametres           ON parametres_application;

CREATE TRIGGER trg_audit_utilisateurs
  AFTER INSERT OR UPDATE OR DELETE ON utilisateurs FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_contrats
  AFTER INSERT OR UPDATE OR DELETE ON contrats FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_techniciens
  AFTER INSERT OR UPDATE OR DELETE ON techniciens FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_affectations
  AFTER INSERT OR UPDATE OR DELETE ON affectations FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_equipements
  AFTER INSERT OR UPDATE OR DELETE ON equipements FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_demandes_modif
  AFTER INSERT OR UPDATE OR DELETE ON demandes_modification FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_demandes_maint
  AFTER INSERT OR UPDATE OR DELETE ON demandes_maintenance FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_documents_equip
  AFTER INSERT OR UPDATE OR DELETE ON documents_equipement FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_interventions
  AFTER INSERT OR UPDATE OR DELETE ON interventions FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_rapports
  AFTER INSERT OR UPDATE OR DELETE ON rapports_intervention FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON notifications FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();
CREATE TRIGGER trg_audit_parametres
  AFTER INSERT OR UPDATE OR DELETE ON parametres_application FOR EACH ROW EXECUTE FUNCTION ecrire_journal_audit();

-- =============================================================
-- COMPTE SUPER_ADMIN INITIAL
-- Après avoir créé le compte dans Auth > Users, remplace l'UUID
-- =============================================================
-- INSERT INTO utilisateurs (id, email, nom, role, compte_valide, est_actif)
-- VALUES ('REMPLACER_PAR_UUID', 'superadmin@skyran.bj', 'Super Admin', 'super_admin', true, true);
