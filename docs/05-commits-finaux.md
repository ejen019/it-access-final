# 05 - Commits finaux

## Principe
- Un commit = une tranche logique clairement testable.
- Ne pas melanger un gros module metier avec une correction cosmetique sans raison.
- Chaque commit ci-dessous doit avoir un message court, explicite et stable.

## Plan de commits recommande

| Ordre | Message de commit | Fichiers concernes |
|---|---|---|
| 1 | `docs: add reproduction roadmap and branch split` | `docs/00-READ_ME_FIRST.md`, `docs/01-decoupage-par-branches.md` |
| 2 | `docs: add frontend file-by-file workload` | `docs/02-frontend-binome-par-binome.md` |
| 3 | `docs: add backend recreation matrix` | `docs/03-backend-binome-par-binome.md` |
| 4 | `docs: add validation checklist and commit plan` | `docs/04-checklist-validation-par-etape.md`, `docs/05-commits-finaux.md` |

## Si vous reproduisez aussi l application ensuite

### Commit 1
- Message: `chore: scaffold app shell and shared providers`
- Fichiers typiques:
  - `src/main.tsx`
  - `src/app/providers.tsx`
  - `src/app/router.tsx`
  - `src/stores/auth.store.ts`
  - `src/stores/ui.store.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/database.types.ts`
  - `src/styles/globals.css`

### Commit 2
- Message: `feat: add auth flows and access guards`
- Fichiers typiques:
  - `src/components/shared/ProtectedRoute.tsx`
  - `src/components/shared/RootRedirect.tsx`
  - `src/components/shared/LoadingScreen.tsx`
  - `src/components/shared/NotFoundPage.tsx`
  - `src/features/auth/pages/LoginPage.tsx`
  - `src/features/auth/pages/RegisterPage.tsx`
  - `src/features/auth/pages/ForgotPasswordPage.tsx`
  - `src/features/auth/pages/ResetPasswordPage.tsx`
  - `src/features/auth/pages/SudoLoginPage.tsx`

### Commit 3
- Message: `feat: add layouts, navigation, and shared chrome`
- Fichiers typiques:
  - `src/components/layout/AdminLayout.tsx`
  - `src/components/layout/SudoLayout.tsx`
  - `src/components/layout/TechnicienLayout.tsx`
  - `src/components/layout/EntrepriseLayout.tsx`
  - `src/components/shared/NotificationBell.tsx`
  - `src/components/shared/NetworkBanner.tsx`
  - `src/components/shared/SimpleBarChart.tsx`

### Commit 4
- Message: `feat: add role dashboards and profile management`
- Fichiers typiques:
  - `src/features/dashboard/pages/AdminDashboardPage.tsx`
  - `src/features/dashboard/pages/SudoDashboardPage.tsx`
  - `src/features/dashboard/pages/TechnicienDashboardPage.tsx`
  - `src/features/dashboard/pages/EntrepriseDashboardPage.tsx`
  - `src/features/users/pages/ProfilePage.tsx`

### Commit 5
- Message: `feat: add user management and audit views`
- Fichiers typiques:
  - `src/features/users/pages/UsersPage.tsx`
  - `src/features/sudo/pages/SudoUsersPage.tsx`
  - `src/features/audit/pages/AuditLogsPage.tsx`
  - `src/lib/audit.ts`

### Commit 6
- Message: `feat: add equipment module and qr passport`
- Fichiers typiques:
  - `src/features/equipment/hooks/useEquipment.ts`
  - `src/features/equipment/components/EquipmentForm.tsx`
  - `src/features/equipment/components/BulkImportModal.tsx`
  - `src/features/equipment/pages/EquipmentAdminPage.tsx`
  - `src/features/equipment/pages/ParcPage.tsx`
  - `src/features/equipment/pages/EquipmentPassportPage.tsx`
  - `src/features/equipment/pages/ScanPage.tsx`
  - `src/features/sudo/pages/SudoEquipmentPage.tsx`
  - `src/lib/utils/qrcode.ts`

### Commit 7
- Message: `feat: add intervention workflow end to end`
- Fichiers typiques:
  - `src/features/interventions/hooks/useInterventions.ts`
  - `src/features/interventions/pages/InterventionsAdminPage.tsx`
  - `src/features/interventions/pages/InterventionsEntreprisePage.tsx`
  - `src/features/interventions/pages/InterventionsTechPage.tsx`
  - `src/features/interventions/pages/InterventionDetailPage.tsx`
  - `src/features/sudo/pages/SudoInterventionsPage.tsx`

### Commit 8
- Message: `feat: add messaging, contracts, and public landing`
- Fichiers typiques:
  - `src/features/messaging/pages/MessagingPage.tsx`
  - `src/features/contracts/pages/ContractsPage.tsx`
  - `src/features/public/pages/PublicLandingPage.tsx`
  - `src/lib/publicConfig.ts`

### Commit 9
- Message: `feat: finalize backend schema, rls, and storage`
- Fichiers typiques:
  - `supabase/schema.sql`
  - Edge Functions `register-user`, `create-admin`, `delete-user`
  - policies, triggers, indexes, bucket `it-access-file`

## Règle pratique
- Si un commit ne peut pas etre explique en une phrase simple, il est probablement trop gros.
- Garder les docs dans un commit separe de la recreation du code.
