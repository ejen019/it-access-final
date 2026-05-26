# 03 - Backend binome par binome

## Regle de lecture
- Le backend a reproduire est dans `supabase/schema.sql` plus les Edge Functions appelees par le frontend.
- Certaines logiques sont dans le schema, d autres dans le code client qui appelle Supabase. Les deux sont a reproduire ensemble.
- L ordre ci-dessous suit la mise en place technique minimale avant les modules metier.

## 1. Noyau de donnees

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer dans Supabase | Binôme |
|---|---|---|---|---|---|---|
| 1 | `auth.users` | Auth gérée par Supabase | Intermédiaire | Comprendre Supabase Auth | Creer les comptes de test via Auth, puis lier les profils metier | A |
| 2 | `profiles` | Profil applicatif de chaque utilisateur | Avancé | FK vers `auth.users`, contraintes, role, validation | Recréer la table, les colonnes, la contrainte role et les champs `is_active` / `is_validated` | A |
| 3 | `companies` | Fiche entreprise connectee | Avancé | FK `profiles`, unique, default SQL | Recréer la table avec `validation_code`, `contract_id` et les liens de compte | B |
| 4 | `technicians` | Extension metier du profil technicien | Intermédiaire | FK `profiles`, un technicien = un compte | Recréer la table et la relation 1-1 avec `profiles` | B |
| 5 | `assignments` | Liaison technicien -> entreprise | Avancé | FK multiples, unique composite | Recréer la table d affectation et la contrainte d unicite technicien/entreprise | B |
| 6 | `contracts` | Abonnement d une entreprise | Avancé | Dates, checks, FK vers `companies` | Recréer la table avec les plans, quotas, dates et activation | A |
| 7 | `equipment` | Parc de materiels | Avancé | FK `companies`, array text, checks statut | Recréer la table, les photos, le QR code et le created_by | B |
| 8 | `equipment_documents` | Pieces jointes d un equipement | Intermédiaire | FK `equipment`, Storage public | Recréer la table des documents et ses metadonnees | B |
| 9 | `interventions` | Cycle de maintenance principal | Avancé | Array UUID, timestamps, checks statut/urgence | Recréer la table avec equipment_ids, technician_ids, rapport, signature, PDF, dates de cycle | B |
| 10 | `intervention_reopens` | Historique des reouvertures | Intermédiaire | FK `interventions`, FK `profiles` | Recréer la table d historique avec la raison obligatoire | A |
| 11 | `messages` | Messagerie interne | Avancé | conversation_id, reply_to_id, FK `profiles` | Recréer la table de chat 1-to-1 et la logique de conversation | B |
| 12 | `message_attachments` | Pieces jointes aux messages | Intermédiaire | FK `messages`, Storage | Recréer la table des pieces jointes et ses limites de taille/type | B |
| 13 | `notifications` | Notifications in-app | Avancé | Types enum-like, FK `profiles` | Recréer la table des notifications, lecture/etat lu, liens de redirection | A |
| 14 | `audit_logs` | Journal de trace globale | Avancé | JSONB, FK nullable, index chronologique | Recréer la table de log, exploitable par admin/sudo | A |
| 15 | `app_settings` | Configuration publique de la vitrine | Intermédiaire | JSONB, key primaire | Recréer la table de parametres globaux `public_config` | B |

## 2. Fonctions SQL et triggers

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer dans Supabase | Binôme |
|---|---|---|---|---|---|---|
| 16 | `update_updated_at()` | Met a jour automatiquement `updated_at` | Intermédiaire | PL/pgSQL, triggers BEFORE UPDATE | Recréer la fonction et l appliquer aux tables concernées | A |
| 17 | Triggers `trg_*_updated_at` | Autonomie des timestamps | Intermédiaire | Comprendre `BEFORE UPDATE` | Recréer les triggers pour `profiles`, `companies`, `contracts`, `equipment`, `interventions` | A |
| 18 | `get_my_role()` | Helper RLS de role courant | Avancé | `auth.uid()`, `SECURITY DEFINER`, `STABLE` | Recréer la fonction helper pour simplifier les policies | A |
| 19 | `write_audit_log()` | Ecrit automatiquement dans `audit_logs` | Avancé | `TG_OP`, `to_jsonb`, trigger `AFTER` | Recréer la fonction d audit automatique sur insert/update/delete | A |
| 20 | Triggers d audit sur tables metier | Trace toutes les mutations | Avancé | Triggers `AFTER INSERT OR UPDATE OR DELETE` | Recréer tous les triggers d audit listés dans le schema | A |

## 3. Row Level Security

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer dans Supabase | Binôme |
|---|---|---|---|---|---|---|
| 21 | RLS `profiles` | Lecture/edition du profil courant et administration | Avancé | RLS, `auth.uid()`, helper role | Recréer les policies de lecture, update own et admin/sudo all | A |
| 22 | RLS `notifications` | Lecture des notifs du compte courant | Intermédiaire | `user_id = auth.uid()` | Recréer la policy qui limite tout au user proprietaire | A |
| 23 | RLS `messages` | Lecture/ecriture des conversations | Avancé | conversation_id, sender_id, chaines id | Recréer la policy qui autorise expéditeur et destinataire | B |
| 24 | RLS `equipment` | Parc visible selon role et affectation | Avancé | Sous-requetes `companies`, `assignments`, `technicians` | Recréer les policies select/insert/update du parc | B |
| 25 | RLS `interventions` | Visibilite selon role et affectation | Avancé | Meme logique que `equipment` | Recréer les policies de lecture et d ecriture du workflow intervention | B |
| 26 | RLS `contracts` | Lecture entreprise, gestion admin/sudo | Avancé | Sous-requete company owner | Recréer les policies select et all admin | A |
| 27 | RLS `audit_logs` | Lecture admin/sudo seulement | Intermédiaire | RLS + role helper | Recréer la policy d insertion auth et la policy select admin/sudo | A |
| 28 | RLS `app_settings` | Lecture publique, ecriture sudo | Avancé | Lecture ouverte, ecriture role strict | Recréer les policies read all / write sudo | B |
| 29 | RLS `technicians`, `assignments`, `equipment_documents`, `intervention_reopens`, `message_attachments` | Protection des tables annexes | Avancé | FK et RLS sur tables reliees | Recréer l activation RLS et verifier l acces via les relations | B |

## 4. Index

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer dans Supabase | Binôme |
|---|---|---|---|---|---|---|
| 30 | `idx_equipment_company` | Accelere les listes parc | Débutant | `CREATE INDEX` | Recréer l index sur `equipment(company_id)` | B |
| 31 | `idx_interventions_company` | Accelere les listes interventions | Débutant | `CREATE INDEX` | Recréer l index sur `interventions(company_id)` | B |
| 32 | `idx_interventions_status` | Filtrage status | Débutant | `CREATE INDEX` | Recréer l index sur `interventions(status)` | B |
| 33 | `idx_messages_conversation` | Lecture chat temps reel | Débutant | `CREATE INDEX` sur conversation + date | Recréer l index composite sur `messages(conversation_id, created_at)` | B |
| 34 | `idx_notifications_user` | Liste notifications | Débutant | `CREATE INDEX` | Recréer l index sur `notifications(user_id, is_read)` | A |
| 35 | `idx_assignments_tech` | Recherche affectations technicien | Débutant | `CREATE INDEX` | Recréer l index sur `assignments(technician_id)` | B |
| 36 | `idx_assignments_company` | Recherche affectations entreprise | Débutant | `CREATE INDEX` | Recréer l index sur `assignments(company_id)` | B |
| 37 | `idx_audit_logs_created_at` | Tri historique | Débutant | index DESC | Recréer l index tri chronologique sur `audit_logs` | A |
| 38 | `idx_audit_logs_actor_id` | Filtres sur auteur | Débutant | `CREATE INDEX` | Recréer l index sur `audit_logs(actor_id)` | A |
| 39 | `idx_audit_logs_entity` | Filtres entite | Débutant | index composite | Recréer l index sur `(entity_type, entity_id)` | A |
| 40 | `idx_app_settings_updated_at` | Tri config publique | Débutant | index DESC | Recréer l index sur `app_settings(updated_at DESC)` | B |

## 5. Storage

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer dans Supabase | Binôme |
|---|---|---|---|---|---|---|
| 41 | Bucket `it-access-file` | Stockage des photos, PDFs, signatures, pieces jointes | Avancé | Supabase Storage, politiques publiques/privées | Creer le bucket, le rendre compatible avec les uploads de l app et les URLs publiques | B |
| 42 | Dossiers logiques `equipment/`, `interventions/`, `signatures/`, `pdfs/` | Organisation des fichiers | Intermédiaire | Convention de nommage | Reproduire la structure de chemins utilisee par le frontend | B |

## 6. Edge Functions a recreer

| Ordre | Fonction | Role dans l app | Difficulté | Prérequis Supabase | Ce qu il faut recréer | Binôme |
|---|---|---|---|---|---|---|
| 43 | `register-user` | Cree compte + profile + entreprise ou technicien | Avancé | Edge Functions, service role, Auth admin | Refaire la fonction qui cree l utilisateur sans email de confirmation manuel | A |
| 44 | `create-admin` | Cree un administrateur depuis le sudo | Avancé | Service role, insert profiles | Refaire la fonction de creation admin visible dans `SudoDashboardPage` | A |
| 45 | `delete-user` | Supprime un utilisateur et cascade ses donnees | Avancé | Admin Auth delete, nettoyage cascade | Refaire la fonction appelee depuis `UsersPage` et `SudoUsersPage` | A |

## 7. Donnees initiales

| Ordre | Element backend | Role dans l app | Difficulté | Prérequis SQL/Supabase | Ce qu il faut recréer | Binôme |
|---|---|---|---|---|---|---|
| 46 | Seed sudo commenté dans `schema.sql` | Preparer 2 comptes sudo de test | Débutant | Creer les users dans Auth puis insérer les profils | Reprendre la logique de seed apres avoir récupéré les vrais UUID | A |

## 8. Ordre de mise en place conseille
1. Auth + `profiles` + policies de base.
2. `companies`, `technicians`, `assignments`, puis `contracts`.
3. `equipment` + Storage + `equipment_documents`.
4. `interventions` + `intervention_reopens` + notifications.
5. `messages` + `message_attachments`.
6. `audit_logs` + triggers d audit.
7. `app_settings` + bucket Storage + Edge Functions.

## 9. Points de vigilance
- Les policies doivent correspondre au comportement du frontend, sinon les ecrans vont se charger puis echouer silencieusement.
- Les fonctions Edge sont indispensables pour les flows d inscription et de suppression.
- Les fichiers uploades doivent etre publics ou au moins recuperables via `getPublicUrl`, sinon QR, photos et PDF seront cassés.
