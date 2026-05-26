# IT-Access V2 — Audit + Documentation Fonctionnelle et Technique

## 1) Audit actuel de l'application (avant push)

### État global
- L'application compile correctement (`TypeScript` OK).
- Les modules cœur sont présents et branchés: authentification, rôles, dashboards, équipements, interventions, contrats, messagerie, notifications.
- Les derniers correctifs sur interventions (affichage technicien + signature client) et import IA ont été intégrés.

### Vérifications réalisées
- `git status -sb` : OK (branche `main`, fichiers modifiés en cours de test).
- `node node_modules/typescript/lib/tsc.js -b --noEmit` : OK, aucune erreur de compilation.

### Points d'attention restants (non bloquants fonctionnels)
1. `npm run lint` échoue dans cet environnement à cause d'une permission binaire locale (`eslint: Permission denied`), pas d'une erreur logique du code.
2. `LICENSE` apparaît modifié surtout à cause des fins de ligne (CRLF/LF), à nettoyer avant push si besoin.
3. `README.md` est encore un README template Vite et ne reflète pas le produit IT-Access.

---

## ÉTAPE 0 — REFORMULATION DU THÈME
En termes simples, **IT-Access** est une plateforme web qui permet à une société de maintenance informatique de:
- centraliser son parc d'équipements clients,
- gérer les pannes et interventions de bout en bout,
- suivre les techniciens affectés,
- signer et archiver les comptes-rendus,
- piloter l'activité avec des tableaux de bord.

Objectif principal: remplacer Excel/cahiers/WhatsApp par un système unique, traçable et exploitable.

---

## ÉTAPE 1 — LECTURE DU THÈME
Le thème officiel de notre travail est le suivant :
> Digitaliser et industrialiser la gestion des interventions de maintenance informatique pour améliorer la traçabilité, la qualité de service et le pilotage opérationnel.

Ce thème s'articule autour de:
- la structuration des données (clients, techniciens, équipements, interventions),
- la coordination des acteurs (admin, technicien, entreprise cliente),
- la preuve d'exécution (rapport, signature, PDF),
- l'exploitation métier (KPI, alertes, suivi de contrats),
- la réduction des délais et litiges.

---

## ÉTAPE 2 — OBJECTIFS OPÉRATIONNELS
- Réduire le temps de traitement d'une panne.
- Rendre l'historique d'un équipement immédiatement consultable.
- Garantir la preuve d'intervention via signature client et PDF.
- Donner une vision en temps réel aux admins/sudo.
- Encadrer les accès par rôle (sécurité, isolation des espaces).

---

## ÉTAPE 3 — PROBLÉMATIQUE (PROBLÈMES, DIFFICULTÉS, DÉFIS, ÉTAT DE L'ART)

### Le problème constaté
Au Bénin comme dans toute l'Afrique de l'Ouest, les prestataires de services informatiques gèrent encore leurs interventions avec des outils très rudimentaires :
- Fichiers Excel non partagés,
- Cahiers papier,
- WhatsApp pour les ordres de mission et retours.

### Les conséquences directes
1. **Pertes d'historique**: les données sont dispersées.
2. **Conflits clients**: absence de preuve formelle horodatée.
3. **Pilotage faible**: pas de KPIs consolidés pour décider.

### État de l'art — Ce qui existe déjà
- Outils génériques (tableurs, messageries): simples mais non structurés.
- GMAO/CMMS du marché: souvent coûteux, complexes, peu adaptés localement.
- Besoin local: solution pragmatique, mobile-friendly, rapide à adopter.

---

## ÉTAPE 4 — NOTRE SOLUTION (PRÉSENTATION ET JUSTIFICATIF)

### Présentation
IT-Access V2 est une application web de maintenance IT, multi-rôles, avec back-end Supabase.

### Les profils d'utilisateurs
- `sudo`: supervision globale, administration étendue.
- `admin`: gestion opérationnelle (utilisateurs, interventions, équipements, contrats).
- `technicien`: exécution terrain (prendre mission, rapport, clôture).
- `entreprise`: signaler panne, suivre interventions, signer clôture.

### Pourquoi ces choix technologiques
- `React + Vite + TypeScript`: rapidité, lisibilité, maintenabilité.
- `Supabase`: Auth + Postgres + Realtime + Storage, stack unifiée.
- `React Query`: cache, invalidation, synchronisation des données.
- `Zustand`: état global léger (session, UI).
- `Tailwind CSS`: UI rapide et cohérente.
- `jsPDF + signature canvas`: preuve métier (rapport signé).
- `Groq SDK`: extraction semi-automatique d'équipements.

### Périmètre du projet
Inclus:
- Authentification et contrôle d'accès par rôle,
- gestion du parc,
- interventions complètes,
- contrats,
- messagerie,
- notifications,
- dashboards.

Hors périmètre actuel (à envisager):
- appli mobile native,
- facturation complète,
- gestion SLA avancée,
- BI externe.

---

## ÉTAPE 5 — DÉMARCHE (ÉTAPES, ANALYSE, CHOIX)
1. Modéliser les rôles et flux métiers.
2. Concevoir le schéma SQL Supabase.
3. Construire l'authentification et les routes protégées.
4. Développer les modules métier (équipements -> interventions -> contrats).
5. Ajouter notifications et vues dashboard.
6. Ajouter les preuves (signature, PDF).
7. Corriger par tests terrain (cas réels).

Choix clé:
- Prioriser le flux intervention comme colonne vertébrale de l'app.

---

## ÉTAPE 6 — NIVEAU DE RÉALISATION
Niveau actuel: **MVP avancé quasi complet**.

Ce qui est réalisé:
- Modules principaux en production de test.
- Flux critiques utilisables de bout en bout.
- Correctifs récents sur interventions et import IA.

Ce qui reste avant push final:
- finaliser tests manuels multi-rôles,
- nettoyer points qualité (README/lint/line endings),
- valider scénarios de non-régression.

---

## ÉTAPE 7 — RÉSULTATS ET VALIDATION
Résultats observés:
- Le cycle panne -> intervention -> signature -> PDF fonctionne.
- Les techniciens reçoivent et voient les interventions selon affectation.
- Les dashboards agrègent les états clés (actives, critiques, etc.).

Validation conseillée avant release:
1. Cas entreprise: signalement panne depuis passeport.
2. Cas technicien: démarrer, rapporter, clôturer.
3. Cas entreprise: signer avec code, vérifier PDF.
4. Cas admin: annuler, suivre, filtrer.
5. Cas sudo: supervision multi-entreprises.

---

## MOT DE FIN
IT-Access apporte une base solide, adaptée au terrain, pour professionnaliser la maintenance IT: traçabilité, preuve, pilotage, et coordination.

---

## 2) Flow global de l'application

### Flux principal intervention
1. Entreprise signale une panne (sur un équipement).
2. Intervention créée (`status=active`).
3. Techniciens affectés reçoivent notification et voient la mission.
4. Technicien démarre (`en_cours`), rédige rapport + photos.
5. Technicien clôture (`en_attente_validation`).
6. Entreprise valide avec code + signature.
7. Système clôture (`cloturee`) + génère PDF + archive.

### Flux admin
- Crée/filtre interventions,
- assigne techniciens,
- suit urgences,
- annule si nécessaire,
- gère utilisateurs/affectations.

### Flux sudo
- Vision globale (comptes, entreprises, interventions, équipements),
- actions transverses de gouvernance.

---

## 3) Stack technique

### Frontend
- React 19
- React Router 7
- TypeScript 5
- Vite 8
- Tailwind CSS
- React Query
- Zustand
- Lucide Icons

### Backend (BaaS)
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime
- Supabase Storage

### Librairies métier
- `react-signature-canvas` (signature client)
- `jspdf` (génération PDF)
- `qrcode` (QR équipements)
- `groq-sdk` (import IA)

---

## 4) Architecture dossier (vue pratique)

- `src/app`: bootstrap app, providers, routing.
- `src/components/layout`: layouts par rôle.
- `src/components/shared`: composants transverses (guards, loading, notfound, notifications).
- `src/features/auth`: login/register/reset/sudo login.
- `src/features/dashboard`: dashboards par rôle.
- `src/features/equipment`: formulaire, import IA, pages parc/passeport/admin/scan.
- `src/features/interventions`: hooks CRUD, liste admin/tech/entreprise, détail + signature.
- `src/features/contracts`: gestion contrats.
- `src/features/messaging`: messagerie.
- `src/features/users`: profil et gestion utilisateurs.
- `src/features/sudo`: vues dédiées sudo.
- `src/lib/supabase`: client + types DB.
- `src/stores`: état global (auth/ui).
- `supabase/schema.sql`: schéma SQL complet.

---

## 5) Routes/pages par rôle

### Public
- `/connexion`
- `/inscription`
- `/mot-de-passe-oublie`
- `/reinitialiser-mot-de-passe`
- `/sudo` (login secret)

### Sudo
- `/sudo/dashboard`
- `/sudo/utilisateurs`
- `/sudo/interventions`
- `/sudo/interventions/:id`
- `/sudo/equipements`
- `/sudo/equipements/:id`
- `/sudo/profil`

### Admin
- `/admin/dashboard`
- `/admin/utilisateurs`
- `/admin/equipements`
- `/admin/equipements/:id`
- `/admin/interventions`
- `/admin/interventions/:id`
- `/admin/contrats`
- `/admin/messagerie`
- `/admin/profil`

### Technicien
- `/technicien/dashboard`
- `/technicien/interventions`
- `/technicien/interventions/:id`
- `/technicien/scanner`
- `/technicien/equipement/:id`
- `/technicien/messagerie`
- `/technicien/profil`

### Entreprise
- `/entreprise/dashboard`
- `/entreprise/parc`
- `/entreprise/parc/:id`
- `/entreprise/interventions`
- `/entreprise/interventions/:id`
- `/entreprise/messagerie`
- `/entreprise/profil`

---

## 6) Base de données — tables et rôles métier

Tables principales:
- `profiles`: identité + rôle + validation.
- `companies`: données entreprise + code validation.
- `technicians`: extension profil technicien.
- `assignments`: lien technicien <-> entreprise.
- `contracts`: plan de maintenance.
- `equipment`: parc d'équipements.
- `equipment_documents`: docs des équipements.
- `interventions`: cœur métier.
- `intervention_reopens`: historique de réouverture.
- `messages` + `message_attachments`: messagerie.
- `notifications`: alertes in-app.

Champs critiques:
- `interventions.technician_ids UUID[]`: affectation mission.
- `interventions.status`: `active | en_cours | en_attente_validation | cloturee | annulee`.
- `companies.validation_code`: sécurité validation client.

---

## 7) Documentation technique pour recoder depuis zéro (binôme débutant)

## Phase A — Préparation
1. Installer Node LTS et npm.
2. Créer projet Vite React TS.
3. Installer dépendances de `package.json`.
4. Créer projet Supabase.
5. Renseigner `.env.local` avec URL + anon key + Groq key.

## Phase B — Base de données (Back)
1. Ouvrir Supabase SQL Editor.
2. Exécuter `supabase/schema.sql` en entier.
3. Vérifier que les tables sont créées.
4. Ajouter policies RLS selon rôles (si non déjà scriptées).

## Phase C — Auth et session
1. Configurer client Supabase (`src/lib/supabase/client.ts`).
2. Créer store auth Zustand (`src/stores/auth.store.ts`).
3. Construire pages login/register/reset.
4. Ajouter `ProtectedRoute` avec redirection par rôle.

## Phase D — Routing
1. Créer `src/app/router.tsx`.
2. Définir toutes les routes publiques et privées.
3. Créer layouts par rôle (admin, tech, entreprise, sudo).

## Phase E — Modules métier
1. Équipements
- CRUD équipements,
- passeport équipement,
- QR code,
- import IA (preview + sélection + import).

2. Interventions
- création intervention,
- vue liste par rôle,
- vue détail,
- transitions de statut,
- rapport technicien,
- signature client + PDF.

3. Utilisateurs / Affectations
- validation comptes,
- assignation techniciens aux entreprises.

4. Contrats
- plan actif par entreprise,
- quotas et visibilité.

5. Messagerie + Notifications
- stockage messages,
- alertes in-app selon événements.

## Phase F — Qualité
1. Mettre TypeScript strict.
2. Mettre stratégie React Query (`invalidateQueries` ciblés).
3. Ajouter gestion d'erreurs visibles dans UI.
4. Ajouter tests manuels scénario par scénario.

## Répartition conseillée du binôme (frontend + backend ensemble)
Hypothèse: vous travaillez tous les deux sur le front et le back, avec co-responsabilité.

### Principe d'organisation
- Chaque lot métier est traité en **duo** : UI (pages/composants) + logique data (requêtes, mutations, RLS/policies) dans le même sprint.
- Une personne mène le lot, l'autre challenge et valide (pair review), puis vous inversez au lot suivant.
- Objectif: éviter le silo "front d'un côté / back de l'autre" et garantir la compréhension complète du produit par les deux membres.

### Répartition opérationnelle proposée
1. **Lot Auth + Rôles**
- Lead A: pages login/register/reset + guards/routes.
- Lead B: profils, règles de validation, tests de redirection par rôle.
- Livrable commun: parcours complet non connecté -> connecté, sans faille d'accès.

2. **Lot Équipements + Passeport**
- Lead B: schéma/queries équipements, documents, QR.
- Lead A: UI liste + passeport + formulaires.
- Livrable commun: CRUD opérationnel et passeport lisible multi-rôles.

3. **Lot Interventions (cœur métier)**
- Lead A: écrans listes/détail, transitions de statut, UX des actions.
- Lead B: mutations, notifications, règles métier, audit.
- Livrable commun: cycle panne -> clôture -> signature -> preuve PDF.

4. **Lot Contrats + Pricing**
- Lead B: logique contrat annuel, quotas, cohérence DB.
- Lead A: interfaces pricing (landing + sudo config + confirmation inscription).
- Livrable commun: formule choisie, quotas appliqués, affichage synchronisé.

5. **Lot Dashboards + Reporting**
- Lead A: visuels, composants graphiques, ergonomie.
- Lead B: agrégations KPI, cohérence des données, performance requêtes.
- Livrable commun: dashboards fiables pour sudo/admin/technicien/entreprise.

### Règles de collaboration (très recommandées)
- Travailler par branches courtes et commits thématiques.
- Faire une revue croisée obligatoire avant merge.
- Utiliser une checklist commune par lot:
  1. UI validée
  2. requêtes/mutations validées
  3. règles rôle/RLS validées
  4. test manuel scénario réel validé

### Justification de ce mode
- Les deux membres montent en compétence sur l'architecture complète.
- Les bugs "front/back désalignés" baissent fortement.
- La maintenance après soutenance est plus simple car la connaissance est partagée.

---

## 8) Détail des modules/fichiers importants

### Auth & Guard
- `src/stores/auth.store.ts`: profil, rôle, loading.
- `src/components/shared/ProtectedRoute.tsx`: contrôle accès.
- `src/components/shared/RootRedirect.tsx`: redirection selon rôle.

### Interventions
- `src/features/interventions/hooks/useInterventions.ts`: requêtes/mutations principales.
- `src/features/interventions/pages/InterventionsAdminPage.tsx`: supervision admin.
- `src/features/interventions/pages/InterventionsTechPage.tsx`: missions tech.
- `src/features/interventions/pages/InterventionsEntreprisePage.tsx`: suivi client.
- `src/features/interventions/pages/InterventionDetailPage.tsx`: exécution + signature + PDF.

### Équipements
- `src/features/equipment/hooks/useEquipment.ts`: CRUD et listes.
- `src/features/equipment/pages/EquipmentAdminPage.tsx`: gestion globale.
- `src/features/equipment/pages/ParcPage.tsx`: parc entreprise.
- `src/features/equipment/pages/EquipmentPassportPage.tsx`: fiche détaillée + signalement panne.
- `src/features/equipment/components/BulkImportModal.tsx`: extraction IA import.

### Dashboard
- `src/features/dashboard/pages/*`: KPIs par rôle.

### Infra
- `src/lib/supabase/database.types.ts`: typage DB généré.
- `supabase/schema.sql`: vérité du modèle de données.

---

## 9) Ce qui a été fait dans ce projet (résumé chrono)
1. Initialisation app + structure + schéma DB.
2. Auth multi-rôles + protections routes.
3. Module admin utilisateurs.
4. Module équipements complet (CRUD, passeport, QR).
5. Module interventions complet (cycle de vie, preuve).
6. Dashboards et messagerie.
7. Espace sudo dédié.
8. Correctifs qualité data-fetch/error handling.
9. Correctifs ciblés:
- affichage interventions technicien auto-assignées,
- crash signature client,
- import IA Groq anti-hallucination.

---

## 10) Check-list avant push définitif
1. Revalider les 4 rôles sur environnement local.
2. Vérifier RLS/policies sur les routes sensibles.
3. Exécuter `build` + `typecheck`.
4. Corriger le souci local `eslint permission` pour relancer `lint`.
5. Mettre à jour `README.md` avec ce document résumé.
6. Nettoyer diff `LICENSE` si non voulu.
