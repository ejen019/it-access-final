# 01 — Découpage par branches

## Convention
- Base: `main`
- Branches: `feature/...`
- Travail simultané A/B sur la **même branche module** avec commits séparés et pull fréquent.

## Branches à créer

### 1) `feature/foundation-app-shell`
- Fichiers:
  - `src/main.tsx`
  - `src/app/providers.tsx`
  - `src/app/router.tsx`
  - `src/styles/globals.css`
  - `src/stores/auth.store.ts`
  - `src/stores/ui.store.ts`
  - `src/types/index.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/database.types.ts`
- Binôme A:
  - bootstrap React/Vite, providers, stores auth/ui
  - routing de base + routes publiques
- Binôme B:
  - thème global CSS + types métier de base
  - client Supabase typé + vérification env

### 2) `feature/auth-and-route-guards`
- Fichiers:
  - `src/features/auth/pages/*`
  - `src/components/shared/ProtectedRoute.tsx`
  - `src/components/shared/RootRedirect.tsx`
  - `src/components/shared/LoadingScreen.tsx`
  - `src/components/shared/NotFoundPage.tsx`
- Binôme A:
  - login, sudo login, register
- Binôme B:
  - forgot/reset password + guards/redirect

### 3) `feature/layouts-and-navigation`
- Fichiers:
  - `src/components/layout/*`
  - `src/components/shared/NotificationBell.tsx`
  - `src/components/shared/NetworkBanner.tsx`
- Binôme A:
  - layouts Admin/Sudo
- Binôme B:
  - layouts Technicien/Entreprise + notification + réseau

### 4) `feature/users-companies-technicians`
- Fichiers:
  - `src/features/users/pages/UsersPage.tsx`
  - `src/features/users/pages/ProfilePage.tsx`
  - `src/features/sudo/pages/SudoUsersPage.tsx`
- Backend concerné:
  - `profiles`, `companies`, `technicians`, `assignments`, `notifications`
- Binôme A:
  - CRUD état utilisateur (validation/activation)
- Binôme B:
  - affectation techniciens ↔ entreprises + profil utilisateur

### 5) `feature/dashboard-role-based`
- Fichiers:
  - `src/features/dashboard/pages/*`
  - `src/components/shared/SimpleBarChart.tsx`
- Binôme A:
  - dashboards Admin + Sudo
- Binôme B:
  - dashboards Technicien + Entreprise + graphiques

### 6) `feature/equipment-module`
- Fichiers:
  - `src/features/equipment/components/*`
  - `src/features/equipment/hooks/useEquipment.ts`
  - `src/features/equipment/pages/EquipmentAdminPage.tsx`
  - `src/features/equipment/pages/ParcPage.tsx`
  - `src/features/equipment/pages/EquipmentPassportPage.tsx`
  - `src/features/equipment/pages/ScanPage.tsx`
  - `src/lib/utils/qrcode.ts`
- Backend concerné:
  - `equipment`, `equipment_documents`, storage bucket
- Binôme A:
  - pages admin/entreprise + form
- Binôme B:
  - hook data, import bulk, scan/passeport, QR, upload fichiers

### 7) `feature/interventions-workflow`
- Fichiers:
  - `src/features/interventions/hooks/useInterventions.ts`
  - `src/features/interventions/pages/*`
- Backend concerné:
  - `interventions`, `intervention_reopens`, `notifications`, storage, audit
- Binôme A:
  - vue admin/entreprise + filtres + transitions de statut
- Binôme B:
  - vue technicien + détail, rapport, photo, signature, PDF

### 8) `feature/messaging-audit-contracts-public`
- Fichiers:
  - `src/features/messaging/pages/MessagingPage.tsx`
  - `src/features/audit/pages/AuditLogsPage.tsx`
  - `src/features/contracts/pages/ContractsPage.tsx`
  - `src/features/public/pages/PublicLandingPage.tsx`
  - `src/lib/publicConfig.ts`
  - `src/lib/audit.ts`
- Backend concerné:
  - `messages`, `message_attachments`, `audit_logs`, `contracts`, `app_settings`
- Binôme A:
  - contrats + audit + helper audit
- Binôme B:
  - messagerie + landing publique + config publique

## Règle “qui modifie quoi”
- Toujours annoncer dans la PR les fichiers touchés.
- Éviter d’éditer le même fichier en parallèle si non nécessaire.
- Si conflit: priorité à celui qui implémente le flux métier principal, l’autre rebase et adapte.
