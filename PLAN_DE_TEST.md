# Plan de test bout-en-bout — IT-Access

Objectif : valider toute l'application, de la création de chaque utilisateur
jusqu'au cycle complet d'une intervention signée.

Légende : ☐ à tester · ✅ OK · ❌ KO (noter l'erreur)

---

## 0. Prérequis (à faire UNE fois avant de tester)

| # | Action | Où | Vérif |
|---|--------|-----|-------|
| 0.1 | Schéma SQL appliqué | Supabase → SQL Editor | tables `utilisateurs`, `clients`… présentes |
| 0.2 | Migration anti-récursion RLS appliquée | déjà fait via MCP | fonctions `mes_clients`, `mon_technicien_id` présentes |
| 0.3 | Bucket Storage `it-access-fichiers` créé (public) | Supabase → Storage | bucket visible |
| 0.4 | Realtime activé | SQL Editor | `ALTER PUBLICATION supabase_realtime ADD TABLE messages, notifications, interventions, utilisateurs;` |
| 0.5 | Edge functions déployées | terminal | `supabase functions deploy register-user` / `create-admin` / `delete-user` |
| 0.6 | Abonnements seedés (starter/medium/premium) | SQL Editor | table `abonnements` non vide |
| 0.7 | Variables `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GROQ_API_KEY`) | `.env` | `npm run dev` démarre |

> Sans 0.5, l'inscription, la création d'admin et la suppression échoueront.
> Sans 0.3, les uploads (photos, signature PDF, import) échoueront.

### Seed abonnements (si besoin)
```sql
INSERT INTO abonnements (plan, montant, max_equipements, max_techniciens) VALUES
  ('starter', 50000, 10, 2),
  ('medium', 120000, 30, 5),
  ('premium', 250000, 100, 15);
```

---

## 1. Bootstrap du Super Admin (compte racine)

Il n'existe aucune UI pour créer le tout premier compte : on le crée à la main.

☐ **1.1** Supabase → Authentication → Users → *Add user* : email + mot de passe (Auto-confirm).
☐ **1.2** Copier l'UUID du user créé.
☐ **1.3** SQL Editor :
```sql
INSERT INTO utilisateurs (id, email, nom, prenom, role, compte_valide, est_actif)
VALUES ('<UUID>', 'super@itaccess.com', 'Root', 'Super', 'super_admin', true, true);
```
☐ **1.4** Aller sur `/sudo` → se connecter → arrive sur **/sudo/dashboard** sans erreur.
☐ **1.5** Vérifier : les 8 cartes de stats s'affichent (plus de « Impossible de charger les statistiques »).
☐ **1.6** Onglet **Historique** (`/sudo/historique`) → la table se charge (plus d'erreur `audit_logs`).

---

## 2. Création d'un Administrateur (par le Super Admin)

☐ **2.1** /sudo/dashboard → onglet **Administrateurs** → *Créer un admin* → prénom/nom/email/mot de passe (≥ 8 car.) → **Créer**.
☐ **2.2** L'admin apparaît dans la liste, statut **Actif**.
☐ **2.3** Se déconnecter, aller sur **/connexion**, se connecter avec le compte admin → arrive sur **/admin/dashboard**.
☐ **2.4** Tester le bouton *Désactiver / Activer* d'un admin depuis le Sudo.

---

## 3. Inscription d'une Entreprise (client)

☐ **3.1** /inscription → choisir **Une entreprise**.
☐ **3.2** Remplir : nom responsable, nom entreprise, formule (Starter/Medium/Premium + cocher confirmation), téléphone, email, mot de passe (≥ 8).
☐ **3.3** Soumettre → écran « Compte créé avec succès » (en attente de validation).
☐ **3.4** Tenter de se connecter avec ce compte → **écran « Compte en attente »** (pas d'accès au dashboard).
☐ **3.5** Vérifier (Sudo ou Admin) : une **notification** « Nouveau compte à valider » est reçue.

## 4. Inscription d'un Technicien

☐ **4.1** /inscription → **Un technicien** → nom, téléphone, email, mot de passe → soumettre.
☐ **4.2** Écran succès → connexion → écran « Compte en attente ».

---

## 5. Validation des comptes (par l'Admin)

☐ **5.1** Connexion Admin → **/admin/utilisateurs** → onglet **En attente**.
☐ **5.2** Voir l'entreprise + le technicien créés aux étapes 3 et 4.
☐ **5.3** Valider l'entreprise (✓). Elle passe en **Actif**.
☐ **5.4** Valider le technicien (✓).
☐ **5.5** Bonus Realtime : garder la session **entreprise** ouverte sur « Compte en attente » → après validation, redirection auto vers **/entreprise/dashboard** (≤ 2 s).

---

## 6. Affectation Technicien → Entreprise (par l'Admin)

☐ **6.1** /admin/utilisateurs → onglet **Techniciens** → bouton *Affecter* sur le technicien.
☐ **6.2** Choisir l'entreprise → **Affecter**.
☐ **6.3** Le technicien affiche « 1 entreprise ».

---

## 7. Contrat / Abonnement (par l'Admin)

☐ **7.1** /admin/contrats → *Nouveau contrat* → choisir l'entreprise + un abonnement + date de début → **Créer**.
☐ **7.2** Le contrat apparaît avec plan, quotas (équip./tech.), dates, statut **Actif**.
☐ **7.3** Tester *Désactiver / Réactiver le contrat*.

---

## 8. Parc d'équipements (côté Entreprise)

☐ **8.1** Connexion **Entreprise** → /entreprise/dashboard → vérifier en-tête, KPIs, **code de validation** affiché (le copier, il servira à l'étape 11).
☐ **8.2** /entreprise/parc → *Ajouter* → remplir un équipement → enregistrer.
   - Note : l'équipement est créé en statut **En validation** (maintenance).
☐ **8.3** *Import CSV* → uploader un fichier (ex. `nom;modele;numero_serie;localisation`) → l'IA extrait → sélectionner → **Importer**.
☐ **8.4** Les équipements importés apparaissent avec le badge **En validation** + bandeau d'info.
☐ **8.5** Filtres « Tous / Opérationnels / En validation / En panne » fonctionnels.

## 9. Validation des équipements (par l'Admin)

☐ **9.1** /admin/equipements → retrouver les équipements de l'entreprise (statut maintenance).
☐ **9.2** Éditer un équipement → changer **état** en **Opérationnel** → enregistrer.
☐ **9.3** Vérifier côté Entreprise que l'équipement passe en **Opérationnel**.
☐ **9.4** Ouvrir le **passeport** d'un équipement (QR) → infos + QR code affichés.

---

## 10. Cycle d'intervention

### 10a. Création (Admin)
☐ **10.1** /admin/interventions → *Nouvelle intervention* → choisir entreprise, équipement(s) en panne, titre, description, urgence, technicien(s) → **Créer**.
☐ **10.2** L'intervention apparaît en **Planifiée**.
☐ **10.3** Le technicien reçoit une **notification**.

### 10b. Traitement (Technicien)
☐ **10.4** Connexion **Technicien** → /technicien/dashboard → voir la mission + alerte si critique.
☐ **10.5** /technicien/interventions → ouvrir l'intervention → **Démarrer** (passe **En cours**).
☐ **10.6** Remplir le rapport (compte-rendu, pièces remplacées) → **Terminer** (passe **En attente de signature**).
☐ **10.7** Tester le **scanner QR** (/technicien/scanner) → ouvre le passeport équipement.

### 10c. Signature (Entreprise)
☐ **10.8** Connexion **Entreprise** → alerte « intervention à signer » sur le dashboard.
☐ **10.9** Ouvrir l'intervention → saisir le **code de validation** (étape 8.1) → **signer** (canvas).
☐ **10.10** Statut passe **Clôturée (signée)** → **PDF** généré/téléchargeable.

---

## 11. Messagerie

☐ **11.1** Entreprise → /entreprise/messagerie → écrire à l'**Admin** → envoyer.
☐ **11.2** Admin → /admin/messagerie → le message arrive (**Realtime**, sans refresh) → répondre.
☐ **11.3** Tester une **réponse à un message** (reply) et l'affichage de l'aperçu cité.
☐ **11.4** Technicien ↔ Admin : même test.

---

## 12. Notifications

☐ **12.1** Cloche (header) → badge de compteur sur nouveaux évènements.
☐ **12.2** Ouvrir → marquer comme lu → le compteur diminue.
☐ **12.3** Cliquer une notif avec lien → navigue vers la bonne page.

---

## 13. Profil & sécurité

☐ **13.1** Chaque rôle : /…/profil → modifier prénom/nom/téléphone → enregistrer → persiste après refresh.
☐ **13.2** Entreprise : régénérer le **code de signature** → l'ancien code ne marche plus pour signer.
☐ **13.3** Déconnexion depuis chaque espace → retour à /connexion (ou /sudo pour le super admin).
☐ **13.4** **Sécurité RLS** : un client ne voit QUE ses équipements/interventions ; un technicien QUE ses entreprises affectées.

---

## 14. Responsive & robustesse (DeepSeek)

☐ **14.1** Mobile (375 px) : Admin & Sudo → **menu hamburger** ouvre/ferme le drawer ; la navigation referme le drawer.
☐ **14.2** Mobile : Technicien & Entreprise → barre de navigation basse, contenu lisible, pas de débordement horizontal.
☐ **14.3** Tablette / desktop : sidebar fixe, tableaux scrollables horizontalement si étroits.
☐ **14.4** Aucune erreur → page d'erreur conviviale « Le réseau fait une pause » (pas l'écran blanc brut).
☐ **14.5** Aucun dégradé « IA » : boutons/avatars en couleur unie.
☐ **14.6** Page publique **/accueil** : hero, fonctionnalités, étapes, tarifs, CTA, footer — responsive.

---

## 15. Suppression (nettoyage)

☐ **15.1** Admin → /admin/utilisateurs → supprimer un utilisateur de test → disparaît (edge function `delete-user`).
☐ **15.2** Vérifier qu'un admin ne peut PAS supprimer un super_admin (bouton absent / refus serveur).
☐ **15.3** Super admin → suppression d'un admin de test OK.

---

## Ordre conseillé pour une démo de soutenance
1 (bootstrap) → 2 (admin) → 3+4 (inscriptions) → 5 (validation) → 6 (affectation) →
7 (contrat) → 8+9 (équipements) → 10 (intervention complète) → 11 (messagerie) →
12 (notifs) → 13 (profil) → 14 (responsive) → 15 (suppression).

Comptes de démo suggérés :
- `super@itaccess.com` (super_admin)
- `admin@itaccess.com` (admin)
- `entreprise@test.com` (client)
- `tech@test.com` (technicien)
