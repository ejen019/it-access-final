# Note de reprise — IT-Access (pour Claude)

> Doc de passation entre sessions. Lis-moi en premier dans une nouvelle session.

## Contexte projet
- **Repo** : `J:\GOAT\it-access-final` · branche de travail : **`developp`** (toujours commit + push dessus)
- **Stack** : React 19 + Vite 8 + TS + Tailwind v4 (`@tailwindcss/vite`, tokens dans `src/styles/globals.css` via `@theme inline` + `.dark`) · Supabase (Auth/PG/RLS/Realtime/Storage/Edge) · TanStack Query v5 · Zustand v5 · React Router v7
- **Supabase project id** : `lpsjnyrpltkrxsfwldbe` (nom `it-access-final`). MCP Supabase dispo (apply_migration, deploy_edge_function, get_logs…).
- **Schéma FR** : `utilisateurs, clients, techniciens, equipements, contrats, abonnements, affectations, interventions, interventions_equipements, interventions_techniciens, rapports_intervention, messages, notifications, journaux_audit, parametres_application`. Schéma complet dans `supabase/schema.sql`.
- **Rôles** : `super_admin | admin | technicien | client`. Routes : `/sudo/*`, `/admin/*`, `/technicien/*`, `/entreprise/*` (client).
- **Conventions user** : réponses denses en français ; PAS de `Co-Authored-By` dans les commits ; pas de signes "IA" (zéro dégradé).
- **Build OK** = `npx vite build` + `npx tsc --noEmit` sans erreur. Toujours vérifier avant commit.
- Le user a son propre `npm run dev` sur :5173 → le preview MCP ne peut pas binder, ne pas se battre avec ; il a le hot-reload.

## Déjà fait (sessions précédentes)
- Migration complète vers schéma FR (toutes les pages).
- Fix Tailwind v4 (plugin vite + globals.css `@import "tailwindcss"`).
- Fix routing rôles (`sudo`→`super_admin`, `entreprise`→`client`), RootRedirect, layouts.
- `RouteError` (errorElement sur toutes les routes) → plus d'écran blanc.
- **RLS récursion interventions↔interventions_techniciens corrigée** (migration `fix_rls_recursion_interventions` APPLIQUÉE) via fonctions SECURITY DEFINER `mes_clients()`, `mon_technicien_id()`, `mes_interventions_tech()`, `mes_interventions_client()`.
- Audit : table `journaux_audit` (colonnes FR) dans `lib/audit.ts` + `AuditLogsPage`.
- **Edge functions DÉPLOYÉES** sur Supabase : `register-user` (v5), `create-admin` (v2), `delete-user` (v2).
  - `register-user` : `signUp()` (envoie email confirmation), prénom optionnel, code signature **alphanumérique maj+min+chiffres (8)**, **contrat auto créé** selon `selected_plan` (abonnement récupéré, +1 an), notif admins `type: 'nouveau_compte_en_attente'`.
- Équipements : bouton **Modifier** + **Valider (1 clic)** côté admin ; champ État réservé admin (client crée en `maintenance`).
- Admin/super_admin peut faire les actions technicien sur `InterventionDetailPage` (`canIntervene`).
- Intervention : choix **Réparation / Périodique** (`type_planification`).
- **DeepSeek** : dark par défaut (`ui.store` theme `'dark'`), palette DeepSeek dans `globals.css`, TOUS les dégradés aplatis.
- Layouts Admin/Sudo responsives (drawer mobile + hamburger). Toggle thème = **dans la page Paramètres (ProfilePage → section Apparence)**, retiré des headers.
- Doc `PLAN_DE_TEST.md` à la racine (parcours bout-en-bout).

## EN COURS (à finir en priorité) — demande user de cette session
Le user veut (message courant) :
1. ✅ Toggle thème dans les Paramètres (fait : retiré des headers, ProfilePage a déjà la section Apparence).
2. ✅ Icônes Paramètres harmonisées (containers `bg-primary/10 text-primary`).
3. ✅ Landing : badge "Plateforme SaaS…" supprimé + `pt-20`→`pt-10`.
4. ✅ **Admin peut scanner les QR** — FAIT :
   - `ScanPage` utilise `passportPath(profile?.role, id)` partout (caméra + saisie manuelle) → redirige vers le bon espace selon rôle.
   - Route `/admin/scanner` ajoutée dans `router.tsx`, entrée nav "Scanner" (icône `QrCode`) dans `AdminLayout`.
5. ✅ **Graphes SVG maison sur les dashboards** — FAIT :
   - Composants `src/components/shared/DonutChart.tsx` (anneau + légende %) et `BarChart.tsx` (barres verticales), zéro dépendance, couleurs explicites (#10b981 ok / #f59e0b maint / #ef4444 panne / #3b82f6 planif / #a855f7 à signer).
   - Branchés avec vraies données sur les 4 dashboards (Admin & Sudo : nouvelles requêtes count par état/statut ; Technicien & Entreprise : dérivés des arrays déjà fetchés). `SimpleBarChart.tsx` supprimé (mort).
6. ⏳ **Revoir l'affichage de certains menus et pages** + **la navbar horizontale haute cache certaines infos** — PAS COMMENCÉ.
   - Investiguer : header `h-14` sticky/flex dans les layouts ; vérifier qu'aucun contenu n'est masqué (top clippé) ni derrière la bottom-nav mobile (`pb-20`). Vérifier MessagingPage (hauteur `calc`). Vérifier pages de listes.
7. ⏳ (rappel session précédente, encore valable) **Refonte fine des pages de listes** façon DeepSeek (tableaux, espacements, états vides) — les pages de listes étaient jugées "vilaines". Pages : `UsersPage`, `SudoUsersPage`, `EquipmentAdminPage`, `SudoEquipmentPage`, `InterventionsAdminPage`, `SudoInterventionsPage`, `ContractsPage`.

## Prérequis test (à rappeler au user si besoin)
- Bucket Storage `it-access-fichiers` (public), Realtime sur `messages,notifications,interventions,utilisateurs`, table `abonnements` seedée (starter/medium/premium), super_admin bootstrapé manuellement (cf. PLAN_DE_TEST.md §1).

## Première action recommandée à la reprise
Points 4 et 5 livrés (build + tsc OK, commit sur `developp`). Enchaîner sur le **point 6** (navbar horizontale `h-14` qui cacherait des infos + revue affichage menus/pages) puis le **point 7** (refonte fine des pages de listes façon DeepSeek).
